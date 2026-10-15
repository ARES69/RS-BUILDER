/**
 * Per-user run history on top of the Blob job store.
 *
 * Job documents already persist forever; history adds a small per-user index
 * (newest first, capped) so the workspace can list "my runs" and replay any of
 * them from the job snapshot. One index document per user = one read per list.
 */
import { getJob } from './jobstore.mjs'

const MAX_ENTRIES = 100

let storeP = null
async function store() {
  if (!storeP) storeP = import('./jobstore.mjs')
  return storeP
}

const indexPath = (userId) => 'rsb-history/' + userId

async function readIndex(userId) {
  const { getJobDoc } = await store()
  return (await getJobDoc(indexPath(userId))) ?? { userId, runs: [] }
}

/** Appends a finished run to the user's history index (best effort). */
export async function appendRunHistory(userId, job) {
  if (!userId || !job?.id) return null
  try {
    const { putJobDoc } = await store()
    const doc = await readIndex(userId)
    doc.runs = [
      {
        jobId: job.id,
        prompt: String(job.prompt ?? '').slice(0, 200),
        locale: job.locale,
        status: job.status,
        createdAt: job.createdAt,
        finishedAt: Date.now(),
        events: (job.events || []).length,
        artifact: job.artifactMeta
          ? { root: job.artifactMeta.root, version: job.artifactMeta.version, pageUrl: job.artifactMeta.pageUrl, versions: job.artifactMeta.versions }
          : null,
      },
      ...doc.runs.filter((r) => r.jobId !== job.id),
    ].slice(0, MAX_ENTRIES)
    doc.updatedAt = Date.now()
    await putJobDoc(indexPath(userId), doc)
    return doc
  } catch {
    return null
  }
}

export async function listRunHistory(userId) {
  if (!userId) return []
  try {
    const doc = await readIndex(userId)
    return doc.runs ?? []
  } catch {
    return []
  }
}

/** Full event log for a history entry (ownership-checked). */
export async function getHistoryRun(userId, jobId) {
  const job = await getJob(jobId)
  if (!job || job.ownerId !== userId) return null
  const { kickToken, ...rest } = job
  return rest
}
