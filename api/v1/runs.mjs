/**
 * Vercel serverless function: POST /api/v1/runs
 * Streams the agent run as Server-Sent Events. The engine is selected at
 * runtime: LLM orchestrator when a provider key is configured, otherwise the
 * deterministic core (server/engine.mjs).
 *
 * The web app talks to it same-origin when built with VITE_AGENT_API_URL=/api
 * (client appends /v1/runs), so no CORS configuration is required in production.
 */
import { runEvents } from '../../server/engine.mjs'

export const config = {
  runtime: 'nodejs',
  maxDuration: 300, // long runs stream for minutes, not seconds
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'content-type')

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
    for await (const event of runEvents(payload.prompt, payload.locale, abort.signal)) {
      if (abort.signal.aborted) break
      res.write('data: ' + JSON.stringify(event) + '\n\n')
    }
  } catch (error) {
    res.write('data: ' + JSON.stringify({ type: 'error', message: String(error?.message ?? error) }) + '\n\n')
  }
  res.end()
}
