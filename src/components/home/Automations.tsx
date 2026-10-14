import { useI18n } from '@/i18n'
import { Reveal } from '@/lib/motion'
import { Mockup } from '@/components/ui/Mockups'
import { ButtonLink } from '@/components/ui/Button'

export function Automations() {
  const { t } = useI18n()
  return (
    <section id="automations" className="scroll-mt-24 py-20 sm:py-28">
      <div className="shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <Mockup kind="schedule" />
        </Reveal>
        <Reveal delay={0.1}>
          <span className="eyebrow">{t('automations.eyebrow')}</span>
          <h2 className="h-display mt-4 text-[clamp(1.9rem,4vw,3rem)] text-fg">{t('automations.title')}</h2>
          <p className="mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-muted">{t('automations.subtitle')}</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/features/automations">{t('automations.cta')}</ButtonLink>
            <span className="font-mono text-[12px] text-faint">
              {t('automations.scheduleHint')} <span className="text-accent">06:12:44</span>
            </span>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
