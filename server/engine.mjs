/**
 * Engine selector: the LLM orchestrator when a provider key is present,
 * otherwise the deterministic core. Both speak the identical SSE contract,
 * so transports (standalone server, Vercel functions) never care which runs.
 */
import { runEvents as deterministic, VERSION } from './core.mjs'
import { runOrchestrated, llmConfigured, engineInfo, runtimeStatus } from './orchestrator.mjs'

export async function* runEvents(prompt, locale, signal, runtime) {
  if (llmConfigured(runtime)) {
    try {
      yield* runOrchestrated(prompt, locale, signal, runtime)
      return
    } catch (error) {
      if (signal?.aborted) return
      yield {
        type: 'message',
        role: 'agent',
        text: {
          en: 'LLM orchestrator failed (' + (error?.message ?? error) + '). Falling back to the deterministic engine for this run.',
          ru: 'LLM-оркестратор упал (' + (error?.message ?? error) + '). Этот запуск выполняю детерминированным движком.',
        },
      }
    }
  }
  yield* deterministic(prompt, locale, signal)
}

export { VERSION, engineInfo, llmConfigured, runtimeStatus }
