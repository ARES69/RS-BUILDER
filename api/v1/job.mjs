/**
 * One function, three verbs over a queued job:
 *   GET  /api/v1/job?id=…            → snapshot (status + full event log)
 *   GET  /api/v1/job?id=…&stream=1   → re-attachable SSE tail (?cursor=N)
 *   POST /api/v1/job?id=…            → cancel
 */
import { appendJobEvents, getJob } from '../../server/jobstore.mjs'
import { kickWorker, workerOrigin } from '../../server/worker.mjs'

export const config = { runtime: 'nodejs', maxDuration: 300 }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const id = String(req.query?.id ?? '')

  if (req.method === 'POST') {
    const job = await getJob(id)
    if (!job) return res.status(404).json({ error: 'job not found' })
    if (job.status === 'queued' || job.status === 'running') {
      await appendJobEvents(id, [], { status: 'cancelled' })
    }
    const fresh = await getJob(id)
    const { kickToken, ...rest } = fresh
    return res.status(200).json(rest)
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'use GET or POST' })

  if (req.query?.stream !== '1') {
    const job = await getJob(id)
    if (!job) return res.status(404).json({ error: 'job not found' })
    const { kickToken, ...rest } = job
    return res.status(200).json(rest)
  }

  let cursor = Number(req.query?.cursor ?? 0) || 0
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no')
  res.flushHeaders?.()
  res.write(': rs-builder job stream\n\n')

  const deadline = Date.now() + 240_000
  let lastKick = 0
  while (Date.now() < deadline) {
    const job = await getJob(id)
    if (job && job.status === 'queued' && (job.attempts || 0) === 0 && Date.now() - job.updatedAt > 5000 && Date.now() - lastKick > 15000) {
      lastKick = Date.now()
      await kickWorker(workerOrigin(), job)
    }
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
    await sleep(1500)
  }
  res.end()
}
