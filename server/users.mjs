/** User documents in the Blob store: rsb-users/<sha256(email)>. */
import { createHash, randomBytes } from 'node:crypto'
import { getJobDoc, putJobDoc } from './jobstore.mjs'
import { hashPassword } from './auth.mjs'

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
