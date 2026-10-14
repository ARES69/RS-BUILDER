import { useState } from 'react'
import { Check, CircleDashed, ExternalLink, FileCode2, Globe2, Terminal, Eye } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { RunState } from '@/lib/agent'
import { cn } from '@/lib/cn'
import { Mockup } from '@/components/ui/Mockups'

type Tab = 'plan' | 'preview' | 'browser' | 'files' | 'console'

export function RunPanel({
  state,
  activeTab,
  onTabChange,
}: {
  state: RunState
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}) {
  const { t, l } = useI18n()
  const [selectedFile, setSelectedFile] = useState(0)

  const tabs: { id: Tab; label: string; icon: typeof Check; badge?: number }[] = [
    { id: 'plan', label: t('app.plan'), icon: Check },
    { id: 'preview', label: t('app.preview'), icon: Eye, badge: state.artifact ? 1 : 0 },
    { id: 'browser', label: t('app.browser'), icon: Globe2, badge: state.pages.length },
    { id: 'files', label: t('app.files'), icon: FileCode2, badge: state.files.length },
    { id: 'console', label: t('app.console'), icon: Terminal, badge: state.logs.length },
  ]

  const file = state.files[selectedFile]
  const done = state.plan.filter((s) => s.state === 'done').length

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface/50">
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-line px-2 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
              activeTab === tab.id ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
            )}
          >
            <tab.icon size={13} className={activeTab === tab.id ? 'text-accent' : undefined} />
            {tab.label}
            {tab.badge ? (
              <span className="rounded-full bg-accent/15 px-1.5 text-[10px] font-bold text-accent">{tab.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* PLAN */}
        {activeTab === 'plan' ? (
          <div className="p-4">
            {!state.plan.length ? (
              <p className="py-10 text-center text-[13px] text-faint">{t('app.emptySubtitle')}</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">
                    {t('app.stepProgress', { current: Math.min(done + 1, state.plan.length), total: state.plan.length })}
                  </span>
                  <span className="font-mono text-[11px] text-accent">
                    {state.credits} {t('pricing.creditsShort')}
                  </span>
                </div>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-surface-3">
                  <span
                    className="block h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${(done / state.plan.length) * 100}%` }}
                  />
                </div>
                <ul className="mt-4 space-y-1.5">
                  {state.plan.map((step, i) => (
                    <li
                      key={step.id}
                      className={cn(
                        'flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors',
                        step.state === 'active'
                          ? 'border-accent/35 bg-accent/[0.06]'
                          : step.state === 'done'
                            ? 'border-line bg-surface/40'
                            : 'border-line bg-transparent',
                      )}
                    >
                      <span className="mt-0.5 shrink-0">
                        {step.state === 'done' ? (
                          <Check size={14} className="text-accent" strokeWidth={3} />
                        ) : step.state === 'active' ? (
                          <CircleDashed size={14} className="animate-spin-slow text-accent" />
                        ) : (
                          <span className="block h-[14px] w-[14px] rounded-full border border-line-strong" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block text-[13px] font-medium leading-snug',
                            step.state === 'pending' ? 'text-faint' : 'text-fg',
                          )}
                        >
                          {i + 1}. {l(step.title)}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10.5px] text-faint">~{step.estimate}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : null}

        {/* PREVIEW */}
        {activeTab === 'preview' ? (
          <div className="flex h-full flex-col">
            {state.artifact ? (
              <>
                <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
                  <span className="truncate text-[12.5px] font-semibold text-fg">{l(state.artifact.title)}</span>
                  <a
                    href={'data:text/html;charset=utf-8,' + encodeURIComponent(state.artifact.html)}
                    download={state.artifact.fileName}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold text-muted transition-colors hover:border-accent/40 hover:text-accent"
                  >
                    <ExternalLink size={11} /> {t('app.downloadArtifact')}
                  </a>
                </div>
                <iframe
                  title={l(state.artifact.title)}
                  srcDoc={state.artifact.html}
                  sandbox="allow-scripts"
                  className="min-h-[420px] w-full flex-1 bg-white"
                />
                {state.artifact.downloads?.length ? (
                  <div className="border-t border-line px-4 py-3">
                    <span className="eyebrow">{t('app.downloads')}</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {state.artifact.downloads.map((file) => (
                        <a
                          key={file.name}
                          href={'data:' + file.mime + ';base64,' + file.base64}
                          download={file.name}
                          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11.5px] text-muted transition-colors hover:border-accent/40 hover:text-accent"
                        >
                          <FileCode2 size={12} className="text-accent" />
                          {file.name}
                          <span className="text-faint">{Math.round((file.base64.length * 3) / 4 / 1024) + ' KB'}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <p className="text-[13px] text-faint">{t('app.artifactEmpty')}</p>
                <div className="w-full max-w-sm opacity-40">
                  <Mockup kind="site" animate={false} />
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* BROWSER */}
        {activeTab === 'browser' ? (
          <div className="p-4">
            {!state.pages.length ? (
              <p className="py-10 text-center text-[13px] text-faint">{t('app.browserEmpty')}</p>
            ) : (
              <>
                <Mockup kind="browser" />
                <ul className="mt-4 space-y-2">
                  {state.pages.map((page, i) => (
                    <li key={i} className="rounded-xl border border-line bg-surface/40 p-3">
                      <span className="flex items-center gap-2 font-mono text-[11px] text-accent">
                        <Globe2 size={12} />
                        <span className="truncate">{page.url}</span>
                      </span>
                      <span className="mt-1 block text-[12.5px] font-semibold text-fg">{page.title}</span>
                      <span className="mt-0.5 block text-[12px] leading-snug text-muted">{l(page.note)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : null}

        {/* FILES */}
        {activeTab === 'files' ? (
          <div className="flex h-full min-h-0 flex-col lg:flex-row">
            {!state.files.length ? (
              <p className="p-4 text-center text-[13px] text-faint lg:py-10">{t('app.filesEmpty')}</p>
            ) : (
              <>
                <ul className="shrink-0 overflow-y-auto border-b border-line p-2 lg:w-52 lg:border-b-0 lg:border-r">
                  {state.files.map((f, i) => (
                    <li key={f.path}>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(i)}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                          i === selectedFile ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
                        )}
                      >
                        <FileCode2 size={13} className={i === selectedFile ? 'text-accent' : 'text-faint'} />
                        <span className="min-w-0 flex-1 truncate font-mono text-[11.5px]">{f.path}</span>
                        {f.bytes ? <span className="shrink-0 font-mono text-[10px] text-faint">{f.bytes}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
                <pre className="min-h-[240px] flex-1 overflow-auto bg-[#0a0a0f] p-4 font-mono text-[11.5px] leading-relaxed text-[#c9d1d9]">
                  <code>{file?.content}</code>
                </pre>
              </>
            )}
          </div>
        ) : null}

        {/* CONSOLE */}
        {activeTab === 'console' ? (
          <div className="min-h-[240px] bg-[#0a0a0f] p-4 font-mono text-[11.5px] leading-relaxed">
            {!state.logs.length ? (
              <p className="text-[#5c5c68]">{t('app.consoleEmpty')}</p>
            ) : (
              state.logs.map((line, i) => (
                <p key={i} className="animate-rise whitespace-pre-wrap text-[#9fe870]/85">
                  <span className="text-[#5c5c68]">{String(i + 1).padStart(2, '0')} </span>
                  {line}
                </p>
              ))
            )}
            {state.status === 'running' ? <p className="text-accent">▋</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
