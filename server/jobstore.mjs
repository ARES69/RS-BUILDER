/**
 * Job store for queued agent runs (the "service" layer over the engine).
 *
 * A job document holds the full event log of a run, so any client can attach,
 * detach and re-attach with a cursor, and a reaper can retry dead workers.
 * Two adapters behind one interface:
 *   - blob: Vercel Blob (zero-config on Vercel, BLOB_READ_WRITE_TOKEN)
 *   - fs:   local filesystem (npm run server / tests), RSB_JOB_DIR or os.tmpdir()
 * The active adapter is reported by GET /v1/status as jobStore.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { up, upstashConfigured } from './upstash.mjs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

/* OIDC zero-config: on Vercel the store may be connected without a static
   token (BLOB_STORE_ID + VERCEL_OIDC_TOKEN are exchanged by @vercel/blob). */
const blobToken = () =>
  process.env.BLOB_READ_WRITE_TOKEN || (process.env.BLOB_STORE_ID && process.env.VERCEL ? 'oidc' : null)

let blobP = null
async function blob() {
  if (!blobP) blobP = import('@vercel/blob')
  return blobP
}

/* OIDC zero-config: put/list pick the Vercel OIDC token up automatically,
   but get() demands explicit credentials — pass the static token when present
   or the OIDC JWT via the library's own `oidcToken` option. */
let tokenP = null
async function blobReadOptions() {
  if (process.env.BLOB_READ_WRITE_TOKEN) return { access: 'private', token: process.env.BLOB_READ_WRITE_TOKEN }
  tokenP = tokenP ?? import('@vercel/oidc').then((m) => m.getVercelOidcToken())
  return { access: 'private', oidcToken: await tokenP }
}

const prefix = 'rsb-jobs/'

/* ---- redis adapter (Upstash REST, spec option B) -------------------------
 * When the Blob store is suspended and the user has an Upstash free key, the
 * whole service layer (jobs, users, history, ledger, manifests, gallery)
 * moves to Redis over HTTP — no TCP, no new runtime, strong consistency, so
 * overwrite reads are instant (no append-only workarounds needed).
 */
/* the wire itself lives in server/upstash.mjs (documented REST pipeline) */
const dirOf = (path) => {
  const i = String(path).lastIndexOf('/')
  return i > 0 ? String(path).slice(0, i) : String(path)
}

async function drainStream(stream) {
  if (!stream) return ''
  if (typeof stream.getReader === 'function') {
    const reader = stream.getReader()
    const decoder = new TextDecoder()
    let out = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      out += decoder.decode(value, { stream: true })
    }
    return out
  }
  return new Promise((resolve, reject) => {
    let out = ''
    stream.setEncoding?.('utf8')
    stream.on('data', (c) => (out += c))
    stream.on('end', () => resolve(out))
    stream.on('error', reject)
  })
}

function fsDir() {
  return process.env.RSB_JOB_DIR || join(tmpdir(), 'rsb-jobs')
}

async function fsRead(id) {
  try {
    return JSON.parse(await readFile(join(fsDir(), id + '.json'), 'utf8'))
  } catch {
    return null
  }
}

async function fsWrite(job) {
  await mkdir(fsDir(), { recursive: true })
  await writeFile(join(fsDir(), job.id + '.json'), JSON.stringify(job))
}

export const jobStoreKind = () => (upstashConfigured() ? 'redis' : blobToken() ? 'blob' : 'fs')

/* ---- store health canary -------------------------------------------------
 * The queue promise ("the run survives a closed tab") used to degrade
 * SILENTLY: createJob threw, runs fell back to sync, and nobody — us, the UI,
 * the audits — could tell why. This probe writes one tiny doc (fixed key,
 * cached 60s per warm instance) and reports the truth in /v1/status, so the
 * queue capability is advertised only when the store actually writes.
 */
let probeCache = { at: 0, result: null }
export async function probeJobStore({ force = false } = {}) {
  const kind = jobStoreKind()
  if (kind === 'fs') return { kind, ok: true, note: 'fs adapter (local/dev)', at: new Date().toISOString() }
  if (!force && probeCache.result && Date.now() - probeCache.at < 60_000) return probeCache.result
  const at = new Date().toISOString()
  try {
    await putJobDoc(prefix + 'probe/store', { probe: true, at })
    // read-back is informational: an overwritten doc can briefly serve the
    // previous version (eventual consistency), so ok is decided by the write
    const back = await getJobDoc(prefix + 'probe/store')
    probeCache = { at: Date.now(), result: { kind, ok: true, readBack: Boolean(back), at } }
  } catch (error) {
    probeCache = {
      at: Date.now(),
      result: {
        kind,
        ok: false,
        code: error?.code ?? error?.name ?? null,
        error: String(error?.message ?? error).slice(0, 240),
        at,
      },
    }
  }
  return probeCache.result
}

