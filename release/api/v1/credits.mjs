/** GET /api/v1/credits → own balance + ledger (newest first, capped). */
import { sessionFromRequest } from '../../server/auth.mjs'
import { balance, ledger } from '../../server/credits.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'use GET' })
  const uid = sessionFromRequest(req)
  if (!uid) return res.status(401).json({ error: 'not signed in' })
  const entries = await ledger(uid)
  res.status(200).json({ balance: entries.reduce((s, e) => s + e.delta, 0), entries: entries.slice(0, 30) })
}
