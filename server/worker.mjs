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
import { getJob, putJob } from './jobstore.mjs'
import { appendRunHistory } from './history.mjs'
import { publishArtifact } from './artifacts.mjs'
import { debitRun } from './credits.mjs'
import { runEvents } from './engine.mjs'

const BATCH_MS = 2000 // write budget: hobby Blob limits suspend chatty stores
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
  await Promise.race([p, new Promise((r) => setTimeout(r, 2500))])
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

  // Single-writer rule: the worker owns the document and always PUTs the whole
  // job (read-modify-write from multiple invocations lost event batches).
  const flush = async (patch) => {
    job.events.push(...buffer.splice(0, buffer.length))
    job.cursor = job.events.length
    job.heartbeatAt = Date.now()
    Object.assign(job, patch)
    await putJob(job)
  }

  let lastBatch = Date.now()
  let chained = false
  let cancelled = false
  try {
    for await (const event of runEvents(job.prompt, job.locale, controller.signal, {
      seedFiles: job.seedFiles,
      seedTurns: job.seedTurns,
      seedBinaries: job.seedBinaries,
      checkpoint: job.checkpoint,
      onCheckpoint: (cpState) => {
        job.checkpoint = cpState
      },
    })) {
      const fresh = await getJob(jobId)
      if (!fresh || fresh.status === 'cancelled') {
        cancelled = true
        controller.abort()
        break
      }
      buffer.push(event)
      const now = Date.now()
      const boundary = ['plan', 'step_done', 'artifact', 'done'].includes(event.type)
      if (boundary || now - lastBatch > BATCH_MS) {
        await flush()
        lastBatch = now
      }
      if (now > deadline - KICK_BEFORE_MS && !chained) {
        // hand the remainder to a fresh invocation; this one stops consuming
        chained = true
        await flush({ status: 'queued' })
        await kickWorker(workerOrigin(), { id: jobId, kickToken: job.kickToken })
        return { ok: true, reason: 'chained' }
      }
    }
    // publish the artifact (permanent urls + version manifest) before the
    // terminal flush so the job_end snapshot already carries artifactMeta
    const artEvent = [...job.events, ...buffer].filter((e) => e.type === 'artifact').pop()
    if (artEvent?.artifact && !chained) {
      try {
        job.artifactMeta = await publishArtifact(job, artEvent.artifact)
      } catch {
        /* hosting is best-effort; the run itself still succeeds */
      }
    }
    if (cancelled) {
      await flush({ status: 'cancelled' }).catch(() => {})
      if (job.ownerId) await appendRunHistory(job.ownerId, job).catch(() => {})
      return { ok: true, reason: 'cancelled' }
    }
    await flush({ status: 'done' })
    if (job.ownerId) {
      await appendRunHistory(job.ownerId, job).catch(() => {})
      await debitRun(job.ownerId, job).catch(() => {})
    }
    return { ok: true, reason: 'done' }
  } catch (error) {
    await flush({ status: 'failed', error: String(error?.message ?? error) }).catch(() => {})
    if (job.ownerId) await appendRunHistory(job.ownerId, job).catch(() => {})
    return { ok: false, reason: String(error?.message ?? error) }
  }
}
