import { Check } from 'lucide-react'
import { useI18n } from '@/i18n'
import { Reveal } from '@/lib/motion'
import { Mockup } from '@/components/ui/Mockups'
import { ButtonLink } from '@/components/ui/Button'

export function WideResearch() {
  const { t } = useI18n()
  return (
    <section id="wide-research" className="scroll-mt-24 border-y border-line bg-bg-elev py-20 sm:py-28">
      <div className="shell grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <Reveal className="order-2 lg:order-1">
          <span className="eyebrow">{t('wideResearch.eyebrow')}</span>
          <h2 className="h-display mt-4 text-[clamp(1.9rem,4vw,3rem)] text-fg">{t('wideResearch.title')}</h2>
          <p className="mt-4 max-w-xl text-pretty text-[15px] leading-relaxed text-muted">{t('wideResearch.subtitle')}</p>
          <ul className="mt-6 space-y-3">
            {[t('wideResearch.bullet1'), t('wideResearch.bullet2'), t('wideResearch.bullet3')].map((b) => (
              <li key={b} className="flex items-start gap-3 text-[14px] text-fg">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Check size={12} strokeWidth={3} />
                </span>
                {b}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <ButtonLink href="/features/wide-research" variant="secondary">{t('wideResearch.cta')}</ButtonLink>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="order-1 lg:order-2">
          <Mockup kind="fleet" />
        </Reveal>
      </div>
    </section>
  )
}
