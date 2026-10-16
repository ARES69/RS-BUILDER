/**
 * Minimal self-contained auth for RS-BUILDER (no third-party identity provider):
 *  - passwords hashed with scrypt (per-user salt, timing-safe compare)
 *  - sessions = stateless HMAC-SHA256 signed cookies (RSB_SESSION_SECRET)
 * Upgrade path (documented in DEPLOY.md): OAuth / Postgres when the product
 * outgrows the Blob store.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'rsb_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

const secret = () => process.env.RSB_SESSION_SECRET || process.env.CRON_SECRET || null

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(String(password), salt, 32).toString('hex')
  return { salt, hash }
}

export function verifyPassword(password, salt, expected) {
  try {
    const actual = scryptSync(String(password), salt, 32)
    const want = Buffer.from(expected, 'hex')
    return actual.length === want.length && timingSafeEqual(actual, want)
  } catch {
    return false
  }
}

export function signSession(userId) {
  if (!secret()) return null
  const exp = Date.now() + SESSION_TTL_MS
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp })).toString('base64url')
  const sig = createHmac('sha256', secret()).update(payload).digest('base64url')
  return { token: payload + '.' + sig, exp }
}

export function verifySession(token) {
  if (!secret() || !token || typeof token !== 'string') return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const want = createHmac('sha256', secret()).update(payload).digest('base64url')
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(want)
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!data?.uid || !data?.exp || data.exp < Date.now()) return null
    return data.uid
  } catch {
    return null
  }
}

/** Reads the session cookie from a req-like object (Vercel or node http). */
export function sessionFromRequest(req) {
  const raw = req?.headers?.cookie
  if (!raw) return null
  const match = String(raw).match(new RegExp('(?:^|;\\s*)' + COOKIE_NAME + '=([^;]+)'))
  return verifySession(match ? decodeURIComponent(match[1]) : null)
}

export const sessionCookie = (token, exp) =>
  `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${Math.floor((exp - Date.now()) / 1000)}`

export const clearSessionCookie = () => `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`

export { COOKIE_NAME }

export const validEmail = (email) => typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
