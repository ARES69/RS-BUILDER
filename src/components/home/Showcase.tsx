import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Clock, Coins, FileStack } from 'lucide-react'
import { useI18n } from '@/i18n'
import { showcase } from '@/data/home'
import { cn } from '@/lib/cn'
import { Reveal } from '@/lib/motion'
import { Mockup, type MockKind } from '@/components/ui/Mockups'
import { SectionHeading } from '@/components/ui/SectionHeading'

const mockKind: Record<string, MockKind> = {
  site: 'site',
  slides: 'slides',
  report: 'report',
  game: 'game',
  video: 'video',
}

export function Showcase() {
  const { t, l } = useI18n()
  const [active, setActive] = useState(0)
  const navigate = useNavigate()
  const item = showcase[active]

  return (
    <section id="showcase" className="scroll-mt-24 py-20 sm:py-28">
      <div className="shell">
        <SectionHeading eyebrow={t('showcase.eyebrow')} title={t('showcase.title')} subtitle={t('showcase.subtitle')} />

        <Reveal className="mt-10 flex flex-wrap justify-center gap-2">
          {showcase.map((s, i) => (
            <button
              key={s.slug}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'rounded-full border px-4 py-2 text-[13px] font-semibold transition-all',
                i === active
                  ? 'border-accent/45 bg-accent/12 text-fg'
                  : 'border-line bg-surface/60 text-muted hover:border-line-strong hover:text-fg',
              )}
            >
              {l(s.title)}
            </button>
          ))}
        </Reveal>

        <Reveal className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface/40 p-3 sm:p-4">
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{ background: `radial-gradient(70% 60% at 20% 0%, ${item.accent}1f, transparent 70%)` }}
            />
            <div key={item.slug} className="animate-pop relative">
              <Mockup kind={mockKind[item.kind] ?? 'site'} />
            </div>
          </div>

          <div className="flex flex-col rounded-3xl border border-line bg-surface/60 p-6">
            <h3 className="text-[20px] font-bold tracking-[-0.02em] text-fg">{l(item.title)}</h3>

            <div className="mt-4">
              <span className="eyebrow">{t('showcase.promptLabel')}</span>
              <p className="mt-2 rounded-xl border border-line bg-bg-elev/70 p-3.5 font-mono text-[12.5px] leading-relaxed text-muted">
                {l(item.prompt)}
              </p>
            </div>

            <div className="mt-5 flex flex-wrap gap-4 text-[12.5px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} className="text-accent" /> {t('showcase.durationLabel')}: {item.runtime}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Coins size={14} className="text-accent" /> {item.credits} {t('pricing.creditsShort')}
              </span>
            </div>

            <div className="mt-5">
              <span className="eyebrow inline-flex items-center gap-1.5">
                <FileStack size={13} className="text-accent" /> {t('showcase.artifactsLabel')}
              </span>
              <ul className="mt-2.5 space-y-2">
                {item.artifacts.map((a) => (
                  <li key={a.en} className="flex items-start gap-2.5 text-[13.5px] text-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: item.accent }} />
                    {l(a)}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={() => navigate('/app?scenario=' + item.slug)}
              className="group mt-auto inline-flex items-center gap-2 self-start rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-bold text-accent-ink transition-all hover:-translate-y-px hover:bg-accent-strong"
            >
              {t('showcase.openRun')}
              <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
