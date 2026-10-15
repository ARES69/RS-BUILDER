/**
 * Exercises the Vercel functions locally with mock req/res objects —
 * proves api/runs.mjs streams the same contract as the standalone server,
 * without needing a Vercel account.
 */
import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'

/* Mock LLM: drives the REAL orchestrator loop (there is no simulator anymore). */
let mockCalls = 0
const mockLlm = createServer((req, res) => {
  let body = ''
  req.on('data', (c) => (body += c))
  req.on('end', () => {
    if (req.method === 'GET' && req.url.endsWith('/models')) {
      res.setHeader('content-type', 'application/json')
      return res.end(JSON.stringify({ data: [] }))
    }
    const payload = JSON.parse(body || '{}')
    const msgs = payload.messages ?? []
    const execIdx = msgs.map((m) => m.role === 'user' && String(m.content).startsWith('Execute step')).lastIndexOf(true)
    const hasPlan = msgs.some((m) => m.role === 'assistant' && (m.tool_calls ?? []).some((c) => c.function.name === 'submit_plan'))
    const inStep = execIdx >= 0 ? msgs.slice(execIdx + 1).filter((m) => m.role === 'tool').length : 0
    const tc = (name, args) => [{ id: 'mc_' + ++mockCalls, type: 'function', function: { name, arguments: JSON.stringify(args) } }]
    let move
    if (!hasPlan) {
      move = { content: 'Two quick steps.', tool_calls: tc('submit_plan', { intro: 'Mock plan intro', steps: [{ title: 'Build page' }, { title: 'Verify' }] }) }
    } else if (execIdx < 0 || /Execute step 1/.test(String(msgs[execIdx].content))) {
      if (inStep === 0) move = { content: null, tool_calls: tc('think', { text: 'Writing a compact page' }) }
      else if (inStep === 1) move = { content: null, tool_calls: tc('write_file', { path: 'index.html', content: '<!doctype html><html><head><title>Mock</title></head><body><h1>Mock built page</h1></body></html>' }) }
      else move = { content: null, tool_calls: tc('step_done', { summary: 'page written' }) }
    } else {
      if (inStep === 0) move = { content: null, tool_calls: tc('think', { text: 'Final check' }) }
      else move = { content: null, tool_calls: tc('step_done', { summary: 'verified' }) }
    }
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ choices: [{ message: { role: 'assistant', content: move.content, tool_calls: move.tool_calls } }] }))
  })
}).listen(8899)

process.env.RSB_PROVIDERS = 'openrouter'
process.env.OPENAI_API_KEY = 'mock-key'
process.env.OPENAI_BASE_URL = 'http://127.0.0.1:8899/v1'
process.env.OPENAI_MODEL = ''
process.env.RSB_LLM_MODEL_CHAIN = 'mock-model'

import handler from '../api/v1/runs.mjs'
import healthHandler from '../api/v1/health.mjs'
import statusHandler from '../api/v1/status.mjs'

function mockRes() {
  const res = new EventEmitter()
  res.statusCode = null
  res.headers = {}
  res.chunks = []
  res.setHeader = (k, v) => (res.headers[k.toLowerCase()] = v)
  res.status = (code) => ((res.statusCode = code), res)
  res.json = (obj) => { res.chunks.push(JSON.stringify(obj)); res.finished = true; return res }
  res.write = (c) => { res.chunks.push(c); return true }
  res.end = () => { res.finished = true; res.emit('finish') }
  res.flushHeaders = () => {}
  return res
}

function mockReq(method, body, extra = {}) {
  const req = new EventEmitter()
  req.method = method
  req.headers = { 'content-type': 'application/json', ...(extra.headers || {}) }
  req.query = extra.query || {}
  process.nextTick(() => {
    if (body) req.emit('data', JSON.stringify(body))
    req.emit('end')
  })
  return req
}

const waitFinish = (res, timeout = 60000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout)
    const check = setInterval(() => {
      if (res.finished) { clearInterval(check); clearTimeout(timer); resolve() }
    }, 50)
  })

let ok = true
const report = (good, msg) => { console.log((good ? 'PASS  ' : 'FAIL  ') + msg); if (!good) ok = false }

