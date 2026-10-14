import { useEffect, useMemo, useState } from 'react'
import { Check, CircleDashed } from 'lucide-react'
import { useI18n } from '@/i18n'
import { scenarios } from '@/data/scenarios'
import { cn } from '@/lib/cn'
import { Mockup, type MockKind } from '@/components/ui/Mockups'

const mockByScenario: Record<string, MockKind> = {
  site: 'site',
  deck: 'slides',
  research: 'report',
  game: 'game',
}

/**
 * Auto-playing "live run" panel: cycles a scenario's plan steps while the
 * matching mockup renders beside it. Purely presentational — the real,
 * interactive engine lives in the workspace route.
 */
export function HeroRunPreview() {
  const { l, locale } = useI18n()
  const [scenarioIndex, setScenarioIndex] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)

  const scenario = scenarios[scenarioIndex]
  const steps = scenario.steps
  const mock = mockByScenario[scenario.id] ?? 'site'

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const timer = window.setInterval(() => {
      setStepIndex((current) => {
        if (current + 1 >= steps.length) {
          setScenarioIndex((s) => (s + 1) % scenarios.length)
          return 0
        }
        return current + 1
      })
    }, 2400)
    return () => window.clearInterval(timer)
  }, [steps.length, scenarioIndex])

  const progress = useMemo(() => Math.round(((stepIndex + 1) / steps.length) * 100), [stepIndex, steps.length])
  const credits = steps.slice(0, stepIndex + 1).reduce((sum, s) => sum + s.credits, 0)

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-x-10 -top-16 bottom-0 -z-10 opacity-70"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)',
        }}
      />
      <div className="grid gap-3 rounded-[28px] border border-line bg-bg-elev/70 p-3 backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-4 lg:p-4">
        {/* Run log */}
        <div className="flex flex-col rounded-2xl border border-line bg-surface/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">
              <span className="animate-pulse-dot h-1.5 w-1.5 rounded-full bg-accent" />
              {l(scenario.label)} · run
            </span>
            <span className="font-mono text-[10.5px] text-faint">{credits} cr</span>
          </div>

          <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{l(scenario.prompt)}</p>

          <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-3">
            <span
              className="block h-full rounded-full bg-accent transition-all duration-700 ease-out"
              style={{ width: progress + '%' }}
            />
          </div>

          <ul className="mt-4 flex flex-col gap-1.5">
            {steps.map((step, i) => {
              const state = i < stepIndex ? 'done' : i === stepIndex ? 'active' : 'pending'
              return (
                <li
                  key={step.id}
                  className={cn(
                    'flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors',
                    state === 'active' && 'bg-surface-2',
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {state === 'done' ? (
                      <Check size={13} className="text-accent" strokeWidth={2.6} />
                    ) : state === 'active' ? (
                      <CircleDashed size={13} className="animate-spin-slow text-accent" />
                    ) : (
                      <span className="block h-[13px] w-[13px] rounded-full border border-line-strong" />
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-[12.5px] leading-snug',
                      state === 'pending' ? 'text-faint' : state === 'active' ? 'text-fg' : 'text-muted line-through decoration-faint/50',
                    )}
                  >
                    {l(step.title)}
                  </span>
                </li>
              )
            })}
          </ul>

          <div className="mt-auto hidden gap-1.5 pt-4 sm:flex">
            {scenarios.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setScenarioIndex(i)
                  setStepIndex(0)
                }}
                aria-label={l(s.label)}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-colors',
                  i === scenarioIndex ? 'bg-accent' : 'bg-surface-3 hover:bg-line-strong',
                )}
              />
            ))}
          </div>
        </div>

        {/* Artifact preview */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-surface/40 p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">
              {locale === 'ru' ? 'артефакт' : 'artifact'}
            </span>
            <span className="font-mono text-[10.5px] text-faint">{scenario.runtime}</span>
          </div>
          <Mockup kind={mock} animate={false} />
        </div>
      </div>
    </div>
  )
}
