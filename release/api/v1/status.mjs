/**
 * Vercel serverless function: GET /api/v1/status
 * Live introspection for the workspace settings panel: which engine and
 * providers are active right now, which are cooling down (daily quotas),
 * which model catalogs are cached. No secrets are ever exposed.
 */
import { engineInfo, runtimeStatus, VERSION } from '../../server/engine.mjs'
import { parseRuntimeKeys, sandboxStatus, providerNotes } from '../../server/orchestrator.mjs'
import { jobStoreKind, probeJobStore } from '../../server/jobstore.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed, use GET' })
    return
  }
  const runtime = parseRuntimeKeys(req.headers['x-rsb-keys'])
  const info = engineInfo(runtime)
  // what the execution sandbox can really do on THIS runtime (probed, cached)
  const sandbox = sandboxStatus()
  // canary: the queue capability is advertised only when the store WRITES
  const queue = await probeJobStore().catch((error) => ({
    kind: jobStoreKind(),
    ok: false,
    error: String(error?.message ?? error).slice(0, 240),
  }))
  res.status(200).json({
    sandbox,
    queue,
    providerNotes: providerNotes(),
    ok: true,
    name: 'rs-builder-agent-server',
    version: VERSION,
    runtime: 'vercel-node',
    ...info,
    ...runtimeStatus(),
    runtimeKeys: runtime ? Object.keys(runtime) : [],
    jobStore: jobStoreKind(),
    capabilities: [
      ...(queue.ok ? ['queue'] : []),
      ...(sandbox.mode === 'real' ? ['sandbox:fs', 'sandbox:node'] : []),
      ...(sandbox.mode === 'real' && sandbox.shell ? ['sandbox:shell'] : []),
      ...(sandbox.mode === 'real' && sandbox.npm ? ['sandbox:npm'] : []),
    ],
    serverTime: new Date().toISOString(),
    quotaNote: 'OpenRouter free tier: 50 req/day per account, resets 00:00 UTC; OpenCode Zen free tier is client-only since Oct 2026 (keyed = paid catalog).',
  })
}
