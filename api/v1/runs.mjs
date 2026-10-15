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
import { sessionFromRequest } from '../../server/auth.mjs'
import { MIN_RUN_CREDITS, balance } from '../../server/credits.mjs'
import { kickWorker, workerOrigin } from '../../server/worker.mjs'
import { reapStaleJobs } from '../../server/reaper.mjs'

/** Queued runs need a durable store: Vercel Blob on Vercel, fs elsewhere. */
const queueAvailable = () => jobStoreKind() === 'blob' || !process.env.VERCEL

/**
 * Conversation condensation for follow-ups: inherited dialogues easily exceed
 * free-tier TPM windows (groq 413 at ~8k tokens). Old tool payloads carry the
 * bulk — truncate them and cap the window; the workspace files (not the log)
 * are the source of truth for the artifact state.
 */
function compressTurns(turns) {
  if (!Array.isArray(turns) || !turns.length) return null
  const kept = turns.slice(-28)
  const cutAt = Math.max(0, kept.length - 8)
  return kept.map((m, i) => {
    if (i < cutAt && m.role === 'tool') {
      return { ...m, results: (m.results ?? []).map((r) => ({ ...r, text: String(r.text ?? '').slice(0, 240) + ' …' })) }
    }
    if (i < cutAt && m.role === 'assistant' && typeof m.content === 'string' && m.content.length > 400) {
      return { ...m, content: m.content.slice(0, 400) + ' …' }
    }
    return m
  })
}

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
    const ownerIdEarly = sessionFromRequest(req)
    if (ownerIdEarly) {
      const bal = await balance(ownerIdEarly).catch(() => null)
      if (bal !== null && bal < MIN_RUN_CREDITS) {
        res.status(402).json({ error: 'insufficient credits', balance: bal, min: MIN_RUN_CREDITS })
        return
      }
    }
    let lineageRoot = null
    let seedFiles = null
    let seedTurns = null
    let seedBinaries = null
    if (payload.parentJobId) {
      const parent = await getJob(String(payload.parentJobId))
      const owner = sessionFromRequest(req)
      if (parent && (!parent.ownerId || parent.ownerId === owner)) {
        lineageRoot = parent.lineageRoot || parent.id
        seedTurns = compressTurns(parent.checkpoint?.turns)
        seedBinaries = parent.checkpoint?.binaries ?? null
        seedFiles = {}
        for (const e of parent.events || []) {
          if (e.type === 'file' && e.file?.path && typeof e.file.content === 'string') seedFiles[e.file.path] = e.file.content
        }
        const parentArt = (parent.events || []).filter((x) => x.type === 'artifact').pop()
        if (parentArt?.artifact?.html) seedFiles['index.html'] = parentArt.artifact.html
        const total = Object.values(seedFiles).reduce((a, c) => a + c.length, 0)
        if (total > 400_000) seedFiles = Object.fromEntries(Object.entries(seedFiles).slice(0, 8))
      }
    }
    const job = await createJob({
      prompt: payload.prompt ?? '',
      locale: payload.locale,
      kickToken: randomBytes(16).toString('hex'),
      ownerId: sessionFromRequest(req) || undefined,
      lineageRoot,
      seedFiles,
      seedTurns,
      seedBinaries,
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
      streamUrl: '/api/v1/job?id=' + job.id + '&stream=1',
      cancelUrl: '/api/v1/job?id=' + job.id,
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