// health
{
  const res = mockRes()
  healthHandler(mockReq('GET'), res)
  const json = JSON.parse(res.chunks.join(''))
  report(res.statusCode === 200 && json.ok === true, 'GET /api/v1/health → ' + JSON.stringify(json))
}

// runs
{
  const res = mockRes()
  const req = mockReq('POST', { prompt: 'Собери лендинг для кофейни', locale: 'ru' })
  await handler(req, res)
  await waitFinish(res)
  const stream = res.chunks.join('')
  const events = stream.split('\n\n').flatMap((c) => c.split('\n').filter((l) => l.startsWith('data:')).map((l) => JSON.parse(l.slice(5))))
  const types = events.map((e) => e.type)
  const good =
    res.headers['content-type']?.includes('text/event-stream') &&
    types[0] === 'run_start' && types.at(-1) === 'done' &&
    types.includes('plan') && types.includes('artifact') &&
    events.find((e) => e.type === 'thought')?.text?.ru?.length > 0
  report(good, 'POST /api/v1/runs → ' + events.length + ' SSE events, ru locale, artifact=' + (events.find((e) => e.type === 'artifact')?.artifact?.kind))
}

// status
{
  const res = mockRes()
  const req = mockReq('GET')
  req.headers['x-rsb-keys'] = JSON.stringify({ groq: 'gsk-test' })
  statusHandler(req, res)
  const json = JSON.parse(res.chunks.join(''))
  report(
    res.statusCode === 200 && json.ok === true && json.runtimeKeys.join(',') === 'groq' && json.engine === 'llm' && 'cooldowns' in json && 'catalogs' in json,
    'GET /api/v1/status echoes runtime keys and exposes cooldowns/catalogs → runtimeKeys=' + json.runtimeKeys,
  )
}

// wrong method
{
  const res = mockRes()
  await handler(mockReq('GET'), res)
  report(res.statusCode === 405, 'GET /api/v1/runs → 405')
}

/* --- queued runs: job lifecycle on the fs store ------------------------ */
process.env.RSB_JOB_DIR = mkdtempSync(join(tmpdir(), 'rsb-jobs-test-'))
process.env.RSB_PROVIDERS = 'openrouter' // the mock LLM drives queued runs too
const { getJob, putJob } = await import('../server/jobstore.mjs')
const workerHandler = (await import('../api/v1/worker.mjs')).default
const jobHandler = (await import('../api/v1/job.mjs')).default
const snapshotHandler = (req, res) => jobHandler(Object.assign(req, { query: { ...req.query } }), res)
const streamHandler = (req, res) => jobHandler(Object.assign(req, { query: { ...req.query, stream: '1' } }), res)
const cancelHandler = (req, res) => jobHandler(Object.assign(req, { method: 'POST', query: { ...req.query } }), res)
const reapHandler = (await import('../api/v1/reap.mjs')).default

