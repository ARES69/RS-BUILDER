import { useNavigate } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useI18n } from '@/i18n'
import { Composer } from './Composer'
import { LiveBoard } from './LiveBoard'
import { Marquee } from '@/components/ui/Marquee'
import { integrations } from '@/data/home'

export function Hero() {
  const { t } = useI18n()
  const navigate = useNavigate()

  const run = (prompt: string) => navigate('/app?prompt=' + encodeURIComponent(prompt))

  return (
    <section className="relative overflow-hidden">
      {/* backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="grid-bg mask-fade-b absolute inset-0 opacity-70" />
        <div
          className="absolute inset-x-0 top-[-14rem] h-[34rem]"
          style={{
            background:
              'radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 72%)',
          }}
        />
        <div
          className="absolute left-1/2 top-24 h-[26rem] w-[46rem] -translate-x-1/2 opacity-60 blur-3xl"
          style={{
            background:
              'radial-gradient(45% 45% at 30% 40%, color-mix(in srgb, var(--violet) 22%, transparent), transparent 70%)',
          }}
        />
      </div>

      <div className="shell relative flex flex-col items-center pt-14 text-center sm:pt-20 lg:pt-24">
        <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-1.5 text-[12px] font-medium text-muted backdrop-blur">
          <Sparkles size={13} className="text-accent" />
          {t('hero.badge')}
          <span className="h-3 w-px bg-line-strong" />
          <span className="font-mono text-[11px] text-faint">v2.0</span>
        </span>

        <h1 className="h-display animate-rise mt-6 text-[clamp(2.6rem,8vw,5.6rem)] text-fg" style={{ animationDelay: '60ms' }}>
          {t('hero.titleA')}
          <br />
          <span
            className="animate-sheen bg-clip-text text-transparent"
            style={{
              backgroundImage:
                'linear-gradient(100deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 55%, var(--cyan)) 45%, var(--accent) 90%)',
            }}
          >
            {t('hero.titleB')}
          </span>
        </h1>

        <p
          className="animate-rise mt-6 max-w-2xl text-pretty text-[15.5px] leading-relaxed text-muted sm:text-[17px]"
          style={{ animationDelay: '120ms' }}
        >
          {t('hero.subtitle')}
        </p>

        <div className="animate-rise mt-9 w-full max-w-3xl text-left" style={{ animationDelay: '180ms' }}>
          <Composer onRun={run} />
        </div>

        <div className="animate-rise mt-14 w-full max-w-5xl" style={{ animationDelay: '240ms' }}>
          <LiveBoard />
        </div>

        <div className="mt-16 w-full pb-4">
          <p className="eyebrow">{t('hero.trustedBy')}</p>
          <Marquee className="mt-5" itemClassName="opacity-60">
            {integrations.map((name) => (
              <span key={name} className="whitespace-nowrap text-[15px] font-semibold tracking-tight text-muted">
                {name}
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  )
}
