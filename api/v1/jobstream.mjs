/**
 * GET /api/v1/jobstream?id=…&cursor=N — re-attachable SSE tail of a queued job.
 * Ends politely at a terminal status or its own deadline; the client reconnects
 * with the last cursor, so blips and tab closes do not lose events.
 */
import { getJob } from '../../server/jobstore.mjs'

export const config = { runtime: 'nodejs', maxDuration: 300 }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed, use GET' })
    return
  }
  const id = String(req.query?.id ?? '')
  let cursor = Number(req.query?.cursor ?? 0) || 0

  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  res.write(': rs-builder job stream\n\n')

  const deadline = Date.now() + 240_000
  while (Date.now() < deadline) {
    const job = await getJob(id)
    if (!job) {
      res.write('data: ' + JSON.stringify({ type: 'error', message: 'job not found' }) + '\n\n')
      break
    }
    while (cursor < job.events.length) {
      res.write('data: ' + JSON.stringify(job.events[cursor]) + '\n\n')
      cursor += 1
    }
    if (job.status === 'done' || job.status === 'failed' || job.status === 'cancelled') {
      res.write('data: ' + JSON.stringify({ type: 'job_end', status: job.status, error: job.error }) + '\n\n')
      break
    }
    await sleep(600)
  }
  res.end()
}
