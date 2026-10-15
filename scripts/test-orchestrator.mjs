/**
 * Orchestrator tests with scripted OpenAI-compatible mock providers.
 * Proves: provider chain skipping (401/402/429 → next), anonymous
 * OpenCode-Zen-style provider (no auth header sent, live /models discovery),
 * daily-quota cooldowns, real tool side
 * effects (vm code exec, pptx/srt binaries, cookie-jar HTTP), SSRF guard and
 * the RSB_PROVIDERS=none deterministic fallback.
 */
import { createServer } from 'node:http'

let callCount = 0

function nextMove(messages) {
  const execFlags = messages.map((m) => m.role === 'user' && String(m.content).startsWith('Execute step'))
  const lastExecIdx = execFlags.lastIndexOf(true)
  const inStep = lastExecIdx >= 0 ? messages.slice(lastExecIdx + 1).filter((m) => m.role === 'tool').length : 0
  const hasPlan = messages.some((m) => m.role === 'assistant' && (m.tool_calls ?? []).some((c) => c.function.name === 'submit_plan'))
  const tc = (name, args) => [{ id: 'call_' + ++callCount, type: 'function', function: { name, arguments: JSON.stringify(args) } }]

  if (!hasPlan) {
    return {
      content: 'I will build this in two steps.',
      tool_calls: tc('submit_plan', {
        intro: 'Two steps: compute and package, then research and report.',
        steps: [
          { title: 'Compute and package the page', estimate: '1m' },
          { title: 'Research, deck, captions and session', estimate: '1m' },
        ],
      }),
    }
  }
  const step = execFlags.filter(Boolean).length || 1
  if (step === 1) {
    if (inStep === 0) return { content: null, tool_calls: tc('think', { text: 'Single portable HTML file, zero external requests.' }) }
    if (inStep === 1) return { content: null, tool_calls: tc('run_code', { note: 'verify totals', code: "const totals=[120,80,40]; console.log('2+2=', 2+2); console.log('sum=', totals.reduce((a,b)=>a+b,0)); totals.length" }) }
    if (inStep === 2) return { content: null, tool_calls: tc('write_file', { path: 'index.html', content: '<!doctype html><html><head><meta charset="utf-8"><title>Mock build</title></head><body><h1>Built by the orchestrator</h1></body></html>' }) }
    return { content: null, tool_calls: tc('step_done', { summary: 'page written and verified' }) }
  }
  if (inStep === 0) return { content: null, tool_calls: tc('search_web', { query: 'vite build tool' }) }
  if (inStep === 1) return { content: null, tool_calls: tc('make_slides', { title: 'Mock deck', file_name: 'deck.pptx', slides: [{ title: 'One', bullets: ['a', 'b'] }, { title: 'Two', bullets: ['c'] }] }) }
  if (inStep === 2) return { content: null, tool_calls: tc('make_captions', { file_name: 'captions.srt', lines: [{ from: 0, to: 2, text: 'hello' }, { from: 2, to: 4, text: 'world' }] }) }
  if (inStep === 3) return { content: null, tool_calls: tc('http_session', { actions: [{ method: 'GET', url: 'http://127.0.0.1:8797/portal' }] }) }
  return { content: null, tool_calls: tc('step_done', { summary: 'research, deck, captions and session done' }) }
}

function llmMockServer(port, { models, recordAuth } = {}) {
  let sawAuth = null
  const hits = {}
  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      if (req.method === 'GET' && req.url.endsWith('/models')) {
        res.setHeader('content-type', 'application/json')
        return res.end(JSON.stringify({ data: models.map((id) => ({ id })) }))
      }
      if (recordAuth) sawAuth = req.headers.authorization ?? null
      const payload = JSON.parse(body || '{}')
      hits[payload.model] = (hits[payload.model] ?? 0) + 1
      if (payload.model === 'broken-model') {
        res.statusCode = 402
        res.setHeader('content-type', 'application/json')
        return res.end(JSON.stringify({ error: { message: 'This request requires more credits' } }))
      }
      if (payload.model === 'dead-key-model') {
        res.statusCode = 401
        res.setHeader('content-type', 'application/json')
        return res.end(JSON.stringify({ error: { message: 'User not found.', code: 401 } }))
      }
      if (payload.model === 'quota-model') {
        res.statusCode = 429
        res.setHeader('content-type', 'application/json')
        res.setHeader('x-ratelimit-reset', String(Date.now() + 3600 * 1000))
        return res.end(JSON.stringify({ error: { message: 'Rate limit exceeded: free-models-per-day', code: 429 } }))
      }
      const move = nextMove(payload.messages ?? [])
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: move.content, tool_calls: move.tool_calls } }] }))
    })
  })
  return { server: server.listen(port), getSawAuth: () => sawAuth, hits }
}

