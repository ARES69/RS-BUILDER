import type { AgentEvent } from './agent'
import type { Locale } from '@/i18n'

/**
 * Client for the live agent backend (see `server/agent-server.mjs` for the
 * reference implementation and the full wire contract).
 *
 * The contract is intentionally generic: any orchestrator that streams the
 * documented event shapes over SSE can power the workspace UI.
 */
export const AGENT_API_URL: string | undefined = import.meta.env.VITE_AGENT_API_URL || undefined

export const remoteEnabled = (): boolean => Boolean(AGENT_API_URL)

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

/**
 * Starts a run on the backend and yields its events as they arrive.
 * Aborting the signal closes the stream; the server stops the run.
 */
export async function* runRemote(
  prompt: string,
  locale: Locale,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const base = (AGENT_API_URL ?? '').replace(/\/$/, '')
  const response = await fetch(base + '/v1/runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
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
