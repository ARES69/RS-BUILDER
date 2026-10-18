import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Coins, ExternalLink, History, LogIn, LogOut, Plus, RotateCcw, Settings, Sparkles } from 'lucide-react'
import { useI18n } from '@/i18n'
import { PRESETS } from '@/data/scenarios'
import { useAgentRun } from '@/lib/useAgentRun'
import { cn } from '@/lib/cn'
import { Logo } from '@/components/Logo'
import { Icon } from '@/components/ui/Icon'
import { Composer } from '@/components/home/Composer'
import { Thread } from '@/components/workspace/Thread'
import { RunPanel, type RunTab } from '@/components/workspace/RunPanel'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { AGENT_API_URL, fetchBackendStatus, remoteEnabled, type BackendStatus } from '@/lib/remoteAgent'
import { SettingsPanel } from '@/components/workspace/SettingsPanel'
import { AuthModal } from '@/components/workspace/AuthModal'
import { fetchCredits, fetchGallery, fetchGalleryHtml, fetchHistory, fetchHistoryRun, fetchMe, logOut, type GalleryEntry, type HistoryEntry, type SessionUser } from '@/lib/auth'
import type { AgentEvent } from '@/lib/agent'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'

/** Maps showcase / feature slugs onto a scripted scenario id. */
const ALIAS: Record<string, string> = {
  site: 'site',
  webapp: 'site',
  landing: 'site',
  design: 'site',
  deck: 'deck',
  slides: 'deck',
  research: 'research',
  'deep-research': 'research',
  'wide-research': 'research',
  game: 'game',
  games: 'game',
  video: 'game',
  'browser-operator': 'research',
  automations: 'research',
}


