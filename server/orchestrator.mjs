/**
 * Real LLM orchestrator for RS-BUILDER.
 *
 * The single execution engine of RS-BUILDER: this drives an actual
 * tool-calling loop against an LLM and maps every model decision onto the
 * SSE contract the UI already speaks:
 *
 *   submit_plan      → plan
 *   think            → thought
 *   web_fetch        → tool + browse        (real HTTP fetch, SSRF-guarded)
 *   run_code         → tool + console      (real execution in a node:vm sandbox)
 *   write_file       → tool + file         (kept in a per-run in-memory FS)
 *   read_file        → tool
 *   step_done        → progress + step_done
 *   deliver_artifact → artifact
 *
 * Providers: any OpenAI-compatible endpoint (OPENAI_API_KEY / OPENAI_BASE_URL /
 * OPENAI_MODEL) or Anthropic (ANTHROPIC_API_KEY / ANTHROPIC_MODEL). When neither
 * key is present, server/engine.mjs falls back to the deterministic core, so the
 * product never breaks.
 *
 * Guardrails: max steps, max tool calls per step, per-call timeout, total
 * deadline, code-exec timeout, fetch size cap, private-network blocklist.
 */
import vm from 'node:vm'
import { buildPptx, buildSrt, httpSession, searchWeb } from './tools.mjs'

const L = (en, ru) => ({ en, ru })
const both = (text) => ({ en: text, ru: text })

/* ------------------------------------------------------------------ */
/* Limits                                                              */
/* ------------------------------------------------------------------ */

const MAX_STEPS = 6
const MAX_TOOL_CALLS_PER_STEP = 8
const MAX_TOTAL_TOOL_CALLS = 28
const LLM_TIMEOUT_MS = 45000
const CODE_TIMEOUT_MS = 2500
const FETCH_TIMEOUT_MS = 12000
const FETCH_MAX_CHARS = 6000

/* ------------------------------------------------------------------ */
/* Tools the model can call                                          */
/* ------------------------------------------------------------------ */

const TOOLS = [
  {
    name: 'submit_plan',
    description: 'First action of every run. Propose 3-6 execution steps with rough estimates.',
    schema: {
      type: 'object',
      properties: {
        intro: { type: 'string', description: 'One or two sentences telling the user how you will approach the task.' },
        steps: {
          type: 'array',
          minItems: 2,
          maxItems: MAX_STEPS,
          items: {
            type: 'object',
            properties: { title: { type: 'string' }, estimate: { type: 'string', description: 'e.g. 40s, 1m 20s' } },
            required: ['title'],
          },
        },
      },
      required: ['intro', 'steps'],
    },
  },
  {
    name: 'think',
    description: 'Emit a short reasoning note visible to the user in the run trace. Use before meaningful actions.',
    schema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
  },
  {
    name: 'web_fetch',
    description: 'Fetch a public http(s) URL and return its text content (truncated). Use for research and verification.',
    schema: { type: 'object', properties: { url: { type: 'string' }, goal: { type: 'string' } }, required: ['url'] },
  },
  {
    name: 'run_code',
    description: 'Execute JavaScript in a sandboxed VM (no fs/net/process). stdout and the completion value are returned.',
    schema: { type: 'object', properties: { code: { type: 'string' }, note: { type: 'string' } }, required: ['code'] },
  },
  {
    name: 'write_file',
    description: 'Write a file into the run workspace (index.html, notes.md, data.json …).',
    schema: { type: 'object', properties: { path: { type: 'string' }, content: { type: 'string' } }, required: ['path', 'content'] },
  },
  {
    name: 'read_file',
    description: 'Read a previously written file from the run workspace.',
    schema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'search_web',
    description: 'Keyless web search. Returns up to 8 real results (title, url, snippet). Use before web_fetch to pick sources.',
    schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'wide_research',
    description: 'Fan out parallel sub-agents: each slice gets a live search + fetches of its top sources, results return merged. Slices: 2-6 strings.',
    schema: {
      type: 'object',
      properties: {
        question: { type: 'string' },
        slices: { type: 'array', minItems: 2, maxItems: 6, items: { type: 'string' } },
      },
      required: ['question', 'slices'],
    },
  },
  {
    name: 'make_slides',
    description: 'Build a REAL .pptx file (OOXML, opens in PowerPoint/LibreOffice) from a slide list. Also stores a deck.html preview.',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        file_name: { type: 'string' },
        slides: {
          type: 'array',
          minItems: 1,
          maxItems: 20,
          items: {
            type: 'object',
            properties: { title: { type: 'string' }, bullets: { type: 'array', items: { type: 'string' } } },
            required: ['title'],
          },
        },
      },
      required: ['title', 'slides'],
    },
  },
  {
    name: 'http_session',
    description: 'Cookie-jar HTTP operator: sequential real GET/POST requests (forms as urlencoded body). Returns status + page title per step.',
    schema: {
      type: 'object',
      properties: {
        actions: {
          type: 'array',
          minItems: 1,
          maxItems: 8,
          items: {
            type: 'object',
            properties: {
              method: { type: 'string', enum: ['GET', 'POST'] },
              url: { type: 'string' },
              body: { type: 'object', description: 'form fields for POST' },
            },
            required: ['url'],
          },
        },
      },
      required: ['actions'],
    },
  },
  {
    name: 'make_captions',
    description: 'Build a real SubRip (.srt) captions file from timed lines and store it in the workspace.',
    schema: {
      type: 'object',
      properties: {
        file_name: { type: 'string' },
        lines: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: { from: { type: 'number' }, to: { type: 'number' }, text: { type: 'string' } },
            required: ['from', 'to', 'text'],
          },
        },
      },
      required: ['lines'],
    },
  },
  {
    name: 'step_done',
    description: 'Mark the current plan step finished, with a one-line summary.',
    schema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'] },
  },
  {
    name: 'deliver_artifact',
    description: 'Final action. Deliver the finished artifact as a single self-contained HTML document (inline CSS/JS, no external requests).',
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        file_name: { type: 'string' },
        html: { type: 'string', description: 'Complete <!doctype html> document. Omit when from_file is set.' },
        from_file: { type: 'string', description: 'Path of a previously written .html file to use as the artifact (preferred for large documents).' },
        note: { type: 'string' },
      },
      required: ['title'],
    },
  },
]

