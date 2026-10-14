/** GET /api/v1/historyrun?id=… — full event log of own run (ownership-checked). */
import { sessionFromRequest } from '../../server/auth.mjs'
import { getHistoryRun } from '../../server/history.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'use GET' })
  const uid = sessionFromRequest(req)
  if (!uid) return res.status(401).json({ error: 'not signed in' })
  const job = await getHistoryRun(uid, String(req.query?.id ?? ''))
  if (!job) return res.status(404).json({ error: 'run not found in your history' })
  res.status(200).json(job)
}
