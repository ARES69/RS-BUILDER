/**
 * Accounts in one function (Hobby plan caps deployments at 12 functions):
 *   POST /api/v1/auth?action=signup {email, password}
 *   POST /api/v1/auth?action=login  {email, password}
 *   POST /api/v1/auth?action=logout
 *   GET  /api/v1/auth?action=me
 */
import { createUser, findUserByEmail, findUserById } from '../../server/users.mjs'
import { clearSessionCookie, sessionCookie, signSession, sessionFromRequest, validEmail, verifyPassword } from '../../server/auth.mjs'

async function readBody(req) {
  let body = ''
  if (typeof req[Symbol.asyncIterator] === 'function') {
    for await (const c of req) body += c
  } else {
    body = await new Promise((r) => {
      let a = ''
      req.on('data', (c) => (a += c))
      req.on('end', () => r(a))
      req.on('error', () => r(a))
    })
  }
  try { return JSON.parse(body || '{}') } catch { return {} }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  const action = String(req.query?.action ?? 'me')

  if (action === 'logout') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'use POST' })
    res.setHeader('Set-Cookie', clearSessionCookie())
    return res.status(200).json({ ok: true })
  }

  if (action === 'me') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'use GET' })
    const uid = sessionFromRequest(req)
    const user = uid ? await findUserById(uid) : null
    if (!user) return res.status(401).json({ error: 'not signed in' })
    return res.status(200).json({ user: { id: user.id, email: user.email } })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'use POST' })
  const payload = await readBody(req)

  if (action === 'signup') {
    const email = String(payload.email ?? '')
    const password = String(payload.password ?? '')
    if (!validEmail(email)) return res.status(400).json({ error: 'invalid email' })
    if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' })
    if (await findUserByEmail(email)) return res.status(409).json({ error: 'email already registered' })
    const user = await createUser(email, password)
    const session = signSession(user.id)
    if (!session) return res.status(503).json({ error: 'auth is not configured on this deployment (RSB_SESSION_SECRET missing)' })
    res.setHeader('Set-Cookie', sessionCookie(session.token, session.exp))
    return res.status(201).json({ user: { id: user.id, email: user.email } })
  }

  if (action === 'login') {
    const user = await findUserByEmail(String(payload.email ?? ''))
    if (!user || !verifyPassword(String(payload.password ?? ''), user.salt, user.hash)) {
      return res.status(401).json({ error: 'wrong email or password' })
    }
    const session = signSession(user.id)
    if (!session) return res.status(503).json({ error: 'auth is not configured on this deployment (RSB_SESSION_SECRET missing)' })
    res.setHeader('Set-Cookie', sessionCookie(session.token, session.exp))
    return res.status(200).json({ user: { id: user.id, email: user.email } })
  }

  res.status(404).json({ error: 'unknown action' })
}
