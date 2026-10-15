/**
 * Vercel serverless function: GET /api/v1/health
 * Same payload as the standalone server's /v1/health.
 */
import { VERSION, engineInfo } from '../../server/engine.mjs'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ ok: true, name: 'rs-builder-agent-server', version: VERSION, runtime: 'vercel-node', ...engineInfo() })
}