let jobId = null
{
  const res = mockRes()
  await handler(mockReq('POST', { prompt: 'Один экран приветствия', locale: 'ru', mode: 'queue' }), res)
  const json = JSON.parse(res.chunks.join(''))
  jobId = json.jobId
  report(res.statusCode === 202 && Boolean(json.jobId) && json.streamUrl.includes(json.jobId), 'POST /runs mode=queue → 202 + job urls → ' + json.jobId)
}
{
  const job = await getJob(jobId)
  const res = mockRes()
  await snapshotHandler(mockReq('GET', null, { query: { id: jobId } }), res)
  const json = JSON.parse(res.chunks.join(''))
  report(res.statusCode === 200 && json.status === 'queued' && !('kickToken' in json) && job.kickToken.length === 32, 'GET /runs/:id snapshot hides the kick token')
}
{
  const job = await getJob(jobId)
  const res = mockRes()
  await workerHandler(mockReq('POST', { jobId, kickToken: job.kickToken }), res)
  const done = await getJob(jobId)
  const types = done.events.map((e) => e.type)
  report(done.status === 'done' && types[0] === 'run_start' && types.at(-1) === 'done' && types.includes('artifact'), 'worker drains the engine into the job log → ' + done.events.length + ' events, status ' + done.status + (done.error ? ' ERROR: ' + done.error : ''))
}
{
  const res = mockRes()
  await streamHandler(mockReq('GET', null, { query: { id: jobId, cursor: '0' } }), res)
  const stream = res.chunks.join('')
  const events = stream.split('\n\n').flatMap((c) => c.split('\n').filter((l) => l.startsWith('data:')).map((l) => JSON.parse(l.slice(5))))
  report(events.at(-1).type === 'job_end' && events.at(-1).status === 'done' && events.length > 5, 'stream tail replays the log and ends with job_end → ' + events.length + ' frames')
}
{
  const res = mockRes()
  await handler(mockReq('POST', { prompt: 'second job', locale: 'en', mode: 'queue' }), res)
  const second = JSON.parse(res.chunks.join('')).jobId
  const cres = mockRes()
  await cancelHandler(mockReq('POST', null, { query: { id: second } }), cres)
  const cancelled = JSON.parse(cres.chunks.join(''))
  const wres = mockRes()
  await workerHandler(mockReq('POST', { jobId: second, kickToken: (await getJob(second)).kickToken }), wres)
  const after = await getJob(second)
  report(cancelled.status === 'cancelled' && after.status === 'cancelled', 'cancel wins the race against the worker → ' + after.status)
}
{
  const res = mockRes()
  await handler(mockReq('POST', { prompt: 'stale job', locale: 'en', mode: 'queue' }), res)
  const stale = JSON.parse(res.chunks.join('')).jobId
  // age the job document behind the store's back (putJob re-stamps updatedAt)
  const file = join(process.env.RSB_JOB_DIR, 'rsb-jobs__' + stale + '.json')
  const aged = JSON.parse(readFileSync(file, 'utf8'))
  aged.updatedAt = Date.now() - 5 * 60_000
  writeFileSync(file, JSON.stringify(aged))
  process.env.CRON_SECRET = 'test-secret'
  const rres = mockRes()
  await reapHandler(mockReq('GET', null, { headers: { authorization: 'Bearer test-secret' } }), rres)
  const rep = JSON.parse(rres.chunks.join(''))
  report(rep.reaped.some((r) => r.id === stale && r.action === 're-kicked'), 'reaper re-kicks a stale queued job → ' + JSON.stringify(rep.reaped))
}

/* --- accounts + persistent history ------------------------------------ */
process.env.RSB_SESSION_SECRET = 'test-secret-' + Date.now()
const authHandler = (await import('../api/v1/auth.mjs')).default
const signupHandler = (req, res) => authHandler(Object.assign(req, { query: { action: 'signup' } }), res)
const loginHandler = (req, res) => authHandler(Object.assign(req, { query: { action: 'login' } }), res)
const meHandler = (req, res) => authHandler(Object.assign(req, { query: { action: 'me' } }), res)
const historyRunHandlerBase = (await import('../api/v1/history.mjs')).default
const historyHandler = (req, res) => historyRunHandlerBase(Object.assign(req, { query: {} }), res)
const historyRunHandler = (req, res) => historyRunHandlerBase(req, res)

