/**
 * Contract test: boots server/agent-server.mjs, consumes the SSE stream with
 * plain fetch and asserts the event sequence the UI depends on.
 */
import { spawn } from 'node:child_process'

const PORT = 8799
const BASE = 'http://127.0.0.1:' + PORT
const child = spawn(process.execPath, ['server/agent-server.mjs'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' })

const wait = (ms) => new Promise((r) => setTimeout(r, ms))
let ok = true
const fail = (msg) => { ok = false; console.log('FAIL  ' + msg) }
const pass = (msg) => console.log('PASS  ' + msg)

try {
  await wait(900)

  const health = await fetch(BASE + '/v1/health')
  const healthJson = await health.json()
  health.ok && healthJson.ok ? pass('GET /v1/health → ' + JSON.stringify(healthJson)) : fail('health endpoint')

  for (const [label, prompt, locale, expectKind] of [
    ['site run (en)', 'Build a landing page for a coffee subscription', 'en', 'html'],
    ['research run (ru)', 'Исследование рынка ИИ-инструментов в ЕС', 'ru', 'report'],
  ]) {
    const response = await fetch(BASE + '/v1/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt, locale }),
    })
    if (!response.ok || !response.body) { fail(label + ': bad response ' + response.status); continue }

    const events = []
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let i
      while ((i = buffer.indexOf('\n\n')) >= 0) {
        const chunk = buffer.slice(0, i)
        buffer = buffer.slice(i + 2)
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data:')) events.push(JSON.parse(line.slice(5)))
        }
      }
    }

    const types = events.map((e) => e.type)
    const has = (t) => types.includes(t)
    const first = types[0]
    const last = types[types.length - 1]
    const artifact = events.find((e) => e.type === 'artifact')?.artifact
    const planSteps = events.find((e) => e.type === 'plan')?.steps?.length ?? 0
    const ruText = locale === 'ru' ? events.find((e) => e.type === 'thought')?.text?.ru?.length > 0 : true

    const good =
      first === 'run_start' && last === 'done' && has('plan') && has('step_start') && has('thought') &&
      has('tool') && has('progress') && has('step_done') && has('artifact') && has('delivered') &&
      planSteps >= 4 && artifact?.html?.includes('<!doctype html>') && artifact?.kind === expectKind && ruText

    good
      ? pass(label + ': ' + events.length + ' events · ' + planSteps + ' steps · artifact=' + artifact.kind + ' ' + (artifact.html.length + 'b'))
      : fail(label + ': sequence/types wrong → ' + types.join(','))
  }

  // abort mid-stream: the body reader must reject, not hang
  const controller = new AbortController()
  const response = await fetch(BASE + '/v1/runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'make a game', locale: 'en' }),
    signal: controller.signal,
  })
  const reader = response.body.getReader()
  await reader.read() // first chunk arrives
  controller.abort()
  let closed = false
  try {
    for (let i = 0; i < 5 && !closed; i++) {
      const chunk = await reader.read()
      closed = chunk.done === true
    }
  } catch {
    closed = true // AbortError — exactly what the client expects
  }
  closed ? pass('abort: stream closed on cancel') : fail('abort: stream kept flowing after cancel')
} catch (error) {
  fail('unexpected: ' + error.message)
} finally {
  child.kill()
}

console.log(ok ? '\nBACKEND CONTRACT OK' : '\nBACKEND CONTRACT FAILED')
process.exit(ok ? 0 : 1)
