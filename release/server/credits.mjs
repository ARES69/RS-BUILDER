/**
 * Credit ledger: the metering half of billing (Stripe top-ups plug in later
 * as just another ledger source).
 *
 * Append-only entries in the Blob store (`rsb-ledger/<userHash>/<ts>-<rand>`):
 * balance = sum of entries. Single-write docs read fresh, list() is consistent,
 * so no overwrite-lag traps here.
 *
 * Economics: signup grants SIGNUP_GRANT; every finished queued run debits the
 * credits the engine itself reported (60 + 4*tool_calls, the same number the
 * workspace shows during the run). Anonymous runs stay ungated (funnel).
 */
import { getJobDoc, listDocs, putJobDoc } from './jobstore.mjs'

export const SIGNUP_GRANT = 500
export const MIN_RUN_CREDITS = 100

const userHashOf = (userId) => String(userId).split(':')[0].replace(/^rsb-users\//, '')
const ledgerPrefix = (userId) => 'rsb-ledger/' + userHashOf(userId) + '/'

export async function addLedgerEntry(userId, delta, reason, jobId = null) {
  const path = ledgerPrefix(userId) + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
  await putJobDoc(path, { t: Date.now(), delta, reason, jobId })
  return path
}

export async function grantSignupCredits(userId) {
  return addLedgerEntry(userId, SIGNUP_GRANT, 'signup-grant')
}

/** All entries, newest first. */
export async function ledger(userId) {
  const paths = await listDocs(ledgerPrefix(userId))
  const entries = []
  for (const p of paths) {
    const doc = await getJobDoc(p)
    if (doc && typeof doc.delta === 'number') entries.push(doc)
  }
  entries.sort((a, b) => (b.t || 0) - (a.t || 0))
  return entries
}

export async function balance(userId) {
  const entries = await ledger(userId)
  return entries.reduce((sum, e) => sum + e.delta, 0)
}

/** Debits the credits a finished run reported (last progress event). */
export async function debitRun(userId, job) {
  const progress = [...(job.events || [])].reverse().find((e) => e.type === 'progress')
  const credits = Number(progress?.credits ?? 0)
  if (!userId || !credits) return null
  return addLedgerEntry(userId, -credits, 'run:' + (job.locale || 'en'), job.id)
}
