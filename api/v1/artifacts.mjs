/**
 * GET /api/v1/artifacts            → own runs that produced hosted artifacts
 * GET /api/v1/artifacts?root=…     → version manifest of a lineage (own only)
 */
import { sessionFromRequest } from '../../server/auth.mjs'
import { listRunHistory } from '../../server/history.mjs'
import { getManifest, publicGallery } from '../../server/artifacts.mjs'
import { getJob } from '../../server/jobstore.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'use GET' })
  const uid = sessionFromRequest(req)
  if (!uid) {
    // public gallery of real artifacts: safe excerpt + urls only
    if (req.query?.public === '1') return res.status(200).json({ gallery: await publicGallery() })
    return res.status(401).json({ error: 'not signed in' })
  }

  const root = String(req.query?.root ?? '')
  if (root) {
    const manifest = await getManifest(root)
    if (!manifest) return res.status(404).json({ error: 'manifest not found' })
    // owned if ANY version of the lineage belongs to the session (a lineage
    // may start anonymously and be continued by a signed-in run)
    const jobs = await Promise.all((manifest.versions ?? []).slice(0, 20).map((v) => getJob(v.jobId)))
    if (!jobs.some((j) => j && j.ownerId === uid)) return res.status(404).json({ error: 'manifest not found' })
    return res.status(200).json(manifest)
  }

  const runs = await listRunHistory(uid)
  res.status(200).json({ artifacts: runs.filter((r) => r.artifact).map((r) => ({ ...r.artifact, jobId: r.jobId, prompt: r.prompt, finishedAt: r.finishedAt })) })
}