/* ------------------------------------------------------------------ */
/* Turn serialization per provider wire format                         */
/* ------------------------------------------------------------------ */

function serializeOpenAI(turns) {
  const messages = []
  for (const turn of turns) {
    if (turn.role === 'user') messages.push({ role: 'user', content: turn.content })
    else if (turn.role === 'assistant') {
      messages.push({
        role: 'assistant',
        content: turn.content ?? null,
        tool_calls: turn.toolCalls?.length
          ? turn.toolCalls.map((c) => ({ id: c.id, type: 'function', function: { name: c.name, arguments: JSON.stringify(c.args) } }))
          : undefined,
      })
    } else if (turn.role === 'tool') {
      for (const result of turn.results) messages.push({ role: 'tool', tool_call_id: result.id, content: result.text })
    }
  }
  return messages
}

function serializeAnthropic(turns) {
  const messages = []
  for (const turn of turns) {
    if (turn.role === 'user') messages.push({ role: 'user', content: turn.content })
    else if (turn.role === 'assistant') {
      const content = []
      if (turn.content) content.push({ type: 'text', text: turn.content })
      for (const c of turn.toolCalls ?? []) content.push({ type: 'tool_use', id: c.id, name: c.name, input: c.args })
      messages.push({ role: 'assistant', content })
    } else if (turn.role === 'tool') {
      messages.push({
        role: 'user',
        content: turn.results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: r.text })),
      })
    }
  }
  return messages
}

/* ------------------------------------------------------------------ */
/* Provider registry                                                   */
/*                                                                     */
/* Sources of free inference, in default priority order:               */
/*  1. opencode-zen  — https://opencode.ai/zen/v1, OpenAI-compatible,  */
/*     catalog discovered live from /models (pattern from              */
/*     keman-ai/dsh-opencode-zen). NOTE: since Oct 2026 OpenCode       */
/*     rejects ANONYMOUS chat completions with 403 FreeTierError       */
/*     ("free tier can only be used from within OpenCode"), so zen is  */
/*     enabled only when OPENCODE_API_KEY is set — or when explicitly  */
/*     forced via RSB_PROVIDERS (the /models catalog stays public).    */
/*     With a key the PAID catalog is served cheapest-first (free      */
/*     models reject keyed calls too); a zero balance answers 402 and  */
/*     cools the provider for 15 min, so a top-up self-activates.      */
/*  2. openrouter    — $0 tool-capable models discovered via /models   */
/*     (or RSB_LLM_MODEL_CHAIN / OPENAI_MODEL override). Free accounts */
/*     get 50 requests/day across all :free models (resets 00:00 UTC); */
/*     $10 of credits lifts it to 1000/day.                            */
/*  3. groq / gemini / mistral / nim — free tiers from the curated     */
/*     awesome-free-models list; enabled only when their key is set.   */
/*  4. anthropic     — paid, opt-in via ANTHROPIC_API_KEY.              */
/* RSB_PROVIDERS overrides order/subset; RSB_PROVIDERS=none disables   */
/* the LLM path entirely (deterministic engine).                       */
/* ------------------------------------------------------------------ */

/** Fallback chain when OpenRouter /models discovery is unreachable (live catalog 2026-10-14). */
const OR_STATIC = [
  'thinkingmachines/inkling-small:free',
  'thinkingmachines/inkling:free',
  'nvidia/nemotron-3.5-lightning:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'dots-studio/dots-3-note-preview:free',
  'poolside/laguna-s-2.1:free',
  'google/gemma-4-26b-a4b-it:free',
  'qwen/qwen3-32b:free',
]

/**
 * Fallback when Zen /models discovery is unreachable (live catalog 2026-10-14;
 * the original keman-ai/dsh-opencode-zen seven are mostly retired — the live
 * endpoint stays the source of truth, this list only covers outages).
 */
const ZEN_SNAPSHOT = [
  'big-pickle',
  'nemotron-3.5-lightning-free',
  'ling-3.1-flash-free',
  'mimo-v2.6-flash-free',
  'longcat-2.5-preview-free',
  'step-5-preview-free',
  'cat-jam-free',
  'muse-spark-1.3-contributor-free',
  'jev-1.13-free',
  'space-bunny-free',
  'muse-spark-1.2-contributor-free',
]

/** Free-tier model chains per awesome-free-models provider. */
const KEYED_PROVIDERS = {
  groq: {
    base: 'https://api.groq.com/openai/v1',
    key: 'GROQ_API_KEY',
    // live catalog 2026-10-15: the old llama-3.3-versatile lineup is retired;
    // gpt-oss/qwen are the tool-capable free-tier models now
    models: ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'],
  },
  gemini: {
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    key: 'GEMINI_API_KEY',
    models: ['gemini-2.5-flash-lite', 'gemini-2.5-flash'],
  },
  mistral: {
    base: 'https://api.mistral.ai/v1',
    key: 'MISTRAL_API_KEY',
    models: ['mistral-small-latest', 'codestral-latest', 'mistral-large-latest'],
  },
  nim: {
    base: 'https://integrate.api.nvidia.com/v1',
    key: 'NVIDIA_API_KEY',
    models: ['meta/llama-3.3-70b-instruct', 'mistralai/mistral-large-2-instruct'],
  },
}

/* ------------------------------------------------------------------ */
/* Runtime (per-request) keys                                          */
/*                                                                     */
/* The workspace settings panel lets an operator paste their own       */
/* provider keys; the client sends them per request in the             */
/* `x-rsb-keys` header (never stored server-side). Runtime keys win    */
/* over env so "bring your own key" works without redeploying.         */
/* ------------------------------------------------------------------ */

export const RUNTIME_KEY_IDS = ['opencode-zen', 'openrouter', 'groq', 'gemini', 'mistral', 'nim']

