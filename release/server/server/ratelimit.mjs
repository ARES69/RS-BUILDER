/**
 * Append-only rate limiting on the Blob store.
 *
 * Every attempt writes a tiny document; the current window's count is the
 * number of documents under `rsb-rl/<bucket>/<window>/` (list() is consistent,
 * overwrite reads are not — so nothing here ever overwrites). Serverless
 * instances share the store, so the limit holds across invocations.
 */
import { listDocs, putJobDoc } from './jobstore.mjs'
import { createHash } from 'node:crypto'

const WINDOW_MS = 10 * 60 * 1000

export const hashBucket = (value) => createHash('sha256').update(String(value)).digest('hex').slice(0, 24)

/** Returns true when the attempt is allowed (and records it). */
export async function rateHit(bucket, limit) {
  try {
    const win = Math.floor(Date.now() / WINDOW_MS)
    const prefix = 'rsb-rl/' + bucket + '/' + win + '/'
    const count = (await listDocs(prefix)).length
    if (count >= limit) return false
    await putJobDoc(prefix + Date.now() + '-' + Math.random().toString(36).slice(2, 8), { t: Date.now(), bucket })
    return true
  } catch {
    // fail open only when the store itself is down (auth would 500 anyway)
    return true
  }
}

export const clientIp = (req) => {
  const fwd = String(req?.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim()
  return fwd || String(req?.headers?.['x-real-ip'] ?? 'unknown')
}

export const LIMITS = {
  loginPerEmail: 6,
  loginPerIp: 30,
  signupPerIp: 5,
  resetPerEmail: 3,
}
