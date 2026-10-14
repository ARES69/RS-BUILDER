/**
 * Vercel serverless function: POST /api/v1/runs
 * Streams the agent run as Server-Sent Events. The engine is selected at
 * runtime: LLM orchestrator when a provider key is configured, otherwise the
 * deterministic core (server/engine.mjs).
 *
 * The web app talks to it same-origin when built with VITE_AGENT_API_URL=/api
 * (client appends /v1/runs), so no CORS configuration is required in production.
 */
import { randomBytes } from 'node:crypto'
import { runEvents } from '../../server/engine.mjs'
import { parseRuntimeKeys } from '../../server/orchestrator.mjs'
import { createJob, getJob, jobStoreKind } from '../../server/jobstore.mjs'
import { kickWorker, workerOrigin } from '../../server/worker.mjs'
import { reapStaleJobs } from '../../server/reaper.mjs'

/** Queued runs need a durable store: Vercel Blob on Vercel, fs elsewhere. */
const queueAvailable = () => jobStoreKind() === 'blob' || !process.env.VERCEL

export const config = {
  runtime: 'nodejs',
  maxDuration: 300, // long runs stream for minutes, not seconds
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type, x-rsb-keys')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed, use POST' })
    return
  }

  let body = ''
  if (typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) body += chunk
  } else {
    // older/custom request objects (some local harnesses): event-based fallback
    body = await new Promise((resolve) => {
      let acc = ''
      req.on('data', (c) => (acc += c))
      req.on('end', () => resolve(acc))
      req.on('error', () => resolve(acc))
    })
  }
  let payload = {}
  try { payload = JSON.parse(body || '{}') } catch { /* defaults */ }

  /* --- queued mode: create a job, kick a worker, return immediately --- */
  if (payload.mode === 'queue') {
    if (!queueAvailable()) {
      res.status(503).json({ error: 'queue unavailable: no durable job store configured' })
      return
    }
    reapStaleJobs().catch(() => null)
    const job = await createJob({
      prompt: payload.prompt ?? '',
      locale: payload.locale,
      kickToken: randomBytes(16).toString('hex'),
    })
    kickWorker(workerOrigin(), job)
    // The kick fetch must be dispatched while this invocation is still alive:
    // wait for the worker's first heartbeat (or give up after 8s and let the
    // stream/reaper kick later).
    for (let i = 0; i < 16; i++) {
      const fresh = await getJob(job.id)
      if (fresh && (fresh.status !== 'queued' || (fresh.attempts || 0) > 0)) break
      await new Promise((r) => setTimeout(r, 500))
    }
    res.status(202).json({
      jobId: job.id,
      status: job.status,
      statusUrl: '/api/v1/job?id=' + job.id,
      streamUrl: '/api/v1/jobstream?id=' + job.id,
      cancelUrl: '/api/v1/jobcancel?id=' + job.id,
    })
    return
  }

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  res.write(': rs-builder agent stream\n\n')

  // Client disconnects surface on the RESPONSE socket in serverless bridges
  // (the request stream closes as soon as its body is consumed, so listening
  // on req here would cancel every run instantly).
  const abort = new AbortController()
  res.on('close', () => {
    if (!res.writableEnded) abort.abort()
  })
  res.on('error', () => abort.abort())

  try {
    const runtime = parseRuntimeKeys(req.headers['x-rsb-keys'])
    for await (const event of runEvents(payload.prompt, payload.locale, abort.signal, runtime)) {
      if (abort.signal.aborted) break
      res.write('data: ' + JSON.stringify(event) + '\n\n')
    }
  } catch (error) {
    res.write('data: ' + JSON.stringify({ type: 'error', message: String(error?.message ?? error) }) + '\n\n')
  }
  res.end()
}
