/** GET /api/v1/history → the signed-in user's run index (newest first). */
import { sessionFromRequest } from '../../server/auth.mjs'
import { listRunHistory } from '../../server/history.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'use GET' })
  const uid = sessionFromRequest(req)
  if (!uid) return res.status(401).json({ error: 'not signed in' })
  res.status(200).json({ runs: await listRunHistory(uid) })
}
