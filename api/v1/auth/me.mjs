/** GET /api/v1/auth/me → the signed-in user (or 401). */
import { sessionFromRequest } from '../../../server/auth.mjs'
import { findUserById } from '../../../server/users.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') return res.status(405).json({ error: 'use GET' })
  const uid = sessionFromRequest(req)
  const user = uid ? await findUserById(uid) : null
  if (!user) return res.status(401).json({ error: 'not signed in' })
  res.status(200).json({ user: { id: user.id, email: user.email } })
}
