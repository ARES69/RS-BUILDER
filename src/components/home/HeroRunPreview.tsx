import { useEffect, useMemo, useState } from 'react'
import { Check, CircleDashed } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { Localized } from '@/i18n'

/** Presentational reel for the landing hero: own tiny script, no agent engine. */
type ReelStep = { id: string; title: Localized; credits: number }
type Reel = { id: string; label: Localized; prompt: Localized; runtime: string; steps: ReelStep[] }
const REEL: Reel[] = [
  {
    id: 'site',
    label: { en: 'Landing page', ru: 'Лендинг' },
    prompt: { en: 'Single-origin coffee subscription landing', ru: 'Лендинг подписки на моносортный кофе' },
    runtime: '4m 12s',
    steps: [
      { id: 's1', title: { en: 'Define structure and copy angle', ru: 'Определить структуру и подачу' }, credits: 40 },
      { id: 's2', title: { en: 'Generate palette and type scale', ru: 'Сгенерировать палитру и типографику' }, credits: 60 },
      { id: 's3', title: { en: 'Build the page and components', ru: 'Собрать страницу и компоненты' }, credits: 160 },
      { id: 's4', title: { en: 'Responsive pass, audit and deploy', ru: 'Адаптив, аудит и деплой' }, credits: 60 },
    ],
  },
  {
    id: 'deck',
    label: { en: 'Investor deck', ru: 'Инвест-дек' },
    prompt: { en: 'Seed deck from our metrics CSV', ru: 'Seed-дек из наших метрик' },
    runtime: '6m 48s',
    steps: [
      { id: 's5', title: { en: 'Extract metrics and narrative', ru: 'Вытащить метрики и нарратив' }, credits: 80 },
      { id: 's6', title: { en: 'Compose seven slides', ru: 'Сложить семь слайдов' }, credits: 220 },
      { id: 's7', title: { en: 'Render deck and export', ru: 'Отрендерить дек и экспортировать' }, credits: 240 },
    ],
  },
  {
    id: 'research',
    label: { en: 'Market scan', ru: 'Сканирование рынка' },
    prompt: { en: 'Map of AI coding tools sold in the EU', ru: 'Карта ИИ-инструментов кодинга в ЕС' },
    runtime: '21m 05s',
    steps: [
      { id: 's8', title: { en: 'Plan the slice fleet', ru: 'Спланировать флот срезов' }, credits: 120 },
      { id: 's9', title: { en: 'Fetch and cross-check sources', ru: 'Собрать и перепроверить источники' }, credits: 900 },
      { id: 's10', title: { en: 'Merge the report', ru: 'Слить отчёт' }, credits: 820 },
    ],
  },
  {
    id: 'game',
    label: { en: 'Arcade game', ru: 'Аркада' },
    prompt: { en: 'One-button arcade with real juice', ru: 'Аркада на одну кнопку с сочностью' },
    runtime: '9m 33s',
    steps: [
      { id: 's11', title: { en: 'Design the loop and juice', ru: 'Придумать цикл и сочность' }, credits: 90 },
      { id: 's12', title: { en: 'Build canvas engine', ru: 'Собрать canvas-движок' }, credits: 430 },
      { id: 's13', title: { en: 'Playtest and ship', ru: 'Плейтест и отгрузка' }, credits: 240 },
    ],
  },
]
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

  const scenario = REEL[scenarioIndex]
  const steps = scenario.steps
  const mock = mockByScenario[scenario.id] ?? 'site'

  useEffect(() => {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const timer = window.setInterval(() => {
      setStepIndex((current) => {
        if (current + 1 >= steps.length) {
          setScenarioIndex((s) => (s + 1) % REEL.length)
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
            {REEL.map((s, i) => (
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
