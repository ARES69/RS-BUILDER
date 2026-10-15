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

export const jobStoreKind = () => (blobToken() ? 'blob' : 'fs')

/* ---- generic JSON document ops (jobs, users, history indexes) ---- */

const fsPath = (path) => join(fsDir(), path.replace(/\//g, '__') + '.json')

export async function getJobDoc(path) {
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