const openRouterMock = llmMockServer(8798, { models: [] })
const zenMock = llmMockServer(8796, { models: ['nemotron-3-ultra-free', 'zen-paid-1'], recordAuth: true })
const site = createServer((req, res) => {
  res.setHeader('content-type', 'text/html')
  res.end('<html><head><title>Mock Portal</title></head><body>ok</body></html>')
}).listen(8797)

process.env.RSB_ALLOW_PRIVATE_HTTP = '1'

let ok = true
const check = (good, msg) => { console.log((good ? 'PASS' : 'FAIL') + '  ' + msg); if (!good) ok = false }
const collect = async (prompt, locale) => {
  const { runEvents } = await import('../server/engine.mjs')
  const events = []
  let model = null
  for await (const event of runEvents(prompt, locale)) {
    if (event.type === 'model') model = event.model
    events.push(event)
  }
  return { events, model }
}

/* --- A0: default provider set ---------------------------------------- */
process.env.OPENAI_API_KEY = 'test-key'
process.env.OPENAI_BASE_URL = 'http://127.0.0.1:8798/v1'
process.env.OPENAI_MODEL = ''
delete process.env.RSB_PROVIDERS
delete process.env.OPENCODE_API_KEY

const { engineInfo } = await import('../server/engine.mjs')
check(engineInfo().engine === 'llm', 'engine selects LLM when providers enabled → ' + JSON.stringify(engineInfo()))
check(JSON.stringify(engineInfo().providers) === '["openrouter"]', 'anonymous zen stays out of the default chain (Oct 2026 policy) → ' + JSON.stringify(engineInfo().providers))
process.env.OPENCODE_API_KEY = 'zen-key'
check(JSON.stringify(engineInfo().providers) === '["opencode-zen","openrouter"]', 'zen joins the default chain only with OPENCODE_API_KEY → ' + JSON.stringify(engineInfo().providers))
delete process.env.OPENCODE_API_KEY

/* --- A0b: per-request runtime keys (bring your own key) --------------- */
delete process.env.OPENAI_API_KEY
delete process.env.RSB_PROVIDERS
check(JSON.stringify(engineInfo().providers) === '[]' || engineInfo().engine === 'off', 'no env keys → engine off (no simulator anymore) → ' + JSON.stringify(engineInfo()))
check(JSON.stringify(engineInfo({ groq: 'gsk-test' }).providers) === '["groq"]', 'runtime key enables a provider without any env → ' + JSON.stringify(engineInfo({ groq: 'gsk-test' }).providers))
const rtEntries = await (await import('../server/orchestrator.mjs')).providerEntries(null, { groq: 'gsk-test' })
check(rtEntries.length === 3 && rtEntries.every((e) => e.key === 'gsk-test'), 'runtime key flows into the provider chain → ' + rtEntries.length + ' groq models')
check((await import('../server/orchestrator.mjs')).parseRuntimeKeys('{"openrouter":"sk-x","junk":1,"groq":7}') !== null, 'parseRuntimeKeys accepts a mixed header and drops junk')
check((await import('../server/orchestrator.mjs')).parseRuntimeKeys('not-json') === null, 'parseRuntimeKeys rejects garbage')
process.env.OPENAI_API_KEY = 'test-key'

/* --- A: openrouter chain skips dead-key (401) and 402 models ---------- */
process.env.RSB_PROVIDERS = 'openrouter'
process.env.RSB_LLM_MODEL_CHAIN = 'dead-key-model, broken-model, mock-model'

const { events, model } = await collect('Build a small page and a report', 'en')
const types = events.map((e) => e.type)
const plan = events.find((e) => e.type === 'plan')
const consoleLines = events.filter((e) => e.type === 'console').map((e) => e.line)
const files = events.filter((e) => e.type === 'file').map((e) => e.file.path)
const artifact = events.find((e) => e.type === 'artifact')?.artifact

