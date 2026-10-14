import { useState } from 'react'
import { LifeBuoy, ShieldCheck } from 'lucide-react'
import { useI18n } from '@/i18n'
import { plans } from '@/data/pricing'
import { securityBadges } from '@/data/home'
import { Reveal } from '@/lib/motion'
import { BillingToggle, type Billing } from '@/components/pricing/BillingToggle'
import { PlanCard } from '@/components/pricing/PlanCard'
import { CompareTable } from '@/components/pricing/CompareTable'
import { FAQ } from '@/components/home/FAQ'
import { CTASection } from '@/components/home/CTASection'
import { ButtonLink } from '@/components/ui/Button'
import { SITE } from '@/data/site'

export default function Pricing() {
  const { t, l } = useI18n()
  const [billing, setBilling] = useState<Billing>('monthly')
  const team = plans.find((p) => p.id === 'team')

  return (
    <>
      <section className="relative overflow-hidden pb-16 pt-14 sm:pt-20">
        <div className="grid-bg mask-fade-b pointer-events-none absolute inset-0 -z-10 opacity-60" />
        <div className="shell flex flex-col items-center text-center">
          <span className="eyebrow">{t('pricing.eyebrow')}</span>
          <h1 className="h-display mt-4 text-[clamp(2.2rem,6vw,4rem)] text-fg">{t('pricing.title')}</h1>
          <p className="mt-5 max-w-2xl text-pretty text-[15px] leading-relaxed text-muted">{t('pricing.subtitle')}</p>
          <div className="mt-8">
            <BillingToggle value={billing} onChange={setBilling} />
          </div>
          <p className="mt-3 font-mono text-[11.5px] uppercase tracking-[0.1em] text-faint">{t('pricing.billingNote')}</p>
        </div>
      </section>

      <section className="pb-16">
        <div className="shell">
          <Reveal className="grid gap-4 lg:grid-cols-3">
            {plans.filter((p) => p.id !== 'team').map((plan) => (
              <PlanCard key={plan.id} plan={plan} billing={billing} />
            ))}
          </Reveal>

          {team ? (
            <Reveal className="mt-4 overflow-hidden rounded-3xl border border-line bg-bg-elev">
              <div className="grid gap-8 p-7 lg:grid-cols-[1.1fr_1fr] lg:p-9">
                <div>
                  <span className="eyebrow">{t('pricing.teamTitle')}</span>
                  <h2 className="mt-3 text-[clamp(1.4rem,2.6vw,1.9rem)] font-extrabold tracking-[-0.03em] text-fg">
                    {l(team.summary)}
                  </h2>
                  <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-muted">{t('pricing.teamSubtitle')}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <ButtonLink href={`mailto:${SITE.email}?subject=${encodeURIComponent('RS-BUILDER Team plan')}`}>
                      {t('pricing.teamCta')}
                    </ButtonLink>
                    <ButtonLink href="/features/automations" variant="secondary">
                      {t('pricing.teamLearn')}
                    </ButtonLink>
                  </div>
                </div>
                <ul className="grid gap-2.5 self-center sm:grid-cols-2">
                  {team.features.map((feature) => (
                    <li
                      key={feature.en}
                      className="rounded-xl border border-line bg-surface/60 px-3.5 py-3 text-[13px] leading-snug text-muted"
                    >
                      {l(feature)}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ) : null}

          <Reveal id="security" className="mt-4 scroll-mt-24 rounded-3xl border border-line bg-surface/50 p-7 lg:p-9">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-accent" />
              <h2 className="text-[17px] font-bold tracking-[-0.02em] text-fg">{t('pricing.securityTitle')}</h2>
            </div>
            <p className="mt-2 text-[13.5px] text-muted">{t('pricing.securitySubtitle')}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {securityBadges.map((badge) => (
                <div key={badge.label.en} className="rounded-2xl border border-line bg-bg-elev/70 p-4">
                  <span className="block text-[13.5px] font-bold text-fg">{l(badge.label)}</span>
                  <span className="mt-1 block text-[12.5px] leading-snug text-muted">{l(badge.detail)}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-line bg-bg-elev py-16 sm:py-20">
        <div className="shell">
          <h2 className="h-display text-center text-[clamp(1.6rem,3.4vw,2.4rem)] text-fg">{t('pricing.compareTitle')}</h2>
          <Reveal className="mt-10">
            <CompareTable />
          </Reveal>
        </div>
      </section>

      <FAQ />

      <section className="py-14">
        <div className="shell">
          <Reveal className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-line bg-surface/50 p-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <LifeBuoy size={18} className="text-accent" />
              <span className="text-[14.5px] text-muted">{t('pricing.helpTitle')}</span>
            </div>
            <ButtonLink href="/#faq" variant="secondary" size="sm">{t('pricing.helpCta')}</ButtonLink>
          </Reveal>
        </div>
      </section>

      <CTASection />
    </>
  )
}
