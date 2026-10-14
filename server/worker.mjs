/**
 * Queued-run worker: drains the orchestrator into the job document so runs
 * outlive any client connection.
 *
 *  - appends events in small batches (fewer store writes, live tail stays fast)
 *  - heartbeats so the cron reaper can tell dead workers from slow ones
 *  - honours cancel between batches
 *  - re-kicks itself (chained invocation) when the serverless deadline nears,
 *    so the bookkeeping survives even if this invocation is frozen
 */
import { appendJobEvents, getJob, putJob } from './jobstore.mjs'
import { runEvents } from './engine.mjs'

const BATCH_MS = 400
const KICK_BEFORE_MS = 30_000 // hand over before the platform freezes us

export async function kickWorker(origin, job) {
  const url = origin.replace(/\/$/, '') + '/api/v1/worker'
  // Fire-and-forget, but wait until the request is actually dispatched: the
  // worker is a separate invocation, so once the connection is established it
  // survives this function returning. The race caps the wait at 1.5s.
  const p = fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jobId: job.id, kickToken: job.kickToken }),
  }).catch(() => null)
  await Promise.race([p, new Promise((r) => setTimeout(r, 1500))])
  return true
}

export const workerOrigin = () =>
  'https://' + (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'localhost:8787')

export async function processJob(jobId) {
  const job = await getJob(jobId)
  if (!job) return { ok: false, reason: 'no job' }
  if (job.status === 'done' || job.status === 'cancelled') return { ok: true, reason: job.status }
  if (job.status === 'failed' && job.attempts >= 2) return { ok: false, reason: 'attempts exhausted' }

  job.status = 'running'
  job.attempts = (job.attempts || 0) + 1
  job.heartbeatAt = Date.now()
  await putJob(job)

  const controller = new AbortController()
  const deadline = Date.now() + 240_000
  const buffer = []
  let flushed = false

  const flush = async (patch) => {
    flushed = true
    const events = buffer.splice(0, buffer.length)
    await appendJobEvents(jobId, events, { heartbeatAt: Date.now(), ...patch })
  }

  let lastBatch = Date.now()
  let chained = false
  try {
    for await (const event of runEvents(job.prompt, job.locale, controller.signal)) {
      const fresh = await getJob(jobId)
      if (!fresh || fresh.status === 'cancelled') {
        controller.abort()
        break
      }
      buffer.push(event)
      const now = Date.now()
      if (now - lastBatch > BATCH_MS) {
        await flush()
        lastBatch = now
      }
      if (now > deadline - KICK_BEFORE_MS && !chained) {
        // hand the remainder to a fresh invocation; this one stops consuming
        chained = true
        await flush({ status: 'queued', heartbeatAt: Date.now() })
        await kickWorker(workerOrigin(), { id: jobId, kickToken: job.kickToken })
        return { ok: true, reason: 'chained' }
      }
    }
    const terminal = controller.signal.aborted ? { status: 'cancelled' } : { status: 'done' }
    await flush(terminal)
    return { ok: true, reason: terminal.status }
  } catch (error) {
    await flush({ status: 'failed', error: String(error?.message ?? error) }).catch(() => {})
    return { ok: false, reason: String(error?.message ?? error) }
  } finally {
    if (!flushed && buffer.length) await flush({}).catch(() => {})
  }
}
