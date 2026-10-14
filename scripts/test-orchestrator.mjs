/**
 * Orchestrator tests with scripted OpenAI-compatible mock providers.
 * Proves: provider chain skipping (402 → next), anonymous OpenCode-Zen-style
 * provider (no auth header sent, live /models discovery), real tool side
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
      if (payload.model === 'broken-model') {
        res.statusCode = 402
        res.setHeader('content-type', 'application/json')
        return res.end(JSON.stringify({ error: { message: 'This request requires more credits' } }))
      }
      const move = nextMove(payload.messages ?? [])
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: move.content, tool_calls: move.tool_calls } }] }))
    })
  })
  return { server: server.listen(port), getSawAuth: () => sawAuth }
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

/* --- A: openrouter chain skips the 402 model ------------------------- */
process.env.OPENAI_API_KEY = 'test-key'
process.env.OPENAI_BASE_URL = 'http://127.0.0.1:8798/v1'
process.env.OPENAI_MODEL = ''
process.env.RSB_PROVIDERS = 'openrouter'
process.env.RSB_LLM_MODEL_CHAIN = 'broken-model, mock-model'

const { engineInfo } = await import('../server/engine.mjs')
check(engineInfo().engine === 'llm', 'engine selects LLM when providers enabled → ' + JSON.stringify(engineInfo()))

const { events, model } = await collect('Build a small page and a report', 'en')
const types = events.map((e) => e.type)
const plan = events.find((e) => e.type === 'plan')
const consoleLines = events.filter((e) => e.type === 'console').map((e) => e.line)
const files = events.filter((e) => e.type === 'file').map((e) => e.file.path)
const artifact = events.find((e) => e.type === 'artifact')?.artifact

check(model === 'openrouter/mock-model', 'chain skips the 402 model and continues on the next → ' + model)
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
check(events.some((e) => e.type === 'console' && e.line.startsWith('hit ·')), 'search_web returned live results into the console trace')
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

/* --- C: guards -------------------------------------------------------- */
const { executeWebFetch, executeCode } = await import('../server/orchestrator.mjs')
const blocked = await executeWebFetch({ url: 'http://127.0.0.1:9/secret' })
check(blocked.ok === false && /blocked/.test(blocked.text), 'web_fetch blocks private networks → ' + blocked.text)
check((await executeWebFetch({ url: 'file:///etc/passwd' })).ok === false, 'web_fetch rejects non-http schemes')
const threw = executeCode({ code: 'throw new Error("boom")' })
check(threw.ok === false && threw.text.includes('boom'), 'run_code surfaces sandbox errors')

/* --- D: deterministic fallback --------------------------------------- */
process.env.RSB_PROVIDERS = 'none'
check(engineInfo().engine === 'deterministic', 'RSB_PROVIDERS=none → deterministic engine')

openRouterMock.server.close()
zenMock.server.close()
site.close()
console.log(ok ? '\nORCHESTRATOR OK' : '\nORCHESTRATOR FAILED')
process.exit(ok ? 0 : 1)
