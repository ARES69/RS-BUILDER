/**
 * Engine selector, v3: THERE IS NO SIMULATOR.
 * The product runs the real LLM orchestrator or fails loudly — a silent
 * deterministic fallback was masking provider outages from users and from us.
 * runEvents throws when no provider is configured/reachable; transports turn
 * that into an honest error event + failed job status.
 */
import { runOrchestrated, llmConfigured, engineInfo, runtimeStatus } from './orchestrator.mjs'

export const VERSION = '1.0.0'

export async function* runEvents(prompt, locale, signal, runtime) {
  yield* runOrchestrated(prompt, locale, signal, runtime)
}

export { engineInfo, llmConfigured, runtimeStatus }
