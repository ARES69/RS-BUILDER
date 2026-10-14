/** POST /api/v1/auth/logout → clears the session cookie. */
import { clearSessionCookie } from '../../../server/auth.mjs'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'POST') return res.status(405).json({ error: 'use POST' })
  res.setHeader('Set-Cookie', clearSessionCookie())
  res.status(200).json({ ok: true })
}
