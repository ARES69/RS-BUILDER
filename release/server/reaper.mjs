/**
 * Stuck-job reaper. Hobby plans only allow daily crons, so besides the daily
 * cron call this also runs opportunistically: every queued-run creation
 * triggers a sweep (throttled to once per 5 minutes per lambda instance).
 * Re-kicks jobs whose worker died or that never started, within the attempt
 * budget; beyond it, marks them failed with a reason.
 */
import { appendJobEvents, listJobs } from './jobstore.mjs'
import { kickWorker, workerOrigin } from './worker.mjs'

const MAX_ATTEMPTS = 2
const STALE_QUEUED_MS = 2 * 60_000
const STALE_RUNNING_MS = 3 * 60_000
const SWEEP_EVERY_MS = 5 * 60_000

let lastSweep = 0

export async function reapStaleJobs({ force = false } = {}) {
  const now = Date.now()
  if (!force && now - lastSweep < SWEEP_EVERY_MS) return { skipped: true, reaped: [] }
  lastSweep = now

  const jobs = await listJobs()
  const reaped = []
  for (const job of jobs) {
    const attempts = job.attempts || 0
    if (job.status === 'queued' && now - job.updatedAt > STALE_QUEUED_MS) {
      if (attempts < MAX_ATTEMPTS) {
        await kickWorker(workerOrigin(), job)
        reaped.push({ id: job.id, action: 're-kicked' })
      } else {
        await appendJobEvents(job.id, [], { status: 'failed', error: 'never started (attempts exhausted)' })
        reaped.push({ id: job.id, action: 'failed' })
      }
    } else if (job.status === 'running' && now - (job.heartbeatAt || 0) > STALE_RUNNING_MS) {
      if (attempts < MAX_ATTEMPTS) {
        await appendJobEvents(job.id, [], { status: 'queued' })
        await kickWorker(workerOrigin(), job)
        reaped.push({ id: job.id, action: 're-kicked' })
      } else {
        await appendJobEvents(job.id, [], { status: 'failed', error: 'worker died (heartbeat lost)' })
        reaped.push({ id: job.id, action: 'failed' })
      }
    }
  }
  return { skipped: false, scanned: jobs.length, reaped }
}