const email = 'tester+' + Date.now() + '@rs-builder.app'
let cookie = null
let recoveryCodes = null
{
  const res = mockRes()
  await signupHandler(mockReq('POST', { email, password: 'supersecret1' }), res)
  cookie = res.headers['set-cookie']
  recoveryCodes = JSON.parse(res.chunks.join('')).recoveryCodes
  report(res.statusCode === 201 && Boolean(cookie) && res.chunks.join('').includes(email), 'POST /auth/signup → 201 + session cookie')
}
{
  report(Array.isArray(recoveryCodes) && recoveryCodes.length === 3 && /^([a-f0-9]{4}-){2}[a-f0-9]{4}$/.test(recoveryCodes[0]), 'signup issues 3 one-time recovery codes → ' + JSON.stringify(recoveryCodes))
  const resetReq = (body) => authHandler(Object.assign(mockReq('POST', body), { query: { action: 'reset' } }), )
  let r = mockRes()
  await authHandler(Object.assign(mockReq('POST', { email, code: '0000-0000-0000', password: 'newpass123' }), { query: { action: 'reset' } }), r)
  report(r.statusCode === 401, 'reset with a wrong code → 401')
  r = mockRes()
  await authHandler(Object.assign(mockReq('POST', { email, code: recoveryCodes[0], password: 'newpass123' }), { query: { action: 'reset' } }), r)
  report(r.statusCode === 200, 'reset with a valid code → 200')
  r = mockRes()
  await loginHandler(mockReq('POST', { email, password: 'newpass123' }), r)
  report(r.statusCode === 200, 'login works with the new password')
  r = mockRes()
  await authHandler(Object.assign(mockReq('POST', { email, code: recoveryCodes[0], password: 'another123' }), { query: { action: 'reset' } }), r)
  report(r.statusCode === 401, 'the same recovery code cannot be reused → 401')
}
{
  const rlEmail = 'rl+' + Date.now() + '@rs-builder.app'
  let last = null
  for (let i = 0; i < 7; i++) {
    last = mockRes()
    await loginHandler(mockReq('POST', { email: rlEmail, password: 'nope12345' }), last)
  }
  // per-ip bucket is shared ('unknown' in mocks): stay under loginPerIp elsewhere
  report(last.statusCode === 429, '7th login attempt in the 10-min window → 429 (got ' + last.statusCode + ')')
}
{
  const res = mockRes()
  await signupHandler(mockReq('POST', { email, password: 'supersecret1' }), res)
  report(res.statusCode === 409, 'duplicate signup → 409')
}
{
  const res = mockRes()
  await loginHandler(mockReq('POST', { email, password: 'wrongpass1' }), res)
  report(res.statusCode === 401, 'wrong password → 401')
}
{
  const res = mockRes()
  await meHandler(mockReq('GET', null, { headers: { cookie } }), res)
  const json = JSON.parse(res.chunks.join(''))
  report(res.statusCode === 200 && json.user.email === email, 'GET /auth/me with cookie → the signed-in user')
}
{
  const res = mockRes()
  await handler(mockReq('POST', { prompt: 'Исторический запуск', locale: 'ru', mode: 'queue' }, { headers: { cookie } }), res)
  const json = JSON.parse(res.chunks.join(''))
  const job = await getJob(json.jobId)
  report(Boolean(job.ownerId), 'queued run is bound to the signed-in owner → ' + job.ownerId)
  const wres = mockRes()
  await workerHandler(mockReq('POST', { jobId: json.jobId, kickToken: job.kickToken }), wres)
  const hres = mockRes()
  await historyHandler(mockReq('GET', null, { headers: { cookie } }), hres)
  const hist = JSON.parse(hres.chunks.join(''))
  report(hist.runs.length === 1 && hist.runs[0].jobId === json.jobId && hist.runs[0].status === 'done', 'finished run lands in /history → ' + hist.runs.length + ' entry(ies)')
  const rres = mockRes()
  await historyRunHandler(mockReq('GET', null, { headers: { cookie }, query: { id: json.jobId } }), rres)
  const run = JSON.parse(rres.chunks.join(''))
  report(Array.isArray(run.events) && run.events.length > 5 && !('kickToken' in run), 'GET /historyrun replays the full own run log (' + run.events.length + ' events)')
  const anon = mockRes()
  await historyHandler(mockReq('GET'), anon)
  report(anon.statusCode === 401, 'history without session → 401')
}

