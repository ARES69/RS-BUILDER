/**
 * Mints a capped OpenRouter inference key from a management key and pushes it
 * (plus base url / model) into Vercel production env via the API.
 * Secrets never touch stdout or the filesystem.
 *
 * Env: OR_MGMT_KEY (OpenRouter management key), VERCEL_TOKEN
 */
const OR = process.env.OR_MGMT_KEY
const VC = process.env.VERCEL_TOKEN
const PROJECT = 'rs-builder'
const MODEL = process.env.OR_MODEL || 'openai/gpt-4o-mini'

const orH = { Authorization: 'Bearer ' + OR, 'content-type': 'application/json' }
const vcH = { Authorization: 'Bearer ' + VC, 'content-type': 'application/json' }

// 1) mint a capped inference key
const created = await fetch('https://openrouter.ai/api/v1/keys', {
  method: 'POST',
  headers: orH,
  body: JSON.stringify({ name: 'rs-builder-prod', limit: 5 }),
})
const cj = await created.json()
const plain = cj.key
if (!plain) {
  console.error('OpenRouter did not return a plaintext key:', JSON.stringify(cj).slice(0, 200))
  process.exit(1)
}
console.log('minted inference key:', cj.data.label, '| spend limit: $' + cj.data.limit)

// 2) prove it can run inference
const probe = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + plain, 'content-type': 'application/json' },
  body: JSON.stringify({ model: MODEL, max_tokens: 8, messages: [{ role: 'user', content: 'Reply with one word: ready' }] }),
})
const pj = await probe.json().catch(() => ({}))
if (!probe.ok) {
  console.error('inference probe failed:', probe.status, JSON.stringify(pj).slice(0, 200))
  process.exit(1)
}
console.log('inference probe ok:', MODEL, '→', JSON.stringify(pj.choices?.[0]?.message?.content).slice(0, 60))

// 3) (re)set Vercel production env
const wanted = [
  ['OPENAI_API_KEY', plain],
  ['OPENAI_BASE_URL', 'https://openrouter.ai/api/v1'],
  ['OPENAI_MODEL', MODEL],
]
const existing = await fetch(`https://api.vercel.com/v9/projects/${PROJECT}/env`, { headers: vcH }).then((r) => r.json())
for (const [key] of wanted) {
  for (const env of (existing.envs ?? []).filter((e) => e.key === key && (e.target ?? []).includes('production'))) {
    await fetch(`https://api.vercel.com/v9/projects/${PROJECT}/env/${env.id}`, { method: 'DELETE', headers: vcH })
    console.log('removed stale env:', key)
  }
}
for (const [key, value] of wanted) {
  const r = await fetch(`https://api.vercel.com/v9/projects/${PROJECT}/env`, {
    method: 'POST',
    headers: vcH,
    body: JSON.stringify({ key, value, target: ['production'], type: 'encrypted' }),
  })
  console.log('set env:', key, '→', r.status)
}
console.log('DONE — redeploy required for the functions to pick the env up')