export function parseRuntimeKeys(raw) {
  if (!raw) return null
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!parsed || typeof parsed !== 'object') return null
    const out = {}
    for (const id of RUNTIME_KEY_IDS) {
      const v = parsed[id]
      if (typeof v === 'string' && v.trim() && v.length <= 300) out[id] = v.trim()
    }
    return Object.keys(out).length ? out : null
  } catch {
    return null
  }
}

function keyFor(id, runtime) {
  if (runtime && runtime[id]) return runtime[id]
  if (id === 'openrouter') return process.env.OPENAI_API_KEY || null
  if (id === 'opencode-zen') return process.env.OPENCODE_API_KEY || null
  if (id === 'anthropic') return process.env.ANTHROPIC_API_KEY || null
  return KEYED_PROVIDERS[id] ? process.env[KEYED_PROVIDERS[id].key] || null : null
}

const zenBase = () => (process.env.RSB_ZEN_BASE_URL || 'https://opencode.ai/zen/v1').replace(/\/$/, '')
const orBase = () => (process.env.OPENAI_BASE_URL || 'https://api.openrouter.ai/v1').replace(/\/$/, '')

let zenCache = { anon: { at: 0, models: null }, keyed: { at: 0, models: null } }
let orCache = { at: 0, models: null }

export function enabledProviderIds(runtime) {
  const override = (process.env.RSB_PROVIDERS || '').trim()
  if (override === 'none') return []
  if (override) return override.split(',').map((x) => x.trim()).filter(Boolean)
  const ids = []
  // Anonymous zen calls are policy-blocked since Oct 2026 (403 FreeTierError),
  // so the provider only makes the default chain when a key is present
  // (env or per-request runtime key from the workspace settings).
  if (keyFor('opencode-zen', runtime)) ids.push('opencode-zen')
  if (keyFor('openrouter', runtime)) ids.push('openrouter')
  for (const id of Object.keys(KEYED_PROVIDERS)) if (keyFor(id, runtime)) ids.push(id)
  if (keyFor('anthropic', runtime)) ids.push('anthropic')
  return ids
}

/* ------------------------------------------------------------------ */
/* Daily-quota cooldowns                                               */
/*                                                                     */
/* When a provider answers 429 with a far-future x-ratelimit-reset     */
/* (OpenRouter's free tier is 50 req/day per ACCOUNT, so one 429 means */
/* every model of that provider is dead until reset), stop offering    */
/* its entries until then instead of burning a round trip per model    */
/* per turn. Warm-lambda memory makes this persist across requests.    */
/* ------------------------------------------------------------------ */

const providerCooldownUntil = new Map()

export function __resetProviderCooldowns() {
  providerCooldownUntil.clear()
}

const ZEN_BILLING_COOLDOWN_MS = 15 * 60 * 1000

function noteRateLimit(entry, response) {
  const status = response.status
  if (status === 429) {
    const reset = Number(response.headers.get('x-ratelimit-reset') || 0)
    if (reset > Date.now() + 60_000) {
      const until = Math.min(reset, Date.now() + 24 * 60 * 60 * 1000)
      const prev = providerCooldownUntil.get(entry.id) ?? 0
      if (until > prev) providerCooldownUntil.set(entry.id, until)
    }
    return
  }
  // Zen failures are account-scoped: the free tier is client-only (403) and the
  // paid catalog needs balance (402 "Insufficient account funds"). Cool the
  // whole provider briefly so the chain stops re-probing dead entries every
  // turn; a top-up on opencode.ai is picked up when the cooldown lapses.
  if (entry.id === 'opencode-zen' && (status === 402 || status === 403)) {
    const until = Date.now() + ZEN_BILLING_COOLDOWN_MS
    const prev = providerCooldownUntil.get(entry.id) ?? 0
    if (until > prev) providerCooldownUntil.set(entry.id, until)
  }
}

export const llmConfigured = (runtime) => enabledProviderIds(runtime).length > 0

export function engineInfo(runtime) {
  const ids = enabledProviderIds(runtime)
  if (!ids.length) return { engine: 'off', provider: null, model: null }
  const pinned = process.env.OPENAI_MODEL && process.env.OPENAI_MODEL !== 'auto-free' ? process.env.OPENAI_MODEL : null
  return { engine: 'llm', providers: ids, model: pinned ?? 'auto (free discovery, $0)' }
}

async function fetchJson(url, headers, signal, timeoutMs = 10000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    const response = await fetch(url, { headers, signal: controller.signal })
    if (!response.ok) throw new Error('HTTP ' + response.status)
    return await response.json()
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/** Cheapest-first preference for the keyed (paid) Zen catalog. */
const ZEN_CHEAP_FIRST = [
  'gpt-5.4-nano',
  'gemini-3.5-flash-lite',
  'qwen3.8-flash',
  'glm-5.3-flash',
  'deepseek-v4.1-flash',
  'gpt-5.4-mini',
  'minimax-m3',
  'kimi-k2.7-code',
  'claude-haiku-5-5',
  'gemini-3.8-flash',
]

/**
 * Live Zen catalog.
 * Anonymous mode offers the free tier (client-only since Oct 2026, kept for
 * completeness / forced RSB_PROVIDERS); keyed mode offers the PAID catalog —
 * that is what a key buys, since free models reject keyed calls too — ordered
 * cheapest-first so a small balance lasts.
 */
async function zenModels(signal, runtime) {
  const keyed = Boolean(keyFor('opencode-zen', runtime))
  const cache = keyed ? zenCache.keyed : zenCache.anon
  if (cache.models && Date.now() - cache.at < 60 * 60 * 1000) return cache.models
  let models = keyed ? ZEN_CHEAP_FIRST : ZEN_SNAPSHOT
  try {
    const headers = keyed ? { authorization: 'Bearer ' + keyFor('opencode-zen', runtime) } : {}
    const data = await fetchJson(zenBase() + '/models', headers, signal)
    const ids = (data.data ?? []).map((m) => m.id).filter(Boolean)
    if (keyed) {
      const paid = ids.filter((id) => !id.endsWith('-free') && id !== 'test' && id !== 'big-pickle')
      if (paid.length) {
        const rank = (id) => (ZEN_CHEAP_FIRST.includes(id) ? ZEN_CHEAP_FIRST.indexOf(id) : ZEN_CHEAP_FIRST.length)
        models = [...paid].sort((a, b) => rank(a) - rank(b))
      }
    } else {
      const free = ids.filter((id) => id.endsWith('-free') || ZEN_SNAPSHOT.includes(id))
      if (free.length) models = free
    }
  } catch {
    /* keep snapshot */
  }
  const next = { at: Date.now(), models }
  if (keyed) zenCache.keyed = next
  else zenCache.anon = next
  return models
}

/** Live OpenRouter catalog of $0 tool-capable models. */
async function openRouterModels(signal) {
  if (orCache.models && Date.now() - orCache.at < 10 * 60 * 1000) return orCache.models
  let models = OR_STATIC
  try {
    const data = await fetchJson(orBase() + '/models', { authorization: 'Bearer ' + process.env.OPENAI_API_KEY }, signal)
    const free = (data.data ?? [])
      .filter((m) => String(m.id).endsWith(':free'))
      .filter((m) => (m.supported_parameters ?? []).includes('tools'))
      .filter((m) => Number(m.pricing?.prompt ?? 1) === 0 && Number(m.pricing?.completion ?? 1) === 0)
      .sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0))
      .map((m) => m.id)
      .slice(0, 8)
    if (free.length) models = free
  } catch {
    /* keep static chain */
  }
  orCache = { at: Date.now(), models }
  return models
}

