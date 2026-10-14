/**
 * GET/POST /api/v1/reap — the stuck-job reaper (Vercel Cron, every 10 min).
 * Re-kicks jobs whose worker died (no heartbeat) or that never started,
 * within the attempt budget; beyond it, marks them failed with a reason.
 */
import { appendJobEvents, listJobs } from '../../server/jobstore.mjs'
import { kickWorker, workerOrigin } from '../../server/worker.mjs'

export const config = { runtime: 'nodejs', maxDuration: 60 }

const MAX_ATTEMPTS = 2
const STALE_QUEUED_MS = 2 * 60_000
const STALE_RUNNING_MS = 3 * 60_000

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.authorization ?? ''
  const manual = new URL(req.url ?? '/', 'http://localhost').searchParams.get('manual')
  if (secret && auth !== 'Bearer ' + secret && manual !== secret) {
    res.status(401).json({ error: 'unauthorized: provide CRON_SECRET' })
    return
  }

  const now = Date.now()
  const jobs = await listJobs()
  const reaped = []
  for (const job of jobs) {
    if (job.status === 'queued' && now - job.updatedAt > STALE_QUEUED_MS) {
      if ((job.attempts || 0) < MAX_ATTEMPTS) {
        await kickWorker(workerOrigin(), job)
        reaped.push({ id: job.id, action: 're-kicked' })
      } else {
        await appendJobEvents(job.id, [], { status: 'failed', error: 'never started (attempts exhausted)' })
        reaped.push({ id: job.id, action: 'failed' })
      }
    } else if (job.status === 'running' && now - (job.heartbeatAt || 0) > STALE_RUNNING_MS) {
      if ((job.attempts || 0) < MAX_ATTEMPTS) {
        await appendJobEvents(job.id, [], { status: 'queued' })
        await kickWorker(workerOrigin(), job)
        reaped.push({ id: job.id, action: 're-kicked' })
      } else {
        await appendJobEvents(job.id, [], { status: 'failed', error: 'worker died (heartbeat lost)' })
        reaped.push({ id: job.id, action: 'failed' })
      }
    }
  }
  res.status(200).json({ ok: true, scanned: jobs.length, reaped })
}
