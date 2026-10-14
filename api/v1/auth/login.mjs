/** POST /api/v1/auth/login {email, password} → sets the session cookie. */
import { findUserByEmail } from '../../../server/users.mjs'
import { signSession, sessionCookie, verifyPassword } from '../../../server/auth.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'POST') return res.status(405).json({ error: 'use POST' })
  let body = ''
  if (typeof req[Symbol.asyncIterator] === 'function') {
    for await (const c of req) body += c
  } else {
    body = await new Promise((r) => { let a = ''; req.on('data', (c) => (a += c)); req.on('end', () => r(a)); req.on('error', () => r(a)) })
  }
  let payload = {}
  try { payload = JSON.parse(body || '{}') } catch { /* defaults */ }

  const user = await findUserByEmail(String(payload.email ?? ''))
  if (!user || !verifyPassword(String(payload.password ?? ''), user.salt, user.hash)) {
    return res.status(401).json({ error: 'wrong email or password' })
  }
  const session = signSession(user.id)
  if (!session) return res.status(503).json({ error: 'auth is not configured on this deployment (RSB_SESSION_SECRET missing)' })
  res.setHeader('Set-Cookie', sessionCookie(session.token, session.exp))
  res.status(200).json({ user: { id: user.id, email: user.email } })
}
