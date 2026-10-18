/**
 * Minimal Upstash Redis REST client (no TCP, no SDK quirks).
 *
 * Wire contract (public Upstash REST API): POST <rest-url>/pipeline with a JSON
 * array of command arrays; response is a JSON array of {result, error}. We do
 * NOT send the Upstash-Encoding header, so string results come back as plain
 * JSON strings — no base64 decode dance, no surprises for binary payloads
 * (artifacts are stored as explicit base64 strings by the caller).
 */
const creds = () => {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.RSB_REDIS_URL || null
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.RSB_REDIS_TOKEN || null
  return url && token ? { url: url.replace(/\/$/, ''), token } : null
}

export const upstashConfigured = () => Boolean(creds())

async function exec(commands, { timeoutMs = 10_000 } = {}) {
  const c = creds()
  if (!c) throw new Error('upstash redis is not configured')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(c.url + '/pipeline', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + c.token },
      body: JSON.stringify(commands),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error('upstash HTTP ' + response.status)
    const body = await response.json()
    const list = Array.isArray(body) ? body : [body]
    return list.map((entry, i) => {
      if (entry?.error) throw new Error('upstash ' + commands[i]?.[0] + ': ' + entry.error)
      return entry?.result ?? null
    })
  } finally {
    clearTimeout(timer)
  }
}

const one = async (command) => (await exec([command]))[0]

export const up = {
  set: (key, value) => one(['set', String(key), String(value)]),
  get: (key) => one(['get', String(key)]),
  del: (key) => one(['del', String(key)]),
  sadd: (key, member) => one(['sadd', String(key), String(member)]),
  smembers: (key) => one(['smembers', String(key)]),
  ping: () => one(['ping']),
}
