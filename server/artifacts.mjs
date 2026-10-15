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
import { getJobDoc, putJobDoc } from './jobstore.mjs'

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

  const root = job.lineageRoot || job.id
  const manifest = (await getJobDoc('rsb-artmanifest/' + root)) ?? { root, versions: [] }
  const version = manifest.versions.length + 1
  manifest.versions.push({ jobId: job.id, version, createdAt: Date.now(), pageUrl, files: files.length })
  manifest.updatedAt = Date.now()
  await putJobDoc('rsb-artmanifest/' + root, manifest)

  return { root, version, pageUrl, files, versions: manifest.versions.length }
}

export async function getManifest(root) {
  return getJobDoc('rsb-artmanifest/' + root)
}