/** Test hook: drop the cached probe result (env flips in the api suite). */
export function __resetStoreProbe() {
  probeCache = { at: 0, result: null }
}

/* ---- generic JSON document ops (jobs, users, history indexes) ---- */

const fsPath = (path) => join(fsDir(), path.replace(/\//g, '__') + '.json')

export async function getJobDoc(path) {
  if (upstashConfigured()) {
    try {
      const value = await up.get(String(path))
      if (value === null || value === undefined) return null
      return typeof value === 'string' ? JSON.parse(value) : value
    } catch {
      return null
    }
  }
  if (blobToken()) {
    const { get } = await blob()
    try {
      const res = await get(path, await blobReadOptions())
      if (!res || (res.statusCode && res.statusCode !== 200)) return null
      return JSON.parse(await drainStream(res.stream))
    } catch {
      return null
    }
  }
  try {
    return JSON.parse(await readFile(fsPath(path), 'utf8'))
  } catch {
    return null
  }
}

/** Lists document paths under a prefix (append-only collections). */
export async function listDocs(prefix) {
  if (upstashConfigured()) {
    try {
      const list = await up.smembers('idx:' + String(prefix).replace(/\/+$/, ''))
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  }
  if (blobToken()) {
    const { list } = await blob()
    const out = []
    let cursor
    do {
      const res = await list({ prefix, cursor })
      cursor = res.cursor
      for (const b of res.blobs ?? []) out.push(b.pathname)
    } while (cursor)
    return out
  }
  try {
    const names = await readdir(fsDir())
    const key = prefix.replace(/\//g, '__')
    return names.filter((n) => n.startsWith(key) && n.endsWith('.json')).map((n) => n.slice(0, -5).replace(/__/g, '/'))
  } catch {
    return []
  }
}

export async function putJobDoc(path, doc) {
  if (upstashConfigured()) {
    await up.set(String(path), JSON.stringify(doc))
    await up.sadd('idx:' + dirOf(path), String(path))
    return doc
  }
  if (blobToken()) {
    const { put } = await blob()
    await put(path, JSON.stringify(doc), {
      access: 'private',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    return doc
  }
  await mkdir(fsDir(), { recursive: true })
  await writeFile(fsPath(path), JSON.stringify(doc))
  return doc
}

export async function createJob({ prompt, locale, kickToken, ownerId, lineageRoot, seedFiles, seedTurns, seedBinaries }) {
  const job = {
    ownerId: ownerId || null,
    id: 'job_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4),
    prompt: String(prompt).slice(0, 4000),
    locale: locale === 'ru' ? 'ru' : 'en',
    status: 'queued', // queued | running | done | failed | cancelled
    createdAt: Date.now(),
    updatedAt: Date.now(),
    heartbeatAt: Date.now(),
    attempts: 0,
    cursor: 0, // events persisted so far
    events: [],
    error: null,
    kickToken,
    lineageRoot: lineageRoot || null,
    seedFiles: seedFiles || null,
    seedTurns: seedTurns || null,
    seedBinaries: seedBinaries || null,
  }
  return putJobDoc(prefix + job.id, job)
}

export async function getJob(id) {
  if (!/^job_[a-z0-9]{6,24}$/i.test(id)) return null
  return getJobDoc(prefix + id)
}

export async function putJob(job) {
  job.updatedAt = Date.now()
  return putJobDoc(prefix + job.id, job)
}

/** Appends events and/or moves status; single writer per job (the worker). */
export async function appendJobEvents(id, events, patch = {}) {
  const job = await getJob(id)
  if (!job) return null
  if (events && events.length) job.events.push(...events)
  Object.assign(job, patch)
  job.cursor = job.events.length
  return putJob(job)
}

export async function listJobs() {
  if (blobToken()) {
    const { list } = await blob()
    const out = []
    let cursor
    do {
      const res = await list({ prefix, cursor })
      cursor = res.cursor
      for (const b of res.blobs ?? []) {
        const job = await getJob(b.pathname.slice(prefix.length))
        if (job) out.push(job)
      }
    } while (cursor)
    return out
  }
  try {
    const names = await readdir(fsDir())
    const jobs = []
    for (const n of names) {
      if (!n.endsWith('.json')) continue
      try {
        const doc = JSON.parse(await readFile(join(fsDir(), n), 'utf8'))
        if (doc && typeof doc.id === 'string' && doc.id.startsWith('job_')) jobs.push(doc)
      } catch { /* skip unreadable */ }
    }
    return jobs
  } catch {
    return []
  }
}
