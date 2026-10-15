/**
 * Per-user run history, append-only: one document per finished run
 * (`rsb-history/<userId>/<jobId>`). Blob overwrite reads proved eventually
 * consistent, so nothing here ever overwrites — lists are built with list().
 */
import { getJob, getJobDoc, listDocs, putJobDoc } from './jobstore.mjs'

const MAX_ENTRIES = 100

const entryPath = (userId, jobId) => 'rsb-history/' + userId + '/' + jobId

/** Registers a finished run in the user's history (best effort). */
export async function appendRunHistory(userId, job) {
  if (!userId || !job?.id) return null
  try {
    const entry = {
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
    }
    await putJobDoc(entryPath(userId, job.id), entry)
    return entry
  } catch {
    return null
  }
}

export async function listRunHistory(userId) {
  if (!userId) return []
  try {
    const paths = await listDocs('rsb-history/' + userId + '/')
    const entries = []
    for (const p of paths) {
      const doc = await getJobDoc(p)
      if (doc?.jobId) entries.push(doc)
    }
    entries.sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0))
    return entries.slice(0, MAX_ENTRIES)
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
