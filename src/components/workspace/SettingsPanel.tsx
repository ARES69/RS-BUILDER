/**
 * Builder settings drawer: run mode, live backend status (engine, providers,
 * cooldowns) and per-browser API keys (BYOK). Keys never touch the server
 * storage — they travel per request in the `x-rsb-keys` header so a run can
 * use the visitor's own free quotas when the shared ones are exhausted.
 */
import { useEffect, useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { AGENT_API_URL } from '@/lib/remoteAgent'
import { fetchCredits, type LedgerEntry } from '@/lib/auth'
import { PROVIDER_META, clearKeys, loadSettings, saveSettings, type BuilderSettings, type RuntimeProviderId } from '@/lib/settings'

export type BackendStatus = {
  ok?: boolean
  engine?: 'llm' | 'deterministic'
  providers?: string[]
  model?: string | null
  cooldowns?: Record<string, number>
  runtimeKeys?: boolean
  quotaNote?: string
} | null

export async function fetchBackendStatus(): Promise<BackendStatus> {
  if (!AGENT_API_URL) return null
  try {
    const response = await fetch(AGENT_API_URL.replace(/\/$/, '') + '/v1/status', { signal: AbortSignal.timeout(8000) })
    if (!response.ok) return null
    return (await response.json()) as BackendStatus
  } catch {
    return null
  }
}

function countdown(until: number): string {
  const minutes = Math.max(1, Math.round((until - Date.now()) / 60000))
  if (minutes < 60) return minutes + 'm'
  return Math.round(minutes / 60) + 'h'
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<BuilderSettings>(() => loadSettings())
  const [status, setStatus] = useState<BackendStatus>(null)
  const [savedAt, setSavedAt] = useState(0)
  const [credits, setCredits] = useState<{ balance: number; entries: LedgerEntry[] } | null>(null)

  useEffect(() => {
    if (!open) return
    setDraft(loadSettings())
    setSavedAt(0)
    let alive = true
    fetchBackendStatus().then((s) => alive && setStatus(s))
    fetchCredits().then((c) => alive && setCredits(c))
    return () => {
      alive = false
    }
  }, [open])

  if (!open) return null

  const setKey = (id: RuntimeProviderId, value: string) => setDraft((d) => ({ ...d, keys: { ...d.keys, [id]: value } }))

  const save = () => {
    const keys = {} as BuilderSettings['keys']
    for (const [id, value] of Object.entries(draft.keys)) {
      if (value && value.trim()) (keys as Record<string, string>)[id] = value.trim()
    }
    const next: BuilderSettings = { keys }
    saveSettings(next)
    setDraft(next)
    setSavedAt(Date.now())
  }

  const wipe = () => {
    clearKeys()
    setDraft((d) => ({ ...d, keys: {} }))
    setSavedAt(Date.now())
  }

  const cooldowns = Object.entries(status?.cooldowns ?? {}).filter(([, until]) => until > Date.now())

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col gap-5 overflow-y-auto border-l border-line bg-bg p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-fg">{t('app.settingsTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('app.openSettings')}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent/40 hover:text-fg"
          >
            <X size={14} />
          </button>
        </header>

        {/* Live backend status */}
        <section>
          <p className="eyebrow mb-2">{t('app.settingsStatus')}</p>
          {!AGENT_API_URL || !status ? (
            <p className="rounded-xl border border-line bg-surface/50 px-3 py-2.5 text-[11.5px] leading-snug text-faint">
              {t('app.statusUnavailable')}
            </p>
          ) : (
            <div className="rounded-xl border border-line bg-surface/50 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-muted">
              <div>
                engine: <b className="text-fg">{status.engine}</b>
              </div>
              <div>providers: {status.providers?.length ? status.providers.join(', ') : '—'}</div>
              <div className="break-all">model: {status.model ?? '—'}</div>
              <div>
                runtime keys: {status.runtimeKeys ? t('app.statusYourKeys') : '—'}
              </div>
              {cooldowns.length > 0 && (
                <div className="mt-1 text-amber-500">
                  {t('app.statusCooldowns')}: {cooldowns.map(([id, until]) => id + ' ' + countdown(until)).join(', ')}
                </div>
              )}
              {status.quotaNote && <div className="mt-1 text-[10px] text-faint">{status.quotaNote}</div>}
            </div>
          )}
        </section>

        {/* Credits ledger */}
        {credits && (
          <section>
            <p className="eyebrow mb-2">{t('app.creditsTitle')}</p>
            <div className="rounded-xl border border-line bg-surface/50 px-3 py-2.5">
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[11.5px] text-muted">{t('app.creditsBalance')}</span>
                <span className="font-mono text-[15px] font-semibold text-accent">{credits.balance}</span>
              </div>
              {credits.entries.length === 0 ? (
                <p className="text-[10.5px] text-faint">{t('app.creditsEmpty')}</p>
              ) : (
                <div className="flex flex-col gap-0.5 font-mono text-[10.5px] text-faint">
                  {credits.entries.slice(0, 6).map((e, i) => (
                    <span key={i} className="flex justify-between gap-2">
                      <span className="truncate">{e.reason}</span>
                      <span className={e.delta >= 0 ? 'text-accent' : 'text-amber-400'}>
                        {e.delta >= 0 ? '+' : ''}{e.delta}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* BYOK keys */}
        <section>
          <p className="eyebrow mb-1">{t('app.settingsKeys')}</p>
          <p className="mb-3 text-[11px] leading-snug text-faint">{t('app.settingsKeysHint')}</p>
          <div className="flex flex-col gap-3">
            {PROVIDER_META.map((p) => (
              <div key={p.id}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11.5px] font-semibold text-muted">{p.label}</span>
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10.5px] text-cyan hover:underline"
                  >
                    {t('app.getKey')} <ExternalLink size={10} />
                  </a>
                </div>
                <input
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder={p.hint}
                  value={draft.keys[p.id] ?? ''}
                  onChange={(e) => setKey(p.id, e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-2.5 py-1.5 font-mono text-[11.5px] text-fg outline-none transition-colors focus:border-accent"
                />
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            className="rounded-full bg-accent px-4 py-2 text-[12px] font-semibold text-black transition-opacity hover:opacity-90"
          >
            {t('app.settingsSave')}
          </button>
          <button
            type="button"
            onClick={wipe}
            className="rounded-full border border-line px-4 py-2 text-[12px] font-semibold text-muted transition-colors hover:border-accent/40 hover:text-fg"
          >
            {t('app.clearKeys')}
          </button>
        </div>

        <p className="text-[10.5px] leading-snug text-faint">
          {savedAt ? t('app.settingsSaved') : t('app.settingsPrivacy')}
        </p>
      </aside>
    </div>
  )
}
