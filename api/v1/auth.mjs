/**
 * Accounts in one function (Hobby plan caps deployments at 12 functions):
 *   POST /api/v1/auth?action=signup {email, password}
 *   POST /api/v1/auth?action=login  {email, password}
 *   POST /api/v1/auth?action=logout
 *   GET  /api/v1/auth?action=me
 */
import { changePassword, consumeRecoveryCode, createUser, findUserByEmail, findUserById, issueRecoveryCodes, verifyLogin } from '../../server/users.mjs'
import { clearSessionCookie, sessionCookie, signSession, sessionFromRequest, validEmail, verifyPassword } from '../../server/auth.mjs'
import { LIMITS, clientIp, hashBucket, rateCheck, rateHit } from '../../server/ratelimit.mjs'
import { balance, grantSignupCredits } from '../../server/credits.mjs'

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
    const credits = await balance(uid).catch(() => null)
    return res.status(200).json({ user: { id: user.id, email: user.email, credits } })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'use POST' })
  const payload = await readBody(req)

  if (action === 'signup') {
    const email = String(payload.email ?? '')
    const password = String(payload.password ?? '')
    const ip = clientIp(req)
    if (!(await rateHit('signupip:' + hashBucket(ip), LIMITS.signupPerIp))) {
      return res.status(429).json({ error: 'rate limited' })
    }
    if (!validEmail(email)) return res.status(400).json({ error: 'invalid email' })
    if (password.length < 8) return res.status(400).json({ error: 'password must be at least 8 characters' })
    if (await findUserByEmail(email)) return res.status(409).json({ error: 'email already registered' })
    const user = await createUser(email, password)
    await grantSignupCredits(user.id).catch(() => {})
    const codes = await issueRecoveryCodes(user).catch(() => [])
    const session = signSession(user.id)
    if (!session) return res.status(503).json({ error: 'auth is not configured on this deployment (RSB_SESSION_SECRET missing)' })
    res.setHeader('Set-Cookie', sessionCookie(session.token, session.exp))
    return res.status(201).json({ user: { id: user.id, email: user.email }, recoveryCodes: codes })
  }

  if (action === 'reset') {
    const email = String(payload.email ?? '')
    if (!(await rateHit('reset:' + hashBucket(email), LIMITS.resetPerEmail))) {
      return res.status(429).json({ error: 'rate limited' })
    }
    const user = await findUserByEmail(email)
    const password = String(payload.password ?? '')
    // user-or-code failure is indistinguishable on purpose
    if (!user || password.length < 8 || !(await consumeRecoveryCode(user, payload.code))) {
      return res.status(401).json({ error: 'invalid email or recovery code' })
    }
    await changePassword(user, password)
    return res.status(200).json({ ok: true })
  }

  if (action === 'login') {
    const email = String(payload.email ?? '')
    const ip = clientIp(req)
    const allowed =
      (await rateCheck('login:' + hashBucket(email), LIMITS.loginPerEmail)) &&
      (await rateCheck('loginip:' + hashBucket(ip), LIMITS.loginPerIp))
    if (!allowed) return res.status(429).json({ error: 'rate limited' })
    const user = await verifyLogin(email, String(payload.password ?? ''))
    if (!user) {
      // only failures burn write budget
      await rateHit('login:' + hashBucket(email), LIMITS.loginPerEmail)
      await rateHit('loginip:' + hashBucket(ip), LIMITS.loginPerIp)
      return res.status(401).json({ error: 'wrong email or password' })
    }
    const session = signSession(user.id)
    if (!session) return res.status(503).json({ error: 'auth is not configured on this deployment (RSB_SESSION_SECRET missing)' })
    res.setHeader('Set-Cookie', sessionCookie(session.token, session.exp))
    return res.status(200).json({ user: { id: user.id, email: user.email } })
  }

  res.status(404).json({ error: 'unknown action' })
}