check(model === 'openrouter/mock-model', 'chain skips the 401 and 402 models and continues on the next → ' + model)
check(types[0] === 'run_start' && types.at(-1) === 'done', 'run_start … done sequence (' + events.length + ' events)')
check(plan?.steps?.length === 2, 'plan streamed from the mock LLM (2 steps)')
check(consoleLines.some((l) => l.includes('2+2= 4')) && consoleLines.some((l) => l.includes('sum= 240')), 'run_code really executed in the vm sandbox → ' + JSON.stringify(consoleLines.slice(0, 3)))
check(files.includes('index.html') && files.includes('captions.srt'), 'workspace files written (html + srt) → ' + files.join(', '))
check(artifact?.html?.includes('<!doctype html'), 'artifact synthesized from the workspace html (' + (artifact?.html?.length ?? 0) + 'b)')

const downloads = artifact?.downloads ?? []
const pptx = downloads.find((d) => d.name === 'deck.pptx')
const srt = downloads.find((d) => d.name === 'captions.srt')
check(Boolean(pptx) && Buffer.from(pptx.base64, 'base64').slice(0, 2).toString() === 'PK', 'make_slides produced a real .pptx (PK magic) in artifact downloads')
check(Boolean(srt) && Buffer.from(srt.base64, 'base64').toString().includes('-->'), 'make_captions produced a real .srt in artifact downloads')
let searchOk = events.some((e) => e.type === 'console' && e.line.startsWith('hit ·'))
if (!searchOk) {
  // live duckduckgo occasionally rate-limits CI egress: one retry before failing
  const retry = await collect('Build a small page and a report', 'en')
  searchOk = retry.events.some((e) => e.type === 'console' && e.line.startsWith('hit ·'))
}
check(searchOk, 'search_web returned live results into the console trace')
check(events.some((e) => e.type === 'browse' && /Mock Portal/.test(e.page.title)), 'http_session drove a real cookie-jar request')

/* --- B: anonymous OpenCode-Zen-style provider ------------------------ */
delete process.env.OPENAI_API_KEY
delete process.env.RSB_LLM_MODEL_CHAIN
process.env.RSB_PROVIDERS = 'opencode-zen'
process.env.RSB_ZEN_BASE_URL = 'http://127.0.0.1:8796/v1'

const zen = await collect('One welcome screen', 'en')
check(zen.model === 'opencode-zen/nemotron-3-ultra-free', 'zen catalog discovered live and used anonymously → ' + zen.model)
check(zenMock.getSawAuth() === null, 'no Authorization header sent for anonymous zen calls')
check(zen.events.some((e) => e.type === 'plan'), 'zen run produced a plan')

/* --- B2: keyed Zen serves the paid catalog ---------------------------- */
process.env.OPENCODE_API_KEY = 'zen-key'
const keyedZen = await collect('One welcome screen', 'en')
check(keyedZen.model === 'opencode-zen/zen-paid-1', 'keyed zen offers the paid catalog, not the client-only free tier → ' + keyedZen.model)
check(zenMock.getSawAuth() === 'Bearer zen-key', 'keyed zen sends the Authorization header → ' + zenMock.getSawAuth())
delete process.env.OPENCODE_API_KEY

/* --- C: guards -------------------------------------------------------- */
const { executeWebFetch, executeCode } = await import('../server/orchestrator.mjs')
const blocked = await executeWebFetch({ url: 'http://127.0.0.1:9/secret' })
check(blocked.ok === false && /blocked/.test(blocked.text), 'web_fetch blocks private networks → ' + blocked.text)
check((await executeWebFetch({ url: 'file:///etc/passwd' })).ok === false, 'web_fetch rejects non-http schemes')
const threw = executeCode({ code: 'throw new Error("boom")' })
check(threw.ok === false && threw.text.includes('boom'), 'run_code surfaces sandbox errors')

/* --- D: daily-quota cooldown ------------------------------------------ */
const { providerEntries, __resetProviderCooldowns } = await import('../server/orchestrator.mjs')
process.env.RSB_PROVIDERS = 'openrouter'
process.env.RSB_LLM_MODEL_CHAIN = 'quota-model, mock-model'
let quotaError = null
try {
  await collect('One more welcome screen', 'en')
} catch (error) {
  quotaError = error
}
check(openRouterMock.hits['quota-model'] === 1, 'daily-429 model probed exactly once per run → hits=' + openRouterMock.hits['quota-model'])
check(Boolean(quotaError) && /429|Rate limit/i.test(String(quotaError.message)), 'account-level 429 fails the run honestly (no silent simulator) → ' + String(quotaError?.message).slice(0, 60))
let entriesNow = await providerEntries()
check(entriesNow.length === 0, 'provider cooled down after account-level daily 429 → entries=' + entriesNow.length)
__resetProviderCooldowns()
entriesNow = await providerEntries()
check(entriesNow.length === 2, 'cooldown reset restores the chain → entries=' + entriesNow.length)

