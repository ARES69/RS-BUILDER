import type { AgentEvent } from './agent'
import type { Locale } from '@/i18n'
import { hasKeys, loadSettings } from './settings'

/**
 * Client for the live agent backend (see `server/agent-server.mjs` for the
 * reference implementation and the full wire contract).
 *
 * The contract is intentionally generic: any orchestrator that streams the
 * documented event shapes over SSE can power the workspace UI.
 */
export const AGENT_API_URL: string | undefined = import.meta.env.VITE_AGENT_API_URL || undefined

export const remoteEnabled = (): boolean => Boolean(AGENT_API_URL)

/** Per-request provider keys from workspace settings (never persisted server-side). */
function runtimeHeaders(): Record<string, string> {
  const settings = loadSettings()
  return hasKeys(settings) ? { 'x-rsb-keys': JSON.stringify(settings.keys) } : {}
}

export type BackendStatus = {
  ok: boolean
  engine: 'llm' | 'deterministic'
  providers: string[]
  model: string | null
  cooldowns: Record<string, number>
  catalogs: Record<string, string[] | null>
  runtimeKeys: string[]
  serverTime: string
  quotaNote?: string
  jobStore?: string
  capabilities?: string[]
}

/** Live introspection of the agent backend (engine, providers, cooldowns). */
export async function fetchBackendStatus(): Promise<BackendStatus | null> {
  if (!AGENT_API_URL) return null
  try {
    const response = await fetch(AGENT_API_URL.replace(/\/$/, '') + '/v1/status', {
      headers: runtimeHeaders(),
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) return null
    return (await response.json()) as BackendStatus
  } catch {
    return null
  }
}

export class RemoteAgentError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'RemoteAgentError'
    this.status = status
  }
}

export async function checkRemoteHealth(): Promise<boolean> {
  if (!AGENT_API_URL) return false
  try {
    const response = await fetch(AGENT_API_URL.replace(/\/$/, '') + '/v1/health')
    return response.ok
  } catch {
    return false
  }
}

let capsPromise: Promise<BackendStatus | null> | null = null
export function backendCaps(): Promise<BackendStatus | null> {
  capsPromise = capsPromise ?? fetchBackendStatus()
  return capsPromise
}

let activeJobId: string | null = null
export const activeRemoteJob = (): string | null => activeJobId

