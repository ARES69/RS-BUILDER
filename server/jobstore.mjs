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
  if (process.env.BLOB_READ_WRITE_TOKEN) return { token: process.env.BLOB_READ_WRITE_TOKEN }
  tokenP = tokenP ?? import('@vercel/oidc').then((m) => m.getVercelOidcToken())
  return { oidcToken: await tokenP }
}

const prefix = 'rsb-jobs/'

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

export async function createJob({ prompt, locale, kickToken }) {
  const job = {
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
  }
  if (blobToken()) {
    const { put } = await blob()
    await put(prefix + job.id, JSON.stringify(job), { access: 'private', contentType: 'application/json', addRandomSuffix: false })
  } else {
    await fsWrite(job)
  }
  return job
}

export async function getJob(id) {
  if (!/^job_[a-z0-9]{6,24}$/i.test(id)) return null
  if (blobToken()) {
    const { get } = await blob()
    try {
      const res = await get(prefix + id, await blobReadOptions())
      if (!res) return null
      return JSON.parse(await res.text())
    } catch {
      return null
    }
  }
  return fsRead(id)
}

export async function putJob(job) {
  job.updatedAt = Date.now()
  if (blobToken()) {
    const { put } = await blob()
    await put(prefix + job.id, JSON.stringify(job), { access: 'private', contentType: 'application/json', addRandomSuffix: false, allowOverwrite: true })
  } else {
    await fsWrite(job)
  }
  return job
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
    for (const n of names) if (n.endsWith('.json')) jobs.push(await fsRead(n.slice(0, -5)))
    return jobs.filter(Boolean)
  } catch {
    return []
  }
}