export default function Workspace() {
  const { t, l, locale } = useI18n()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [backend, setBackend] = useState<BackendStatus | null>(null)

  useEffect(() => {
    if (!remoteEnabled()) return
    let alive = true
    fetchBackendStatus().then((status) => alive && setBackend(status))
    return () => {
      alive = false
    }
  }, [])
  useEffect(() => {
    if (settingsOpen || !remoteEnabled()) return
    let alive = true
    fetchBackendStatus().then((status) => alive && setBackend(status))
    return () => {
      alive = false
    }
  }, [settingsOpen])

  const cooldownNow = (until?: number) => Boolean(until && until > Date.now())
  const showFallbackBanner =
    remoteEnabled() &&
    backend !== null &&
    (backend.engine === 'deterministic' ||
      Boolean(backend.providers?.length) === false ||
      (backend.providers ?? []).every((id) => cooldownNow(backend?.cooldowns?.[id])))
  const [params] = useSearchParams()
  const { state, start, stop, reset, replay, previewExternal } = useAgentRun()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  // after a finished run the composer continues THAT sandbox (context + files);
  // the Plus button in the sidebar starts a clean one
  const continueFrom = state.status === 'done' && state.jobId ? state.jobId : null
  const [gallery, setGallery] = useState<GalleryEntry[]>([])

  useEffect(() => {
    fetchGallery().then(setGallery)
  }, [])

  const openGallery = useCallback(
    async (entry: GalleryEntry) => {
      const html = await fetchGalleryHtml(entry.pageUrl)
      if (!html) return
      setMobileView('panel')
      setTab('preview')
      previewExternal(html, entry.pageUrl, entry.prompt.slice(0, 60) || 'RS-BUILDER artifact')
    },
    [previewExternal],
  )

  const refreshHistory = useCallback(() => {
    fetchHistory().then(setHistory)
  }, [])

  useEffect(() => {
    fetchMe().then((u) => {
      setUser(u)
      if (u) fetchHistory().then(setHistory)
    })
  }, [])

  useEffect(() => {
    if (user && state.status === 'done') {
      refreshHistory()
      fetchCredits().then((c) => c && setUser((u) => (u ? { ...u, credits: c.balance } : u)))
    }
  }, [user, state.status, refreshHistory])

  const openHistoryRun = useCallback(
    async (jobId: string) => {
      const job = await fetchHistoryRun(jobId)
      if (job?.events) replay(job.events as AgentEvent[])
    },
    [replay],
  )

  const [tab, setTab] = useState<RunTab>('plan')
  // Sandbox edits the user made by hand: they ride along with the NEXT prompt
  // so the agent continues from the human's version of the project.
  const [pendingFiles, setPendingFiles] = useState<Record<string, string> | null>(null)
  const armFiles = useCallback((files: Record<string, string>) => {
    setPendingFiles((prev) => ({ ...(prev ?? {}), ...files }))
    setMobileView('chat')
  }, [])
  const [mobileView, setMobileView] = useState<'chat' | 'panel'>('chat')
  const booted = useRef(false)

  const initialPrompt = useMemo<string | null>(() => {
    const promptParam = params.get('prompt')
    if (promptParam) return promptParam
    const scenarioParam = params.get('scenario')
    if (scenarioParam) {
      const id = ALIAS[scenarioParam] ?? scenarioParam
      const preset = PRESETS.find((pr) => pr.id === id)
      if (preset) return preset.prompt[locale] ?? preset.prompt.en
    }
    return null
  }, [params, locale])

  useEffect(() => {
    if (booted.current || !initialPrompt) return
    booted.current = true
    void start(initialPrompt)
  }, [initialPrompt, start])

  // Jump to the preview tab the moment an artifact lands.
  useEffect(() => {
    if (state.artifact) setTab('preview')
  }, [state.artifact])

  /**
   * The visible workspace as a seed map. In queued mode the server seeds
   * follow-ups from the parent job; in sync mode (Blob suspended, local
   * backend) there is no jobId — so the browser hands over the project it
   * already shows. Same promise either way: the next run continues THIS work.
   */
  const workspaceSnapshot = useCallback((): Record<string, string> | null => {
    if (!state.files.length) return null
    const out: Record<string, string> = {}
    let total = 0
    for (const file of state.files.slice(0, 12)) {
      if (file.content.length > 180_000) continue
      if (total + file.content.length > 380_000) break
      out[file.path] = file.content
      total += file.content.length
    }
    return Object.keys(out).length ? out : null
  }, [state.files])

  const run = useCallback(
    (prompt: string) => {
      setMobileView('chat')
      setTab('plan')
      const files = pendingFiles ?? (continueFrom ? null : workspaceSnapshot())
      setPendingFiles(null)
      void start(prompt, { parentJobId: continueFrom, files })
    },
    [start, continueFrom, pendingFiles, workspaceSnapshot],
  )

  const running = state.status === 'running'
  const statusLabel =
    state.status === 'running'
      ? t('app.running')
      : state.status === 'done'
        ? t('app.done')
        : state.status === 'stopped'
          ? t('app.failed')
          : t('app.queued')

  return (
    <div className="flex min-h-[calc(100vh-0px)] flex-col bg-bg">
      {/* App bar */}
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg/85 px-3 backdrop-blur-xl sm:px-4">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          <Logo compact />
          <span className="hidden text-[13px] font-extrabold uppercase tracking-[-0.02em] text-fg sm:block">
            RS<span className="text-faint">-</span>BUILDER
          </span>
        </Link>

        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />

        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
              running
                ? 'border-accent/40 bg-accent/12 text-accent'
                : state.status === 'done'
                  ? 'border-line bg-surface-2 text-muted'
                  : 'border-line text-faint',
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full', running ? 'animate-pulse-dot bg-accent' : 'bg-line-strong')} />
            {statusLabel}
          </span>

        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-muted sm:inline-flex">
            <Coins size={12} className="text-accent" />
            {state.credits}
          </span>


          {state.status !== 'idle' ? (
            <button
              type="button"
              onClick={running ? stop : reset}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-2.5 text-[11.5px] font-semibold text-muted transition-colors hover:border-line-strong hover:text-fg"
            >
              {running ? null : <RotateCcw size={12} />}
              {running ? t('app.stop') : t('app.reset')}
            </button>
          ) : null}

          {user ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">
              <span className="max-w-[110px] truncate" title={t('app.signedInAs') + ' ' + user.email}>{user.email}</span>
              {typeof user.credits === 'number' && (
                <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-accent" title={t('app.creditsBalance')}>
                  <Coins size={11} /> {user.credits}
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  logOut().then(() => {
                    setUser(null)
                    setHistory([])
                  })
                }}
                aria-label={t('app.signOut')}
                title={t('app.signOut')}
                className="text-muted transition-colors hover:text-fg"
              >
                <LogOut size={12} />
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[11.5px] font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent"
            >
              <LogIn size={12} /> {t('app.signIn')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('app.openSettings')}
            title={t('app.openSettings')}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-2.5 text-[11.5px] font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent xl:px-3"
          >
            <Settings size={14} />
            <span className="hidden xl:inline">{t('app.openSettings')}</span>
          </button>
          <LanguageSwitcher compact />
          <ThemeToggle className="h-8 w-8" />
          <Link
            to="/"
            className="hidden h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[11.5px] font-semibold text-muted transition-colors hover:text-fg sm:inline-flex"
          >
            <ArrowLeft size={12} /> {t('notFound.cta')}
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar */}
        <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-bg-elev/50 lg:flex">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <span className="eyebrow">{t('app.tasks')}</span>
            <button
              type="button"
              onClick={reset}
              aria-label={t('app.newTask')}
              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-accent/40 hover:text-accent"
            >
              <Plus size={14} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {PRESETS.map((scenario) => {
              const active = false
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => run(l(scenario.prompt))}
                  className={cn(
                    'mb-1 flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors',
                    active ? 'bg-surface-2' : 'hover:bg-surface/70',
                  )}
                >
                  <span
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border',
                      active ? 'border-accent/35 bg-accent/10 text-accent' : 'border-line text-muted',
                    )}
                  >
                    <Icon name={scenario.icon} size={14} />
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block truncate text-[13px] font-semibold', active ? 'text-fg' : 'text-muted')}>
                      {l(scenario.label)}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="max-h-56 overflow-y-auto border-t border-line px-3 py-2">
            <p className="eyebrow mb-1.5 flex items-center gap-1.5">
              <History size={11} /> {t('app.historyTitle')}
            </p>
            {user ? (
              history.length === 0 ? (
                <p className="px-1 text-[11px] leading-snug text-faint">{t('app.historyEmpty')}</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {history.slice(0, 20).map((h) => (
                    <div key={h.jobId} className="flex items-stretch gap-1">
                      <button
                        type="button"
                        onClick={() => openHistoryRun(h.jobId)}
                        title={t('app.historyReplay')}
                        className="min-w-0 flex-1 rounded-lg border border-line bg-surface/40 px-2 py-1.5 text-left transition-colors hover:border-accent/40"
                      >
                        <span className="block truncate text-[11.5px] text-fg">{h.prompt}</span>
                        <span className="mt-0.5 block font-mono text-[10px] text-faint">
                          {new Date(h.finishedAt || h.createdAt).toLocaleString(locale === 'ru' ? 'ru-RU' : 'en-US')} · {h.status}
                          {h.artifact ? ' · v' + h.artifact.version : ''}
                        </span>
                      </button>
                      {h.artifact?.pageUrl && (
                        <a
                          href={h.artifact.pageUrl}
                          target="_blank"
                          rel="noreferrer"
                          title={t('app.artifactPermanent')}
                          className="inline-flex w-8 shrink-0 items-center justify-center rounded-lg border border-line text-muted transition-colors hover:border-cyan/40 hover:text-cyan"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <button type="button" onClick={() => setAuthOpen(true)} className="px-1 text-left text-[11px] leading-snug text-cyan hover:underline">
                {t('app.historyHint')}
              </button>
            )}
          </div>

          {gallery.length > 0 && (
            <div className="max-h-48 overflow-y-auto border-t border-line px-3 py-2">
              <p className="eyebrow mb-1.5 flex items-center gap-1.5">
                <Sparkles size={11} /> {t('app.galleryTitle')}
              </p>
              <div className="flex flex-col gap-1">
                {gallery.slice(0, 8).map((g) => (
                  <button
                    key={g.jobId}
                    type="button"
                    onClick={() => openGallery(g)}
                    title={g.model ?? undefined}
                    className="rounded-lg border border-line bg-surface/40 px-2 py-1.5 text-left transition-colors hover:border-cyan/40"
                  >
                    <span className="block truncate text-[11.5px] text-fg">{g.prompt}</span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-faint">{g.model ?? 'live run'} · v{g.version}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-line p-3">
            <p className="rounded-xl border border-line bg-surface/60 px-3 py-2.5 text-[11.5px] leading-snug text-faint">
              <Sparkles size={12} className={cn('mr-1 inline', remoteEnabled() ? 'text-cyan' : 'text-accent')} />
              {remoteEnabled() ? (
                <>
                  <b className="font-semibold text-fg">{t('app.liveBadge')}</b>
                  <span className="mt-0.5 block break-all font-mono text-[10.5px]">{AGENT_API_URL}</span>
                  {state.model && (
                    <span className="mt-1 block truncate font-mono text-[10.5px] text-cyan" title={t('app.modelChip')}>
                      ⚡ {state.model}
                    </span>
                  )}
                </>
              ) : (
                t('app.noBackend')
              )}
            </p>
          </div>
        </aside>

        {/* Center: thread + composer */}
        <main className={cn('flex min-w-0 flex-1 flex-col', mobileView !== 'chat' && 'hidden lg:flex')}>
          {showFallbackBanner && (
            <div className="flex items-center gap-3 border-b border-line bg-amber-400/10 px-4 py-2 text-[11.5px] leading-snug text-amber-600 dark:text-amber-300">
              <span className="min-w-0 flex-1">{t('app.fallbackBanner')}</span>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="shrink-0 font-semibold underline underline-offset-2 hover:text-fg"
              >
                {t('app.openSettings')}
              </button>
            </div>
          )}
          {state.status === 'idle' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-accent">
                <Sparkles size={22} />
              </div>
              <div>
                <h1 className="text-[19px] font-bold tracking-[-0.02em] text-fg">{t('app.emptyTitle')}</h1>
                <p className="mx-auto mt-2 max-w-sm text-[13.5px] leading-relaxed text-muted">{t('app.emptySubtitle')}</p>
              </div>
              <span className="eyebrow -mb-3">{t('app.samples')}</span>
              <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {PRESETS.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => run(l(scenario.prompt))}
                    className="group flex items-start gap-3 rounded-2xl border border-line bg-surface/50 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-accent/35"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-bg text-accent">
                      <Icon name={scenario.icon} size={15} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-bold text-fg">{l(scenario.label)}</span>
                      <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-muted">
                        {l(scenario.prompt)}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <Thread state={state} onOpenArtifact={() => { setTab('preview'); setMobileView('panel') }} />
          )}

          <div className="shrink-0 border-t border-line bg-bg/70 p-3 backdrop-blur sm:p-4">
            <div className="mx-auto max-w-3xl">
              {state.queueNote ? (
                <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] px-3 py-2">
                  <span className="mt-0.5 shrink-0 font-mono text-[10.5px] uppercase tracking-[0.12em] text-amber-500">
                    queue
                  </span>
                  <span className="text-[11.5px] leading-snug text-muted">{l(state.queueNote)}</span>
                </div>
              ) : null}
              {pendingFiles && Object.keys(pendingFiles).length ? (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-accent/35 bg-accent/[0.07] px-3 py-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-accent">
                    {t('app.sandboxArmedTitle')}
                  </span>
                  <span className="truncate font-mono text-[11px] text-muted">
                    {Object.keys(pendingFiles).join(', ')}
                  </span>
                  <span className="hidden text-[11px] text-faint sm:inline">{t('app.sandboxArmedHint')}</span>
                  <button
                    type="button"
                    onClick={() => setPendingFiles(null)}
                    className="ml-auto rounded-md border border-line px-2 py-0.5 text-[11px] text-muted transition-colors hover:text-fg"
                  >
                    {t('app.sandboxArmedClear')}
                  </button>
                </div>
              ) : null}
              <Composer
                onRun={run}
                running={running}
                onStop={stop}
                size="md"
                placeholderKey={continueFrom ? 'app.composerContinue' : 'app.composerPlaceholder'}
                initialPrompt=""
              />
            </div>
          </div>
        </main>

        {/* Right: run panel */}
        <section
          className={cn(
            'min-w-0 flex-1 border-l border-line bg-bg-elev/40 p-3 lg:max-w-[46%]',
            mobileView !== 'panel' && 'hidden lg:block',
          )}
        >
          <RunPanel
            state={state}
            activeTab={tab}
            onTabChange={setTab}
            onArmFiles={armFiles}
            armedCount={pendingFiles ? Object.keys(pendingFiles).length : 0}
          />
        </section>
      </div>

      {/* Mobile view switch */}
      <div className="sticky bottom-0 z-30 flex gap-1 border-t border-line bg-bg/90 p-2 backdrop-blur lg:hidden">
        {(['chat', 'panel'] as const).map((view) => (
          <button
            key={view}
            type="button"
            onClick={() => setMobileView(view)}
            className={cn(
              'flex-1 rounded-full py-2 text-[13px] font-semibold transition-colors',
              mobileView === view ? 'bg-accent text-accent-ink' : 'text-muted',
            )}
          >
            {view === 'chat' ? t('app.title') : t('app.plan')}
          </button>
        ))}
      </div>
    <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthed={(u) => {
          setUser(u)
          fetchHistory().then(setHistory)
        }}
      />
      </div>
  )
}
