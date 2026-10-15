/**
 * Exercises the Vercel functions locally with mock req/res objects —
 * proves api/runs.mjs streams the same contract as the standalone server,
 * without needing a Vercel account.
 */
import { EventEmitter } from 'node:events'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
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
    res.statusCode === 200 && json.ok === true && json.runtimeKeys.join(',') === 'groq' && json.engine === 'llm' && json.providers.join(',') === 'groq' && 'cooldowns' in json && 'catalogs' in json,
    'GET /api/v1/status echoes runtime keys and exposes cooldowns/catalogs → ' + JSON.stringify(json).slice(0, 160),
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
process.env.RSB_PROVIDERS = 'none'
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
  report(done.status === 'done' && types[0] === 'run_start' && types.at(-1) === 'done' && types.includes('artifact'), 'worker drains the engine into the job log → ' + done.events.length + ' events, status ' + done.status)
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
{
  const res = mockRes()
  await signupHandler(mockReq('POST', { email, password: 'supersecret1' }), res)
  cookie = res.headers['set-cookie']
  report(res.statusCode === 201 && Boolean(cookie) && res.chunks.join('').includes(email), 'POST /auth/signup → 201 + session cookie')
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

console.log(ok ? '\nVERCEL FUNCTIONS CONTRACT OK' : '\nVERCEL FUNCTIONS CONTRACT FAILED')
process.exit(ok ? 0 : 1)
