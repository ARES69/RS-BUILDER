/**
 * Exercises the Vercel functions locally with mock req/res objects —
 * proves api/runs.mjs streams the same contract as the standalone server,
 * without needing a Vercel account.
 */
import { EventEmitter } from 'node:events'
import handler from '../api/v1/runs.mjs'
import healthHandler from '../api/v1/health.mjs'

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

function mockReq(method, body) {
  const req = new EventEmitter()
  req.method = method
  req.headers = { 'content-type': 'application/json' }
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

// wrong method
{
  const res = mockRes()
  await handler(mockReq('GET'), res)
  report(res.statusCode === 405, 'GET /api/v1/runs → 405')
}

console.log(ok ? '\nVERCEL FUNCTIONS CONTRACT OK' : '\nVERCEL FUNCTIONS CONTRACT FAILED')
process.exit(ok ? 0 : 1)