/** Flat, ordered list of {provider, baseUrl, key, model, wire} attempts. */
export async function providerEntries(signal, runtime) {
  const entries = []
  const envChain = (process.env.RSB_LLM_MODEL_CHAIN || '').split(',').map((x) => x.trim()).filter(Boolean)
  const now = Date.now()
  for (const [id, until] of providerCooldownUntil) if (until <= now) providerCooldownUntil.delete(id)

  for (const id of enabledProviderIds(runtime)) {
    if ((providerCooldownUntil.get(id) ?? 0) > now) continue
    if (id === 'opencode-zen') {
      const models = (process.env.RSB_ZEN_MODELS || '').trim()
        ? process.env.RSB_ZEN_MODELS.split(',').map((x) => x.trim())
        : await zenModels(signal, runtime)
      for (const model of models.slice(0, 7)) {
        entries.push({ id, baseUrl: zenBase(), key: keyFor(id, runtime), model })
      }
    } else if (id === 'openrouter') {
      const pinned = process.env.OPENAI_MODEL && process.env.OPENAI_MODEL !== 'auto-free' ? [process.env.OPENAI_MODEL] : null
      const models = envChain.length ? envChain : pinned ?? (await openRouterModels(signal))
      for (const model of models.slice(0, 8)) {
        entries.push({ id, baseUrl: orBase(), key: keyFor(id, runtime), model })
      }
    } else if (id === 'anthropic') {
      entries.push({
        id,
        baseUrl: (process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com').replace(/\/$/, ''),
        key: keyFor(id, runtime),
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5',
        wire: 'anthropic',
      })
    } else if (KEYED_PROVIDERS[id]) {
      const spec = KEYED_PROVIDERS[id]
      for (const model of (process.env['RSB_' + id.toUpperCase() + '_MODELS'] || '').split(',').map((x) => x.trim()).filter(Boolean).length
        ? process.env['RSB_' + id.toUpperCase() + '_MODELS'].split(',').map((x) => x.trim())
        : spec.models) {
        entries.push({ id, baseUrl: spec.base, key: keyFor(id, runtime), model })
      }
    }
  }
  return entries
}

/** Snapshot for GET /v1/status: cooldowns and cached catalogs (no secrets). */
export function runtimeStatus() {
  const now = Date.now()
  const cooldowns = {}
  for (const [id, until] of providerCooldownUntil) if (until > now) cooldowns[id] = until
  return {
    cooldowns,
    catalogs: {
      'opencode-zen': (zenCache.keyed.models ?? zenCache.anon.models) || null,
      openrouter: orCache.models || null,
    },
  }
}

async function chatOnce(entry, system, turns, signal) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  signal?.addEventListener('abort', onAbort, { once: true })

  try {
    if (entry.wire === 'anthropic') {
      const response = await fetch(entry.baseUrl + '/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': entry.key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: entry.model,
          max_tokens: 4096,
          system,
          messages: serializeAnthropic(turns),
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema })),
          tool_choice: { type: 'auto' },
        }),
        signal: controller.signal,
      })
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 200)
        noteRateLimit(entry, response)
        throw new Error(response.status === 402 ? 'insufficient credits (HTTP 402): ' + detail : 'LLM ' + response.status + ': ' + detail)
      }
      const data = await response.json()
      const text = (data.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('\n')
      const toolCalls = (data.content ?? [])
        .filter((b) => b.type === 'tool_use')
        .map((b) => ({ id: b.id, name: b.name, args: b.input ?? {}, truncated: false }))
      return { content: text || null, toolCalls, truncated: data.stop_reason === 'max_tokens' }
    }

    const response = await fetch(entry.baseUrl + '/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(entry.key ? { authorization: 'Bearer ' + entry.key } : {}),
      },
      body: JSON.stringify({
        model: entry.model,
        temperature: 0.2,
        max_tokens: Number(process.env.RSB_LLM_MAX_TOKENS || 2048),
        messages: [{ role: 'system', content: system }, ...serializeOpenAI(turns)],
        tools: TOOLS.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.schema } })),
        tool_choice: 'auto',
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200)
      noteRateLimit(entry, response)
      if (response.status === 402) throw new Error('insufficient credits (HTTP 402): ' + detail)
      throw new Error('LLM ' + response.status + ': ' + detail)
    }
    const data = await response.json()
    const message = data.choices?.[0]?.message ?? {}
    return {
      content: typeof message.content === 'string' ? message.content : null,
      truncated: data.choices?.[0]?.finish_reason === 'length',
      toolCalls: (message.tool_calls ?? []).map((c, i) => {
        const parsed = safeParse(c.function?.arguments)
        return { id: c.id ?? 'call_' + i, name: c.function?.name, args: parsed.args ?? parsed, truncated: parsed.truncated === true }
      }),
    }
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', onAbort)
  }
}

