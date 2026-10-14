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
const snapshotHandler = (await import('../api/v1/job.mjs')).default
const streamHandler = (await import('../api/v1/jobstream.mjs')).default
const cancelHandler = (await import('../api/v1/jobcancel.mjs')).default
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
  const file = join(process.env.RSB_JOB_DIR, stale + '.json')
  const aged = JSON.parse(readFileSync(file, 'utf8'))
  aged.updatedAt = Date.now() - 5 * 60_000
  writeFileSync(file, JSON.stringify(aged))
  process.env.CRON_SECRET = 'test-secret'
  const rres = mockRes()
  await reapHandler(mockReq('GET', null, { headers: { authorization: 'Bearer test-secret' } }), rres)
  const rep = JSON.parse(rres.chunks.join(''))
  report(rep.reaped.some((r) => r.id === stale && r.action === 're-kicked'), 'reaper re-kicks a stale queued job → ' + JSON.stringify(rep.reaped))
}

console.log(ok ? '\nVERCEL FUNCTIONS CONTRACT OK' : '\nVERCEL FUNCTIONS CONTRACT FAILED')
process.exit(ok ? 0 : 1)
