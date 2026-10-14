/** GET /api/v1/runs/:id — job snapshot (status + full event log, no secrets). */
import { getJob } from '../../../server/jobstore.mjs'

const sanitize = ({ kickToken, ...rest }) => rest

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
  res.status(200).json(sanitize(job))
}
