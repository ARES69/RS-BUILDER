/**
 * Vercel serverless function: GET /api/v1/artfile?path=art/<jobId>/site/index.html
 *
 * Public, unguessable-url read endpoint for artifacts hosted in the Redis
 * adapter (Upstash). Unguessable job ids are the share tokens, exactly like
 * the public Blob store was: no auth, immutable caching, CORS-open so the
 * workspace iframe and /view pages can embed it cross-origin.
 */
import { artifactsKind, readRedisArtifact } from '../../server/artifacts.mjs'

const CONTENT_TYPES = {
  html: 'text/html; charset=utf-8',
  css: 'text/css; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  mjs: 'text/javascript; charset=utf-8',
  svg: 'image/svg+xml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  ico: 'image/x-icon',
  json: 'application/json',
  md: 'text/markdown; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  pdf: 'application/pdf',
  woff2: 'font/woff2',
  srt: 'application/x-subrip',
  zip: 'application/zip',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed, use GET' })
    return
  }
  const path = String(req.query?.path ?? '')
  if (!/^art\/[A-Za-z0-9_./-]+$/.test(path) || path.includes('..')) {
    res.status(400).json({ error: 'bad path' })
    return
  }
  if (artifactsKind() !== 'redis') {
    res.status(404).json({ error: 'artifacts are not hosted in redis on this deployment' })
    return
  }
  const body = await readRedisArtifact(path).catch(() => null)
  if (!body) {
    res.status(404).json({ error: 'not found' })
    return
  }
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  res.setHeader('Content-Type', CONTENT_TYPES[ext] ?? 'application/octet-stream')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.status(200)
  res.write(body)
  res.end()
}
