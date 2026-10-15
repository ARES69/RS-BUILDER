/**
 * Artifact hosting: finished deliverables get permanent public URLs.
 *
 *  - pages/html  → https://<public-store>/art/<jobId>/index.html  (works in an
 *    iframe or as a standalone share link — this IS the preview hosting)
 *  - downloads   → /art/<jobId>/<name> (pptx, srt, md, …)
 *  - versions    → a manifest per lineage root (a run continued from another
 *    run inherits its root, so "improve this page" becomes v2, v3, …)
 *
 * The store is PUBLIC by design: unguessable job ids are the share tokens.
 * Jobs/history stay in the private store. Locally (no Vercel) artifacts land
 * in RSB_ARTIFACT_DIR with fs:// urls so tests and `npm run server` work.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { getJobDoc, listDocs, putJobDoc } from './jobstore.mjs'

const storeId = () => process.env.ARTIFACTS_STORE_ID || null
export const artifactsKind = () => (storeId() ? 'blob' : 'fs')

let blobP = null
async function blob() {
  if (!blobP) blobP = import('@vercel/blob')
  return blobP
}

let oidcP = null
async function oidcToken() {
  oidcP = oidcP ?? import('@vercel/oidc').then((m) => m.getVercelOidcToken())
  return oidcP
}

const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  json: 'application/json',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  srt: 'application/x-subrip',
  md: 'text/markdown; charset=utf-8',
  csv: 'text/csv; charset=utf-8',
}
const typeOf = (name) => CONTENT_TYPES[String(name).split('.').pop()?.toLowerCase()] ?? 'application/octet-stream'

function fsDir() {
  return process.env.RSB_ARTIFACT_DIR || join(tmpdir(), 'rsb-artifacts')
}

async function publishOne(path, body, contentType) {
  if (storeId()) {
    const { put } = await blob()
    const res = await put(path, body, {
      access: 'public',
      storeId: storeId(),
      oidcToken: await oidcToken(),
      contentType,
      contentDisposition: 'inline',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
    return res.url
  }
  const file = join(fsDir(), path.replace(/\//g, '__'))
  await mkdir(fsDir(), { recursive: true })
  await writeFile(file, body)
  return 'fs://' + file
}

/** Publishes the artifact of a finished run; returns urls + manifest entry. */
export async function publishArtifact(job, artifact) {
  const base = 'art/' + job.id
  const files = []
  let pageUrl = null
  if (artifact?.html) {
    pageUrl = await publishOne(base + '/index.html', artifact.html, CONTENT_TYPES.html)
  }
  for (const dl of artifact?.downloads ?? []) {
    if (!dl?.name || !dl?.base64) continue
    const buf = Buffer.from(dl.base64, 'base64')
    files.push({ name: dl.name, url: await publishOne(base + '/' + dl.name, buf, typeOf(dl.name)), size: buf.length })
  }
  if (artifact?.html) files.unshift({ name: 'index.html', url: pageUrl, size: artifact.html.length })

  // append-only version document (overwrite reads are eventually consistent)
  const root = job.lineageRoot || job.id
  const before = (await listDocs('rsb-artmanifest/' + root + '/')).length
  const version = before + 1
  await putJobDoc('rsb-artmanifest/' + root + '/' + job.id, {
    jobId: job.id,
    root,
    version,
    createdAt: Date.now(),
    pageUrl,
    files,
  })
  const versions = before + 1

  // public gallery entry: real runs the product can show off inside the
  // workspace sandbox (prompt excerpt + urls only, no secrets)
  const modelEvent = (job.events || []).find((e) => e.type === 'model')
  await putJobDoc('rsb-gallery/' + job.id, {
    jobId: job.id,
    prompt: String(job.prompt ?? '').slice(0, 140),
    locale: job.locale,
    pageUrl,
    root,
    version,
    model: modelEvent?.model ?? null,
    createdAt: Date.now(),
  }).catch(() => {})

  return { root, version, pageUrl, files, versions }
}

/** Real runs published before the gallery existed (backfill, all genuine). */
const CURATED_GALLERY = [
  {
    jobId: 'job_4v3kxropgt2h',
    prompt: 'Кофейня Maroon: hero, меню из 3 позиций, футер с часами работы',
    locale: 'ru',
    pageUrl: 'https://lbjvtuiqitewxjwu.public.blob.vercel-storage.com/art/job_4v3kxropgt2h/index.html',
    root: 'job_4v3kxropgt2h',
    version: 1,
    model: 'groq/openai/gpt-oss-120b',
    createdAt: 1792051200000,
  },
]

/** Public gallery of real hosted artifacts (newest first, capped). */
export async function publicGallery(limit = 20) {
  const paths = await listDocs('rsb-gallery/')
  const entries = [...CURATED_GALLERY]
  for (const p of paths) {
    const doc = await getJobDoc(p)
    if (doc?.pageUrl && !entries.some((e) => e.jobId === doc.jobId)) entries.push(doc)
  }
  entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return entries.slice(0, limit)
}

/** Builds the lineage manifest from version docs (newest last). */
export async function getManifest(root) {
  const paths = await listDocs('rsb-artmanifest/' + root + '/')
  const versions = []
  for (const p of paths) {
    const doc = await getJobDoc(p)
    if (doc?.jobId) versions.push(doc)
  }
  versions.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
  return { root, versions: versions.map((v, i) => ({ ...v, version: i + 1 })) }
}
