/**
 * Workspace settings: run mode + per-visitor provider keys ("bring your own
 * quota"). Keys are stored ONLY in this browser's localStorage and travel to
 * the backend per request in the `x-rsb-keys` header; the server never logs
 * or persists them (see server/orchestrator.mjs → parseRuntimeKeys).
 */

export type RuntimeProviderId = 'openrouter' | 'opencode-zen' | 'groq' | 'gemini' | 'mistral' | 'nim'

export type BuilderSettings = {
  keys: Partial<Record<RuntimeProviderId, string>>
}

const STORAGE_KEY = 'rsb-settings-v1'

export const PROVIDER_META: { id: RuntimeProviderId; label: string; href: string; hint: string }[] = [
  { id: 'openrouter', label: 'OpenRouter', href: 'https://openrouter.ai/keys', hint: 'sk-or-… · free :free models, 50 req/day' },
  { id: 'opencode-zen', label: 'OpenCode Zen', href: 'https://opencode.ai/zen', hint: 'oc_sk_… · paid catalog, cheapest-first' },
  { id: 'groq', label: 'Groq', href: 'https://console.groq.com/keys', hint: 'gsk_… · fast free tier' },
  { id: 'gemini', label: 'Google Gemini', href: 'https://aistudio.google.com/apikey', hint: 'AIz… · free tier' },
  { id: 'mistral', label: 'Mistral', href: 'https://console.mistral.ai/api-keys', hint: 'free experiment tier' },
  { id: 'nim', label: 'NVIDIA NIM', href: 'https://build.nvidia.com', hint: 'nvapi-… · free tier' },
]

const DEFAULTS: BuilderSettings = { keys: {} }

export function loadSettings(): BuilderSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<BuilderSettings>
    return {
      keys: parsed.keys && typeof parsed.keys === 'object' ? (parsed.keys as BuilderSettings['keys']) : {},
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(next: BuilderSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* private mode etc. — settings simply do not persist */
  }
  window.dispatchEvent(new CustomEvent('rsb-settings-change'))
}

export function clearKeys(): BuilderSettings {
  const next = { ...loadSettings(), keys: {} }
  saveSettings(next)
  return next
}

export const hasKeys = (s: BuilderSettings): boolean => Object.values(s.keys).some((v) => Boolean(v && v.trim()))
