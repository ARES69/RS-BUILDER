/** POST /api/v1/auth/signup {email, password} → sets the session cookie. */
import { createUser, findUserByEmail } from '../../../server/users.mjs'
import { signSession, sessionCookie, validEmail } from '../../../server/auth.mjs'

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

  const email = String(payload.email ?? '')
  const password = String(payload.password ?? '')
  if (!validEmail(email)) return res.status(400).json({ error: 'invalid email' })
  if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' })
  if (await findUserByEmail(email)) return res.status(409).json({ error: 'email already registered' })

  const user = await createUser(email, password)
  const session = signSession(user.id)
  if (!session) return res.status(503).json({ error: 'auth is not configured on this deployment (RSB_SESSION_SECRET missing)' })
  res.setHeader('Set-Cookie', sessionCookie(session.token, session.exp))
  res.status(201).json({ user: { id: user.id, email: user.email } })
}
