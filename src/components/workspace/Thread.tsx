import { useEffect, useRef } from 'react'
import { ArrowDown, Check, Package, Wrench } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { RunState } from '@/lib/agent'
import { toolMeta } from '@/lib/agent'
import { cn } from '@/lib/cn'
import { scrollToNode } from '@/lib/dom'
import { LogoMark } from '@/components/Logo'

export function Thread({ state, onOpenArtifact }: { state: RunState; onOpenArtifact: () => void }) {
  const { t, l } = useI18n()
  const endRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const count =
    state.messages.length + state.thoughts.length + state.tools.length + state.logs.length + state.delivered.length

  useEffect(() => {
    scrollToNode(endRef.current, { behavior: 'smooth', block: 'end' })
  }, [count, state.artifact, state.status])

  const running = state.status === 'running'

  return (
    <div ref={scrollRef} className="relative flex-1 overflow-y-auto">
      <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
        {state.messages.map((message, i) =>
          message.role === 'user' ? (
            <div key={message.id} className="animate-rise flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md border border-line bg-surface-2 px-4 py-3 text-[14px] leading-relaxed text-fg">
                {l(message.text)}
              </div>
            </div>
          ) : (
            <div key={message.id} className="animate-rise flex gap-3">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-bg-elev text-fg">
                <LogoMark className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-faint">
                  {t('app.agentLabel')}
                </span>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-fg/90">{l(message.text)}</p>

                {/* artifact card, rendered right after the message that produced it */}
                {state.artifact && i === state.messages.length - 1 && message.role === 'agent' && state.status !== 'running' ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-accent/30 bg-accent/[0.06]">
                    <div className="flex items-center justify-between gap-3 border-b border-accent/20 px-4 py-3">
                      <span className="inline-flex items-center gap-2 text-[13px] font-bold text-fg">
                        <Package size={14} className="text-accent" />
                        {l(state.artifact.title)}
                      </span>
                      <span className="truncate font-mono text-[11px] text-muted">
                        {state.artifact.fileName}
                        {state.artifact.downloads?.length ? ' · +' + state.artifact.downloads.length + ' files' : ''}
                      </span>
                    </div>
                    <p className="px-4 py-2.5 text-[12.5px] text-muted">{l(state.artifact.note)}</p>
                    <button
                      type="button"
                      onClick={onOpenArtifact}
                      className="w-full border-t border-accent/20 bg-accent/10 px-4 py-2.5 text-[13px] font-bold text-accent transition-colors hover:bg-accent/16"
                    >
                      {t('app.openArtifact')} →
                    </button>
                  </div>
                ) : null}

                {state.delivered.length && i === state.messages.length - 1 ? (
                  <ul className="mt-4 space-y-1.5 rounded-2xl border border-line bg-surface/50 p-4">
                    {state.delivered.map((item) => (
                      <li key={item.en} className="flex items-start gap-2.5 text-[12.5px] leading-snug text-muted">
                        <Check size={13} className="mt-0.5 shrink-0 text-accent" strokeWidth={3} />
                        {l(item)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          ),
        )}

        {/* live reasoning + tool trace, grouped per active step */}
        {state.thoughts.length || state.tools.length ? (
          <div className="flex gap-3">
            <span className="mt-0.5 h-7 w-7 shrink-0" />
            <div className="min-w-0 flex-1 space-y-1.5">
              {state.plan.map((step, index) => {
                const thoughts = state.thoughts.filter((x) => x.stepId === step.id)
                const tools = state.tools.filter((x) => x.stepId === step.id)
                if (!thoughts.length && !tools.length) return null
                return (
                  <div key={step.id} className="rounded-xl border border-line bg-surface/40 px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          step.state === 'done' ? 'bg-accent' : step.state === 'active' ? 'animate-pulse-dot bg-accent' : 'bg-line-strong',
                        )}
                      />
                      <span className="text-[12.5px] font-semibold text-fg">{l(step.title)}</span>
                      <span className="ml-auto font-mono text-[10px] text-faint">
                        {index + 1}/{state.plan.length}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {thoughts.map((thought, ti) => {
                        const isLast =
                          step.state === 'active' && ti === thoughts.length - 1 && index === state.stepIndex
                        return (
                          <p
                            key={ti}
                            className={cn(
                              'text-[12.5px] leading-relaxed',
                              isLast ? 'text-muted' : 'text-faint',
                            )}
                          >
                            <span className="mr-1.5 text-accent/70">›</span>
                            {l(thought.text)}
                            {isLast && running ? <span className="animate-blink ml-0.5 text-accent">▋</span> : null}
                          </p>
                        )
                      })}
                      {tools.map((tool, ti) => (
                        <span
                          key={ti}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg-elev px-2 py-1 font-mono text-[11px] text-muted"
                        >
                          <Wrench size={11} className="text-accent" />
                          <b className="font-semibold text-fg">{toolMeta[tool.tool.name].glyph}</b>
                          {l(tool.tool.detail)}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {running && state.status === 'running' && !state.thoughts.length ? (
          <div className="flex items-center gap-2 pl-10 font-mono text-[12px] text-faint">
            <span className="animate-blink">●</span> {t('app.thinking')}…
          </div>
        ) : null}

        <div ref={endRef} />
      </div>

      {running ? (
        <button
          type="button"
          onClick={() => scrollToNode(endRef.current, { behavior: 'smooth' })}
          className="sticky bottom-3 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-bg-elev text-muted shadow-lg transition-colors hover:text-fg"
          aria-label="scroll"
        >
          <ArrowDown size={14} />
        </button>
      ) : null}
    </div>
  )
}
