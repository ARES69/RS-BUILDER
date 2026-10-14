/** POST /api/v1/runs/:id/cancel — ask the worker to stop between batches. */
import { appendJobEvents, getJob } from '../../../../server/jobstore.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed, use POST' })
    return
  }
  const id = String(req.query?.id ?? '')
  const job = await getJob(id)
  if (!job) {
    res.status(404).json({ error: 'job not found' })
    return
  }
  if (job.status === 'queued' || job.status === 'running') {
    await appendJobEvents(id, [], { status: 'cancelled' })
  }
  const fresh = await getJob(id)
  const { kickToken, ...rest } = fresh
  res.status(200).json(rest)
}