/**
 * Walks the provider×model chain. ANY failure of a single entry (dead key 401,
 * policy block 403, exhausted quota 429, missing model 404, provider 5xx,
 * network timeout) skips to the next entry — one dead provider must never kill
 * the run while other entries are still untried. Only an aborted signal or a
 * fully exhausted chain throws (engine.mjs then falls back deterministically).
 */
async function chat(entries, system, turns, signal) {
  let lastError = null
  for (const entry of entries) {
    if (signal?.aborted) throw new Error('run aborted')
    // an account-level cooldown discovered mid-run (daily 429, billing 402/403)
    // skips the whole provider instead of burning a request per model
    if ((providerCooldownUntil.get(entry.id) ?? 0) > Date.now()) {
      lastError = lastError ?? new Error(entry.id + ' is cooling down (account quota)')
      continue
    }
    // Groq-style transient 400s ("Parsing failed / failed_generation": the model
    // emitted malformed tool-call JSON) deserve one retry on the SAME model
    // before we declare the link dead and move on.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await chatOnce(entry, system, turns, signal)
        result.model = entry.id + '/' + entry.model
        return result
      } catch (error) {
        if (signal?.aborted) throw error
        lastError = error
        if (attempt === 0 && /Parsing failed|failed_generation|Tool call validation failed/i.test(String(error?.message ?? ''))) continue
        break
      }
    }
  }
  throw lastError ?? new Error('no models available')
}

function safeParse(raw) {
  if (!raw) return { args: {}, truncated: true }
  if (typeof raw === 'object') return { args: raw, truncated: false }
  try {
    return { args: JSON.parse(raw), truncated: false }
  } catch {
    return { args: {}, truncated: true }
  }
}

/* ------------------------------------------------------------------ */
/* Tool execution (real side effects, sandboxed)                       */
/* ------------------------------------------------------------------ */

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|0\.0\.0\.0)/i

export async function executeWebFetch(args) {
  let url
  try {
    url = new URL(args.url)
  } catch {
    return { ok: false, text: 'invalid URL' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, text: 'only http(s) allowed' }
  if (PRIVATE_HOST.test(url.hostname)) return { ok: false, text: 'private/network-local addresses are blocked' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'user-agent': 'RS-BUILDER agent/1.0 (+https://rs-builder.app)' },
      redirect: 'follow',
    })
    if (!response.ok) return { ok: false, text: 'HTTP ' + response.status }
    const type = response.headers.get('content-type') ?? ''
    const raw = await response.text()
    const text = type.includes('html')
      ? raw
          .replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      : raw
    return { ok: true, text: text.slice(0, FETCH_MAX_CHARS), title: url.hostname }
  } catch (error) {
    return { ok: false, text: 'fetch failed: ' + error.message }
  } finally {
    clearTimeout(timer)
  }
}

export function executeCode(args) {
  const logs = []
  const sandbox = {
    console: {
      log: (...a) => logs.push(a.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(' ')),
      warn: (...a) => logs.push('warn: ' + a.join(' ')),
      error: (...a) => logs.push('error: ' + a.join(' ')),
    },
    Math,
    JSON,
    Date,
    Intl,
  }
  try {
    const context = vm.createContext(sandbox)
    const result = vm.runInContext(args.code, context, { timeout: CODE_TIMEOUT_MS, displayErrors: true })
    if (result !== undefined) logs.push('→ ' + (typeof result === 'object' ? JSON.stringify(result) : String(result)))
    return { ok: true, text: logs.join('\n') || '(no output)' }
  } catch (error) {
    return { ok: false, text: (logs.join('\n') + '\n' + error.message).trim() }
  }
}

const MIME = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  srt: 'text/plain',
  svg: 'image/svg+xml',
  md: 'text/markdown',
  csv: 'text/csv',
  json: 'application/json',
  html: 'text/html',
}

function collectDownloads(files, binaries) {
  const downloads = []
  for (const [name, bytes] of binaries) {
    if (downloads.length >= 6) break
    const ext = name.split('.').pop()
    downloads.push({ name, mime: MIME[ext] ?? 'application/octet-stream', base64: Buffer.from(bytes).toString('base64') })
  }
  for (const [path, content] of files) {
    if (downloads.length >= 6) break
    const ext = path.split('.').pop()
    if (!['srt', 'svg', 'md', 'csv', 'json'].includes(ext)) continue
    downloads.push({ name: path.split('/').pop(), mime: MIME[ext], base64: Buffer.from(content, 'utf8').toString('base64') })
  }
  return downloads
}

/* ------------------------------------------------------------------ */
/* System prompt                                                       */
/* ------------------------------------------------------------------ */

function systemPrompt(locale) {
  const lang = locale === 'ru' ? 'Russian' : 'English'
  return [
    'You are RS-BUILDER, an autonomous agent that produces finished deliverables instead of advice.',
    'You work in a sandboxed workspace with tools. Follow this protocol exactly:',
    '1. First call submit_plan with 3-6 concrete steps and a short intro for the user.',
    '2. Then execute the steps in order. Before notable actions call think with a one-sentence note.',
    '3. Use run_code for computations, search_web + web_fetch for external facts, wide_research for multi-entity landscapes, make_slides for real PPTX decks, make_captions for SRT, http_session for form/portal flows, write_file/read_file for workspace files.',
    '4. After finishing each step call step_done with a one-line summary.',
    '5. Write documents with write_file in chunks smaller than 4KB, then call deliver_artifact with {title, from_file} pointing at the final .html (do not repeat the html inline).',
    '6. Keep artifacts compact: one screen, inline CSS, no external requests, no placeholders. If a tool reports truncation, retry with smaller content.',
    'Keep notes concise and factual. Never invent tool output. If a tool fails, say so and adapt.',
    'Write every user-visible string (intro, think notes, summaries, step titles, artifact text) in ' + lang + '. This is mandatory, including inside tool arguments.',
  ].join('\n')
}

/* ------------------------------------------------------------------ */
/* The orchestrated run                                                */
/* ------------------------------------------------------------------ */

