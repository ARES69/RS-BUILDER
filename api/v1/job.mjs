/** GET /api/v1/job?id=… — job snapshot (status + full event log, no secrets). */
import { getJob } from '../../server/jobstore.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed, use GET' })
    return
  }
  const id = String(req.query?.id ?? '')
  const job = await getJob(id)
  if (!job) {
    res.status(404).json({ error: 'job not found' })
    return
  }
  const { kickToken, ...rest } = job
  res.status(200).json(rest)
}
