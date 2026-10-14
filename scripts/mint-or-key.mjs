/** Mints a capped OpenRouter inference key into /tmp (0600), cleaning stale ones. */
import { writeFileSync, chmodSync } from 'node:fs'
const OR = process.env.OR_MGMT_KEY
const H = { Authorization: 'Bearer ' + OR, 'content-type': 'application/json' }

const listed = await fetch('https://openrouter.ai/api/v1/keys', { headers: H }).then((r) => r.json())
for (const k of (listed.data ?? []).filter((k) => k.name?.startsWith('rs-builder-prod') && k.usage === 0 && !k.disabled)) {
  const del = await fetch('https://openrouter.ai/api/v1/keys/' + k.hash, { method: 'DELETE', headers: H })
  console.log('deleted stale unused key:', k.label, del.status)
}

const created = await fetch('https://openrouter.ai/api/v1/keys', {
  method: 'POST', headers: H,
  body: JSON.stringify({ name: 'rs-builder-prod', limit: 5 }),
})
const cj = await created.json()
if (!cj.key) { console.error('no plaintext key in response'); process.exit(1) }
writeFileSync('/tmp/rsb-or-key', cj.key)
chmodSync('/tmp/rsb-or-key', 0o600)

const probe = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + cj.key, 'content-type': 'application/json' },
  body: JSON.stringify({ model: 'openai/gpt-4o-mini', max_tokens: 6, messages: [{ role: 'user', content: 'one word: ready' }] }),
})
console.log('minted', cj.data.label, '| limit $' + cj.data.limit, '| probe', probe.status)
process.exit(probe.ok ? 0 : 1)
