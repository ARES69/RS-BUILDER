/** User documents in the Blob store: rsb-users/<sha256(email)>. */
import { createHash, randomBytes } from 'node:crypto'
import { getJobDoc, putJobDoc } from './jobstore.mjs'
import { hashPassword, verifyPassword } from './auth.mjs'

const path = (email) => 'rsb-users/' + createHash('sha256').update(String(email).toLowerCase().trim()).digest('hex').slice(0, 32)

export async function findUserByEmail(email) {
  return getJobDoc(path(email))
}

export async function findUserById(id) {
  // ids embed the storage path so a single doc round-trip resolves them
  if (!id || !id.includes(':')) return null
  const [p, createdAt] = id.split(':')
  const doc = await getJobDoc(p)
  return doc && doc.createdAt === Number(createdAt) ? doc : null
}

export async function createUser(email, password) {
  const normalized = String(email).toLowerCase().trim()
  const { salt, hash } = hashPassword(password)
  const p = path(normalized)
  const doc = {
    id: p + ':' + Date.now(),
    email: normalized,
    salt,
    hash,
    createdAt: Date.now(),
  }
  await putJobDoc(p, doc)
  return doc
}

export const newUserId = () => 'u_' + randomBytes(8).toString('hex')

/* ---- one-time recovery codes (no email provider in v1) ---- */

const codeHash = (code) => createHash('sha256').update('rsb-rc:' + code).digest('hex').slice(0, 32)
const userHashOf = (user) => String(user.id).split(':')[0].replace(/^rsb-users\//, '')

/** Mints 3 one-time codes; returns them in PLAINTEXT exactly once. */
export async function issueRecoveryCodes(user) {
  const codes = []
  for (let i = 0; i < 3; i++) {
    const code = randomBytes(6).toString('hex').replace(/(.{4})(.{4})(.{4})/, '$1-$2-$3')
    codes.push(code)
    await putJobDoc('rsb-codes/' + userHashOf(user) + '/' + codeHash(code), { createdAt: Date.now() })
  }
  return codes
}

export async function consumeRecoveryCode(user, code) {
  const normalized = String(code ?? '').toLowerCase().trim()
  if (!/^[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}$/.test(normalized)) return false
  const base = 'rsb-codes/' + userHashOf(user) + '/' + codeHash(normalized)
  const issued = await getJobDoc(base)
  if (!issued) return false
  const used = await getJobDoc(base + '/used')
  if (used) return false
  await putJobDoc(base + '/used', { at: Date.now() })
  return true
}

export async function changePassword(user, newPassword) {
  const p = String(user.id).split(':')[0]
  const { salt, hash } = hashPassword(newPassword)
  const doc = { ...user, salt, hash }
  await putJobDoc(p, doc)
  return doc
}

export const verifyUserPassword = (user, password) => verifyPassword(password, user.salt, user.hash)