/* --- E: no providers = honest failure (there is no simulator anymore) ---- */
process.env.RSB_PROVIDERS = 'none'
check(engineInfo().engine === 'off', 'RSB_PROVIDERS=none → engine off → ' + engineInfo().engine)
let honestError = null
try {
  const { runEvents } = await import('../server/engine.mjs')
  for await (const e of runEvents('anything', 'en')) void e
} catch (error) {
  honestError = error
}
check(Boolean(honestError) && /no LLM provider/i.test(String(honestError.message)), 'runEvents throws honestly without providers → ' + honestError?.message)

openRouterMock.server.close()
zenMock.server.close()
site.close()

/* --- F: v2 checkpoints — resume on a fresh invocation ------------------ */
const cpMock = llmMockServer(8898, { models: [] })
process.env.RSB_PROVIDERS = 'openrouter'
process.env.OPENAI_API_KEY = 'test-key'
process.env.OPENAI_BASE_URL = 'http://127.0.0.1:8898/v1'
process.env.OPENAI_MODEL = ''
delete process.env.RSB_LLM_MODEL_CHAIN
const { runOrchestrated } = await import('../server/orchestrator.mjs')

const cps = []
const ac = new AbortController()
const run1 = []
for await (const event of runOrchestrated('Checkpoint probe: page and deck', 'en', ac.signal, { onCheckpoint: (snap) => cps.push(snap) })) {
  run1.push(event)
  if (event.type === 'step_done') ac.abort() // simulate the worker hand-off at the step boundary
}
const captured = cps.find((c) => c.phase === 'steps' && c.stepIndex === 1)
check(captured?.v === 2 && captured.stepIndex === 1, 'checkpoint captured at the step boundary → stepIndex ' + captured?.stepIndex)
check((captured?.files ?? []).some(([p]) => p === 'index.html'), 'checkpoint carries the workspace files → ' + (captured?.files ?? []).map(([p]) => p).join(','))

let captured2 = null
const run2 = []
for await (const event of runOrchestrated('Checkpoint probe: page and deck', 'en', undefined, { checkpoint: captured, onCheckpoint: (snap) => (captured2 = snap) })) {
  run2.push(event)
}
const t2 = run2.map((e) => e.type)
const resumeMsg = run2.find((e) => e.type === 'message' && /fresh worker invocation/i.test(e.text?.en ?? ''))
check(Boolean(resumeMsg), 'resume announces the hand-off → ' + String(resumeMsg?.text?.en).slice(0, 48))
check(run2[0]?.type !== 'run_start' || !run2.some((e, i) => i > 0 && e.type === 'run_start'), 'resumed run does not reset the UI with a second run_start')
check(t2.filter((x) => x === 'step_start').length === 1, 'resumed run executes only the remaining step → step_start x' + t2.filter((x) => x === 'step_start').length)
check(!t2.includes('plan'), 'resumed run does not re-stream the plan')
check(!run2.some((e) => e.type === 'tool' && /running sandboxed code|Writing index\.html/.test(String(e.tool?.detail?.en ?? ''))), 'resumed run does not redo step-1 tool calls')
check(t2.at(-1) === 'done' && t2.includes('artifact'), 'resumed run finishes with an artifact')
check((captured2?.files ?? []).some(([p]) => p === 'index.html'), 'files survived the resume into the next checkpoint → ' + (captured2?.files ?? []).map(([p]) => p).slice(0, 4).join(','))
check((captured2?.binaries ?? []).some(([n]) => n === 'deck.pptx'), 'binaries serialize through the checkpoint (base64) → ' + (captured2?.binaries ?? []).map(([n]) => n).join(','))
cpMock.server.close()

console.log(ok ? '\nORCHESTRATOR OK' : '\nORCHESTRATOR FAILED')
process.exit(ok ? 0 : 1)
