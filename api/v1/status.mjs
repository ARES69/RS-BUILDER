/**
 * Vercel serverless function: GET /api/v1/status
 * Live introspection for the workspace settings panel: which engine and
 * providers are active right now, which are cooling down (daily quotas),
 * which model catalogs are cached. No secrets are ever exposed.
 */
import { engineInfo, runtimeStatus, VERSION } from '../../server/engine.mjs'
import { parseRuntimeKeys } from '../../server/orchestrator.mjs'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed, use GET' })
    return
  }
  const runtime = parseRuntimeKeys(req.headers['x-rsb-keys'])
  const info = engineInfo(runtime)
  res.status(200).json({
    ok: true,
    name: 'rs-builder-agent-server',
    version: VERSION,
    runtime: 'vercel-node',
    ...info,
    ...runtimeStatus(),
    runtimeKeys: runtime ? Object.keys(runtime) : [],
    serverTime: new Date().toISOString(),
    quotaNote: 'OpenRouter free tier: 50 req/day per account, resets 00:00 UTC; OpenCode Zen free tier is client-only since Oct 2026 (keyed = paid catalog).',
  })
}
