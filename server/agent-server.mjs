#!/usr/bin/env node
/**
 * Standalone RS-BUILDER agent backend (zero dependencies).
 * Thin HTTP/SSE wrapper around server/engine.mjs (LLM orchestrator with a
 * deterministic fallback). See server/orchestrator.mjs for the wire contract.
 */
import { createServer } from 'node:http'
import { runEvents, VERSION, engineInfo, runtimeStatus } from './engine.mjs'
import { parseRuntimeKeys, sandboxStatus } from './orchestrator.mjs'
import { sanitizeSeedFiles } from './sandbox.mjs'

const PORT = Number(process.env.PORT ?? 8787)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, x-rsb-keys',
}

const send = (res, event) => res.write('data: ' + JSON.stringify(event) + '\n\n')

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors)
    return res.end()
  }
  if (req.method === 'GET' && url.pathname === '/v1/health') {
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, name: 'rs-builder-agent-server', version: VERSION, ...engineInfo() }))
  }
  if (req.method === 'GET' && url.pathname === '/v1/status') {
    const runtime = parseRuntimeKeys(req.headers['x-rsb-keys'])
    res.writeHead(200, { ...cors, 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({
      ok: true, name: 'rs-builder-agent-server', version: VERSION, runtime: 'node-standalone',
      ...engineInfo(runtime), ...runtimeStatus(),
      runtimeKeys: runtime ? Object.keys(runtime) : [],
      sandbox: sandboxStatus(),
      capabilities: (() => {
        const sb = sandboxStatus()
        return [
          ...(sb.mode === 'real' ? ['sandbox:fs', 'sandbox:node'] : []),
          ...(sb.mode === 'real' && sb.shell ? ['sandbox:shell'] : []),
          ...(sb.mode === 'real' && sb.npm ? ['sandbox:npm'] : []),
        ]
      })(),
      serverTime: new Date().toISOString(),
    }))
  }
  if (req.method === 'POST' && url.pathname === '/v1/runs') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', async () => {
      let payload = {}
      try { payload = JSON.parse(body || '{}') } catch { /* defaults */ }
      res.writeHead(200, {
        ...cors,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      })
      res.write(': rs-builder agent stream\n\n')
      try {
        const runtime = {
          ...(parseRuntimeKeys(req.headers['x-rsb-keys']) ?? {}),
          seedFiles: sanitizeSeedFiles(payload.files) ?? undefined,
        }
        for await (const event of runEvents(payload.prompt, payload.locale, req.signal, runtime)) {
          if (req.signal?.aborted) break
          send(res, event)
        }
      } catch (error) {
        send(res, { type: 'error', message: String(error?.message ?? error) })
      }
      res.end()
    })
    return
  }

  res.writeHead(404, { ...cors, 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found', routes: ['GET /v1/health', 'GET /v1/status', 'POST /v1/runs'] }))
})

server.listen(PORT, () => {
  console.log('RS-BUILDER agent server listening on http://localhost:' + PORT)
  console.log('Wire the UI with:  VITE_AGENT_API_URL=http://localhost:' + PORT + ' npm run dev')
  console.log('Production on Vercel uses the same-origin /api functions instead (see DEPLOY.md).')
})