/* --- credits: grant, metering, gating ---------------------------------- */
const creditsHandler = (await import('../api/v1/credits.mjs')).default
const { addLedgerEntry } = await import('../server/credits.mjs')
let balanceBefore = null
{
  const res = mockRes()
  await meHandler(mockReq('GET', null, { headers: { cookie } }), res)
  const me = JSON.parse(res.chunks.join(''))
  balanceBefore = me.user.credits
  const cres = mockRes()
  await creditsHandler(mockReq('GET', null, { headers: { cookie } }), cres)
  const led = JSON.parse(cres.chunks.join(''))
  report(led.entries.some((e) => e.delta === 500 && e.reason === 'signup-grant'), 'signup grant of 500 credits is in the ledger')
}
{
  const res = mockRes()
  await handler(mockReq('POST', { prompt: 'Кредитный прогон', locale: 'ru', mode: 'queue' }, { headers: { cookie } }), res)
  const cid = JSON.parse(res.chunks.join('')).jobId
  const cjob = await getJob(cid)
  await workerHandler(mockReq('POST', { jobId: cid, kickToken: cjob.kickToken }), res)
  const done = await getJob(cid)
  const spent = [...done.events].reverse().find((e) => e.type === 'progress')?.credits ?? 0
  const cres = mockRes()
  await creditsHandler(mockReq('GET', null, { headers: { cookie } }), cres)
  const led = JSON.parse(cres.chunks.join(''))
  report(led.balance === balanceBefore - spent && led.entries.some((e) => e.reason.startsWith('run:')), 'finished run debited its engine credits → ' + balanceBefore + ' − ' + spent + ' = ' + led.balance)
}
{
  const uid = (JSON.parse((() => { const r = mockRes(); return r.chunks.join('') })() || '{}') || {}).id
  const meRes = mockRes()
  await meHandler(mockReq('GET', null, { headers: { cookie } }), meRes)
  const userId = JSON.parse(meRes.chunks.join('')).user.id
  await addLedgerEntry(userId, -100000, 'test-drain')
  const gres = mockRes()
  await handler(mockReq('POST', { prompt: 'Запуск без кредитов', locale: 'ru', mode: 'queue' }, { headers: { cookie } }), gres)
  report(gres.statusCode === 402, 'queued run with an empty balance → 402 (got ' + gres.statusCode + ')')
  await addLedgerEntry(userId, 200000, 'test-topup') // refill for the sections below
}

/* --- hosted artifacts: publish, versions, continue-lineage ------------- */
process.env.RSB_ARTIFACT_DIR = join(process.env.RSB_JOB_DIR, 'artifacts')
const { getManifest } = await import('../server/artifacts.mjs')
const artifactsHandler = (await import('../api/v1/artifacts.mjs')).default
{
  const parent = await getJob(jobId)
  report(Boolean(parent.artifactMeta?.pageUrl?.startsWith('fs://')) && parent.artifactMeta.version === 1, 'finished run published its artifact with a permanent url → v' + parent.artifactMeta?.version)
  const manifest = await getManifest(jobId)
  report(manifest?.versions?.length === 1, 'lineage manifest opened with v1')
}
{
  const res = mockRes()
  await handler(mockReq('POST', { prompt: 'Улучши страницу: добавь футер', locale: 'ru', mode: 'queue', parentJobId: jobId }, { headers: { cookie } }), res)
  const childId = JSON.parse(res.chunks.join('')).jobId
  const child = await getJob(childId)
  report(child.lineageRoot === jobId && Boolean(child.seedFiles?.['index.html']), 'continue-run inherits lineage root and seeded workspace → ' + Object.keys(child.seedFiles || {}).join(','))
  const wres = mockRes()
  await workerHandler(mockReq('POST', { jobId: childId, kickToken: child.kickToken }), wres)
  const doneChild = await getJob(childId)
  const manifest = await getManifest(jobId)
  report(doneChild.artifactMeta?.version === 2 && manifest.versions.length === 2, 'child artifact registered as v2 of the same lineage → ' + manifest.versions.length + ' versions')
  const ares = mockRes()
  await artifactsHandler(mockReq('GET', null, { headers: { cookie } }), ares)
  const list = JSON.parse(ares.chunks.join(''))
  report(list.artifacts.length >= 2 && list.artifacts.some((a) => a.root === jobId && a.version === 2), 'GET /artifacts lists hosted artifacts with versions → ' + list.artifacts.length)
  const mres = mockRes()
  await artifactsHandler(mockReq('GET', null, { headers: { cookie }, query: { root: jobId } }), mres)
  report(mres.statusCode === 200 && JSON.parse(mres.chunks.join('')).versions.length === 2, 'GET /artifacts?root= returns the manifest (ownership-checked)')
  const anon = mockRes()
  await artifactsHandler(mockReq('GET', null, { query: { root: jobId } }), anon)
  report(anon.statusCode === 401, 'manifest without session → 401')
}

mockLlm.close()
console.log(ok ? '\nVERCEL FUNCTIONS CONTRACT OK' : '\nVERCEL FUNCTIONS CONTRACT FAILED')
process.exit(ok ? 0 : 1)