/** Asks a queued run to stop (the worker notices between event batches). */
export function cancelActiveRemote(): void {
  if (!activeJobId || !AGENT_API_URL) return
  const id = activeJobId
  fetch(AGENT_API_URL.replace(/\/$/, '') + '/v1/job?id=' + id, {
    method: 'POST',
    headers: runtimeHeaders(),
  }).catch(() => {})
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Queued run: the job lives on the server, this generator only tails it.
 * Closing the tab, losing the network or a frozen worker do not kill the run;
 * the tail re-attaches with its cursor until a terminal status arrives.
 */
async function* runQueued(prompt: string, locale: Locale, signal?: AbortSignal, opts?: { parentJobId?: string | null }): AsyncGenerator<AgentEvent> {
  const base = (AGENT_API_URL ?? '').replace(/\/$/, '')
  const created = await fetch(base + '/v1/runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...runtimeHeaders() },
    body: JSON.stringify({ prompt, locale, mode: 'queue', parentJobId: opts?.parentJobId || undefined }),
    signal,
  })
  if (created.status === 402) {
    const info402 = (await created.json().catch(() => null)) as { balance?: number; min?: number } | null
    yield {
      type: 'message',
      role: 'agent',
      text: {
        en: 'Not enough credits for a new run (balance ' + (info402?.balance ?? 0) + ', minimum ' + (info402?.min ?? 100) + '). Top up when Stripe billing lands, or run in demo mode.',
        ru: 'Недостаточно кредитов для нового запуска (баланс ' + (info402?.balance ?? 0) + ', минимум ' + (info402?.min ?? 100) + '). Пополнение приедет вместе со Stripe-биллингом; а пока — режим симулятора.',
      },
    } as AgentEvent
    yield { type: 'done' } as AgentEvent
    return
  }
  if (!created.ok) throw new RemoteAgentError('Agent backend rejected the job: ' + created.status, created.status)
  const info = (await created.json()) as { jobId: string; streamUrl: string; statusUrl: string }
  activeJobId = info.jobId
  yield { type: 'job_meta', jobId: info.jobId, parentJobId: opts?.parentJobId ?? null } as AgentEvent
  const streamPath = info.streamUrl.replace(/^\/api/, '')

  let cursor = 0
  let reconnects = 0
  let terminal = false
  while (!terminal && reconnects < 8 && !signal?.aborted) {
    try {
      const response = await fetch(base + streamPath + (streamPath.includes('?') ? '&' : '?') + 'cursor=' + cursor, {
        headers: { accept: 'text/event-stream', ...runtimeHeaders() },
        signal,
      })
      if (!response.ok || !response.body) throw new RemoteAgentError('job stream ' + response.status, response.status)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx: number
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const line = chunk.split('\n').find((l) => l.trim().startsWith('data:'))
          if (!line) continue
          const payload = line.trim().slice(5).trim()
          if (!payload) continue
          let event: Record<string, unknown>
          try {
            event = JSON.parse(payload)
          } catch {
            continue
          }
          if (event.type === 'job_end') {
            terminal = true
            if (event.status === 'done') {
              try {
                const snap = await (await fetch(base + info.statusUrl.replace(/^\/api/, ''), { headers: runtimeHeaders() })).json()
                if (snap?.artifactMeta) yield { type: 'artifact_meta', meta: snap.artifactMeta } as AgentEvent
              } catch {
                /* hosting meta is optional */
              }
            }
            if (event.status === 'failed') {
              yield {
                type: 'message',
                role: 'agent',
                text: {
                  en: 'The queued run failed: ' + String(event.error ?? 'unknown error'),
                  ru: 'Запуск в очереди упал: ' + String(event.error ?? 'неизвестная ошибка'),
                },
              } as AgentEvent
            }
            if (event.status !== 'done') yield { type: 'done' } as AgentEvent
            break
          }
          cursor += 1
          yield event as AgentEvent
        }
        if (terminal) break
      }
      if (!terminal) reconnects += 1
    } catch (error) {
      if (signal?.aborted) return
      reconnects += 1
      await sleep(800)
    }
  }
  activeJobId = null
}

/**
 * Starts a run on the backend and yields its events as they arrive.
 * When the backend advertises the `queue` capability the run becomes a
 * server-side job (survives tab close / network blips); otherwise the legacy
 * synchronous SSE path is used. Aborting closes the tail; for queued runs the
 * Stop button additionally calls cancelActiveRemote().
 */
export async function* runRemote(
  prompt: string,
  locale: Locale,
  signal?: AbortSignal,
  opts?: { parentJobId?: string | null },
): AsyncGenerator<AgentEvent> {
  const caps = await backendCaps()
  if (caps && (caps.capabilities ?? []).includes('queue')) {
    yield* runQueued(prompt, locale, signal, opts)
    return
  }
  yield* runRemoteSync(prompt, locale, signal)
}

async function* runRemoteSync(
  prompt: string,
  locale: Locale,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const base = (AGENT_API_URL ?? '').replace(/\/$/, '')
  const response = await fetch(base + '/v1/runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream', ...runtimeHeaders() },
    body: JSON.stringify({ prompt, locale }),
    signal,
  })

  if (!response.ok) {
    throw new RemoteAgentError('Agent backend responded with ' + response.status, response.status)
  }
  if (!response.body) {
    throw new RemoteAgentError('Agent backend returned an empty body')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const parseChunk = function* (chunk: string): Generator<AgentEvent> {
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (!payload) continue
      try {
        yield JSON.parse(payload) as AgentEvent
      } catch {
        // ignore malformed line rather than killing the stream
      }
    }
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let separator: number
      while ((separator = buffer.indexOf('\n\n')) >= 0) {
        const chunk = buffer.slice(0, separator)
        buffer = buffer.slice(separator + 2)
        yield* parseChunk(chunk)
      }
    }
    if (buffer.trim()) yield* parseChunk(buffer)
  } finally {
    reader.releaseLock()
  }
}