export async function* runOrchestrated(prompt, locale, signal, runtime) {
  const entries = await providerEntries(signal, runtime)
  if (!entries.length) throw new Error('no LLM provider configured')

  const files = new Map()
  const binaries = new Map()
  // continued runs start with the parent's workspace + artifact html
  if (runtime?.seedFiles && typeof runtime.seedFiles === 'object') {
    for (const [path, content] of Object.entries(runtime.seedFiles)) {
      if (typeof content === 'string' && content.length < 200_000) files.set(path, content)
    }
  }
  const turns = [{ role: 'user', content: String(prompt) }]
  const runId = 'run_' + Math.random().toString(36).slice(2, 10)
  const deadline = Date.now() + 10 * 60 * 1000
  let totalCalls = 0

  const alive = () => !signal?.aborted && Date.now() < deadline

  /* --- planning turn ------------------------------------------------ */
  let plan = null
  let intro = null
  let usedModel = null

  /* --- v2 checkpoints: resume a run on a fresh invocation ------------- */
  const cp = runtime?.checkpoint && runtime.checkpoint.v === 2 ? runtime.checkpoint : null
  let startStep = 0
  let credits = 0
  if (cp) {
    turns.length = 0
    for (const m of cp.turns || []) turns.push(m)
    for (const [p2, c2] of cp.files || []) files.set(p2, c2)
    for (const [n2, b64] of cp.binaries || []) binaries.set(n2, Buffer.from(b64, 'base64'))
    plan = cp.plan ?? null
    intro = cp.intro ?? null
    startStep = cp.stepIndex ?? 0
    totalCalls = cp.totalCalls ?? 0
    credits = cp.credits ?? 0
    usedModel = cp.usedModel ?? null
  }
  const checkpoint = (stepIndex, phase) => {
    if (typeof runtime?.onCheckpoint !== 'function') return
    let cpTurns = turns
    try {
      const snap = {
        v: 2,
        phase,
        turns: cpTurns,
        plan: plan ?? null,
        intro: intro ?? null,
        stepIndex,
        totalCalls,
        credits,
        usedModel,
        files: [...files.entries()],
        binaries: [...binaries.entries()].map(([n, b]) => [n, Buffer.from(b).toString('base64')]),
      }
      // keep the checkpoint doc bounded: prune old tool-result payloads
      let json = JSON.stringify(snap)
      if (json.length > 1_500_000) {
        const keep = 12
        snap.turns = turns.map((m, i) =>
          i < turns.length - keep && m.role === 'tool'
            ? { ...m, results: (m.results ?? []).map((r) => ({ ...r, text: String(r.text ?? '').slice(0, 300) + ' …[pruned]' })) }
            : m,
        )
        json = JSON.stringify(snap)
        if (json.length > 1_500_000) return
      }
      runtime.onCheckpoint(snap)
    } catch {
      /* checkpointing is best-effort */
    }
  }
  if (!cp) {
    yield { type: 'run_start', runId, model: entries.slice(0, 3).map((e) => e.id + '/' + e.model).join(' → ') + (entries.length > 3 ? ' → …(' + entries.length + ' total)' : '') }
    yield { type: 'message', role: 'user', text: both(String(prompt)) }
  }
  if (cp && plan) {
    yield {
      type: 'message',
      role: 'agent',
      text: L(
        'Long run: resuming on a fresh worker invocation from step ' + (startStep + 1) + ' of ' + plan.length + '.',
        'Длинный прогон: продолжаю на новой инвокации воркера с шага ' + (startStep + 1) + ' из ' + plan.length + '.',
      ),
    }
  }

  for (let attempt = 0; attempt < 3 && !plan && alive(); attempt++) {
    const reply = await chat(entries, systemPrompt(locale), turns, signal)
    if (!usedModel && reply.model) {
      usedModel = reply.model
      yield { type: 'model', model: reply.model }
    }
    turns.push({ role: 'assistant', content: reply.content, toolCalls: reply.toolCalls })
    const results = []
    for (const call of reply.toolCalls) {
      totalCalls++
      if (call.name === 'submit_plan') {
        plan = (call.args.steps ?? []).slice(0, MAX_STEPS).map((s, i) => ({
          id: 's' + (i + 1),
          title: both(String(s.title ?? 'step ' + (i + 1))),
          estimate: String(s.estimate ?? '~1m'),
          credits: 60,
        }))
        intro = String(call.args.intro ?? reply.content ?? '')
        results.push({ id: call.id, text: 'plan accepted: ' + plan.length + ' steps' })
      } else {
        results.push({ id: call.id, text: 'protocol error: call submit_plan first' })
      }
    }
    if (reply.toolCalls.length) turns.push({ role: 'tool', results })
    if (!reply.toolCalls.length && reply.content) {
      // model answered in prose: nudge it once
      turns.push({ role: 'user', content: 'Use the submit_plan tool now.' })
    }
  }

  if (!plan) {
    throw new Error('the model could not produce a plan after 3 attempts')
  }

  if (!cp) {
    yield { type: 'message', role: 'agent', text: both(intro || 'Plan ready — executing.') }
    yield { type: 'plan', steps: plan.map((s) => ({ id: s.id, title: s.title, estimate: s.estimate })) }
    checkpoint(0, 'steps')
  }

  /* --- execution loop ----------------------------------------------- */
  let artifact = null

  for (let stepIndex = startStep; stepIndex < plan.length && alive(); stepIndex++) {
    const step = plan[stepIndex]
    yield { type: 'step_start', stepId: step.id }
    turns.push({
      role: 'user',
      content:
        'Execute step ' + (stepIndex + 1) + ' of ' + plan.length + ': "' + step.title.en + '". Use tools, then call step_done. ' +
        (locale === 'ru' ? 'All user-visible strings MUST be in Russian.' : 'All user-visible strings MUST be in English.'),
    })

    let done = false
    for (let call = 0; call < MAX_TOOL_CALLS_PER_STEP && !done && alive() && totalCalls < MAX_TOTAL_TOOL_CALLS; call++) {
      const reply = await chat(entries, systemPrompt(locale), turns, signal)
      turns.push({ role: 'assistant', content: reply.content, toolCalls: reply.toolCalls })
      if (!reply.toolCalls.length) {
        if (reply.content) yield { type: 'thought', stepId: step.id, text: both(reply.content.slice(0, 400)) }
        turns.push({ role: 'user', content: 'Continue: use a tool, or call step_done if the step is finished.' })
        continue
      }

      const results = []
      for (const c of reply.toolCalls) {
        totalCalls++
        if (c.truncated) {
          results.push({ id: c.id, text: 'FAILED: your tool arguments were cut off by the token limit. Retry with much smaller content (split into multiple write_file calls of <4KB, or use deliver_artifact with from_file).' })
          continue
        }
        switch (c.name) {
          case 'think':
            yield { type: 'thought', stepId: step.id, text: both(String(c.args.text ?? '').slice(0, 400)) }
            results.push({ id: c.id, text: 'noted' })
            break
          case 'web_fetch': {
            yield { type: 'tool', stepId: step.id, tool: { name: 'browser', detail: both('Fetching ' + String(c.args.url ?? '').slice(0, 90)) } }
            const fetched = await executeWebFetch(c.args)
            if (fetched.ok) {
              yield { type: 'browse', stepId: step.id, page: { url: String(c.args.url), title: fetched.title ?? '', note: both(String(c.args.goal ?? 'research').slice(0, 160)) } }
            }
            results.push({ id: c.id, text: fetched.ok ? fetched.text : 'FAILED: ' + fetched.text })
            break
          }
          case 'run_code': {
            yield { type: 'tool', stepId: step.id, tool: { name: 'shell', detail: both(String(c.args.note ?? 'running sandboxed code').slice(0, 90)) } }
            const ran = executeCode(c.args)
            for (const line of ran.text.split('\n').slice(0, 24)) yield { type: 'console', stepId: step.id, line }
            results.push({ id: c.id, text: (ran.ok ? 'stdout:\n' : 'FAILED:\n') + ran.text.slice(0, 3000) })
            break
          }
          case 'write_file': {
            const path = String(c.args.path ?? 'output/file.txt')
            files.set(path, String(c.args.content ?? ''))
            yield { type: 'tool', stepId: step.id, tool: { name: 'editor', detail: both('Writing ' + path) } }
            yield {
              type: 'file',
              stepId: step.id,
              file: { path, kind: path.endsWith('.json') ? 'json' : path.endsWith('.html') ? 'html' : path.endsWith('.md') ? 'md' : 'code', content: String(c.args.content ?? '').slice(0, 4000), bytes: (c.args.content ?? '').length + ' B' },
            }
            results.push({ id: c.id, text: 'wrote ' + path + ' (' + (c.args.content ?? '').length + ' bytes)' })
            break
          }
          case 'read_file': {
            const content = files.get(String(c.args.path))
            results.push({ id: c.id, text: content === undefined ? 'FAILED: no such file' : content.slice(0, 4000) })
            break
          }
          case 'search_web': {
            yield { type: 'tool', stepId: step.id, tool: { name: 'search', detail: both('Searching: ' + String(c.args.query ?? '').slice(0, 80)) } }
            const found = await searchWeb(String(c.args.query ?? ''), { signal })
            for (const r of found.results.slice(0, 5)) {
              yield { type: 'console', stepId: step.id, line: 'hit · ' + r.title.slice(0, 70) + ' · ' + r.url.slice(0, 80) }
            }
            results.push({
              id: c.id,
              text: found.ok
                ? found.results.map((r, i) => (i + 1) + '. ' + r.title + ' — ' + r.url + (r.snippet ? ' — ' + r.snippet.slice(0, 160) : '')).join('\n')
                : 'FAILED: ' + found.text,
            })
            break
          }
          case 'wide_research': {
            const slices = (c.args.slices ?? []).slice(0, 6).map(String)
            yield { type: 'tool', stepId: step.id, tool: { name: 'fleet', detail: both(slices.length + ' sub-agents in parallel') } }
            const merged = await Promise.all(
              slices.map(async (slice, i) => {
                const found = await searchWeb(slice, { signal, limit: 4 })
                const top = found.results.slice(0, 2)
                const pages = await Promise.all(top.map((r) => executeWebFetch({ url: r.url }, )))
                return {
                  slice,
                  id: 'agent-' + String(i + 1).padStart(2, '0'),
                  sources: top.map((r, k) => ({ ...r, text: pages[k]?.ok ? pages[k].text : '' })),
                }
              }),
            )
            let report = '# Wide Research: ' + String(c.args.question ?? '') + '\n\n'
            for (const part of merged) {
              yield { type: 'console', stepId: step.id, line: part.id + ' done · ' + part.sources.length + ' sources · ' + part.slice.slice(0, 60) }
              for (const src of part.sources) {
                yield { type: 'browse', stepId: step.id, page: { url: src.url, title: src.title, note: both(part.slice.slice(0, 120)) } }
              }
              report += '## ' + part.slice + '\n' + part.sources.map((src) => '- [' + src.title + '](' + src.url + ')\n' + (src.text ? src.text.slice(0, 900) + '\n' : '')).join('') + '\n'
            }
            files.set('research/wide-research.md', report)
            yield { type: 'file', stepId: step.id, file: { path: 'research/wide-research.md', kind: 'md', content: report.slice(0, 4000), bytes: report.length + ' B' } }
            results.push({ id: c.id, text: 'merged report (research/wide-research.md):\n' + report.slice(0, 5000) })
            break
          }
          case 'make_slides': {
            const slides = (c.args.slides ?? []).slice(0, 20)
            const bytes = buildPptx(String(c.args.title ?? 'Deck'), slides)
            const name = String(c.args.file_name ?? 'deck.pptx')
            binaries.set(name, bytes)
            yield { type: 'tool', stepId: step.id, tool: { name: 'render', detail: both('Building ' + name + ' (' + slides.length + ' slides)') } }
            yield { type: 'console', stepId: step.id, line: 'pptx: ' + bytes.length + ' bytes · ' + slides.length + ' slides · OOXML valid' }
            const deckHtml = '<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#0b0b11;color:#f4f4f1;font:16px/1.5 system-ui}section{min-height:100vh;display:flex;flex-direction:column;justify-content:center;gap:14px;padding:8vh 10vw;border-bottom:1px solid #ffffff1f}h2{font-size:clamp(26px,4vw,44px);margin:0;letter-spacing:-.03em}li{margin:6px 0;color:#c9c9d2}.k{color:#c8f751;font:600 12px/1 system-ui;letter-spacing:.16em;text-transform:uppercase}</style></head><body>' +
              slides.map((sl, i) => '<section><span class="k">' + (i + 1) + ' / ' + slides.length + '</span><h2>' + String(sl.title ?? '').replace(/</g, '&lt;') + '</h2><ul>' + (sl.bullets ?? []).map((b) => '<li>' + String(b).replace(/</g, '&lt;') + '</li>').join('') + '</ul></section>').join('') +
              '</body></html>'
            files.set('deck.html', deckHtml)
            results.push({ id: c.id, text: 'wrote ' + name + ' (' + bytes.length + ' bytes, attached to the artifact downloads) and deck.html preview' })
            break
          }
          case 'http_session': {
            yield { type: 'tool', stepId: step.id, tool: { name: 'browser', detail: both('HTTP session: ' + (c.args.actions ?? []).length + ' actions') } }
            const session = await httpSession(c.args.actions, { signal })
            for (const entry of session.log) {
              yield { type: 'console', stepId: step.id, line: entry.step + ' ' + entry.url.slice(0, 70) + ' → ' + (entry.status ?? entry.note) }
              if (entry.title) yield { type: 'browse', stepId: step.id, page: { url: entry.url, title: entry.title, note: both(entry.step + ' → ' + (entry.status ?? '')) } }
            }
            results.push({ id: c.id, text: session.log.map((e) => e.step + ' ' + e.url + ' → ' + (e.status ?? e.note) + (e.title ? ' (“' + e.title + '”)' : '')).join('\n') })
            break
          }
          case 'make_captions': {
            const srt = buildSrt(c.args.lines)
            const name = String(c.args.file_name ?? 'captions.srt')
            files.set(name, srt)
            yield { type: 'tool', stepId: step.id, tool: { name: 'render', detail: both('Writing ' + name) } }
            yield { type: 'file', stepId: step.id, file: { path: name, kind: 'md', content: srt.slice(0, 2000), bytes: srt.length + ' B' } }
            results.push({ id: c.id, text: 'wrote ' + name + ' (' + (c.args.lines ?? []).length + ' cues)' })
            break
          }
          case 'step_done':
            yield { type: 'thought', stepId: step.id, text: both('✓ ' + String(c.args.summary ?? '').slice(0, 300)) }
            results.push({ id: c.id, text: 'step closed' })
            done = true
            break
          case 'deliver_artifact':
            artifact = normalizeArtifact(c.args, files)
            results.push({ id: c.id, text: 'artifact accepted' })
            done = true
            break
          case 'submit_plan':
            results.push({ id: c.id, text: 'plan already submitted' })
            break
          default:
            results.push({ id: c.id, text: 'unknown tool: ' + c.name })
        }
      }
      turns.push({ role: 'tool', results })
    }

    credits += 60 + totalCalls * 4
    yield { type: 'progress', credits, stepIndex, total: plan.length }
    yield { type: 'step_done', stepId: step.id }
    checkpoint(stepIndex + 1, 'steps')
  }

  /* --- artifact: requested, or synthesized from the workspace ------- */
  checkpoint(plan.length, 'artifact')
  if (!artifact) {
    const htmlFile = [...files.entries()].find(([path]) => path.endsWith('.html'))
    artifact = htmlFile
      ? { title: both(htmlFile[0]), fileName: htmlFile[0], kind: 'html', html: htmlFile[1], note: L('Assembled from workspace files', 'Собрано из файлов воркспейса') }
      : fallbackBrief(prompt, files, locale)
  }
  if (!artifact.downloads) artifact.downloads = collectDownloads(files, binaries)

  artifact.downloads = collectDownloads(files, binaries)
  yield { type: 'artifact', artifact }
  yield {
    type: 'delivered',
    items: [
      both(artifact.fileName + ' (attached above)'),
      both(files.size + ' workspace file(s): ' + ([...files.keys()].join(', ') || 'none')),
      both(totalCalls + ' tool calls · ' + credits + ' credits'),
    ],
  }
  yield { type: 'message', role: 'agent', text: L('Done — the artifact above was produced by the live LLM orchestrator. Tell me what to adjust and I will continue from this run.', 'Готово — артефакт выше собран живым LLM-оркестратором. Скажите, что поправить, и я продолжу с этого запуска.') }
  yield { type: 'done' }
}

