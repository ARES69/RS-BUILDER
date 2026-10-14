import { useI18n } from '@/i18n'
import { Reveal } from '@/lib/motion'
import { ButtonLink } from '@/components/ui/Button'

export function CTASection() {
  const { t } = useI18n()
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="shell">
        <Reveal>
          <div className="noise relative overflow-hidden rounded-[32px] border border-line bg-bg-elev px-6 py-16 text-center sm:px-12 sm:py-20">
            <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
            <div
              className="pointer-events-none absolute inset-x-0 -top-24 h-72"
              style={{
                background:
                  'radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)',
              }}
            />
            <div className="relative">
              <h2 className="h-display mx-auto max-w-3xl text-balance text-[clamp(2rem,5vw,3.6rem)] text-fg">
                {t('cta.title')}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-[15px] leading-relaxed text-muted sm:text-base">
                {t('cta.subtitle')}
              </p>
              <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
                <ButtonLink href="/signup" size="lg">{t('cta.primary')}</ButtonLink>
                <ButtonLink href="/app" variant="secondary" size="lg">{t('common.liveDemo')}</ButtonLink>
              </div>
              <p className="mt-6 font-mono text-[11.5px] uppercase tracking-[0.1em] text-faint">{t('cta.note')}</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