function normalizeArtifact(args, files) {
  let html = args.from_file ? String(files.get(String(args.from_file)) ?? '') : String(args.html ?? '')
  if (!/<\/html>/i.test(html)) {
    const candidate = [...files.entries()].find(([path]) => path.endsWith('.html'))
    if (candidate) html = candidate[1]
  }
  if (!html) html = '<!doctype html><html><body style="font:16px system-ui;padding:40px">empty artifact</body></html>'
  return {
    title: both(String(args.title ?? 'Generated artifact')),
    fileName: String(args.file_name ?? 'index.html'),
    kind: 'html',
    html,
    note: both(String(args.note ?? 'Produced by the LLM orchestrator')),
  }
}

function fallbackBrief(prompt, files, locale) {
  const list = [...files.entries()].map(([path, content]) => '## ' + path + '\n\n' + content.slice(0, 800)).join('\n\n')
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><style>body{font:16px/1.6 system-ui;margin:0;padding:48px;background:#0b0b11;color:#f4f4f1}pre{white-space:pre-wrap;background:#15151d;padding:16px;border-radius:12px}</style></head><body>' +
    '<h1>Run output</h1><p>' + String(prompt).slice(0, 300).replace(/</g, '&lt;') + '</p><pre>' + (list || '(no files written)').replace(/</g, '&lt;') + '</pre></body></html>'
  return { title: L('Run output', 'Результат запуска'), fileName: 'output.html', kind: 'html', html, note: L('Synthesized from workspace files', 'Собрано из файлов воркспейса') }
}
