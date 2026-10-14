import { useState } from 'react'
import { useI18n } from '@/i18n'
import { plans } from '@/data/pricing'
import { BillingToggle, type Billing } from './BillingToggle'
import { PlanCard } from './PlanCard'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ButtonLink } from '@/components/ui/Button'
import { Reveal } from '@/lib/motion'

export function PricingTeaser() {
  const { t } = useI18n()
  const [billing, setBilling] = useState<Billing>('monthly')

  return (
    <section id="pricing-teaser" className="scroll-mt-24 py-20 sm:py-28">
      <div className="shell">
        <SectionHeading
          eyebrow={t('pricingTeaser.eyebrow')}
          title={t('pricingTeaser.title')}
          subtitle={t('pricingTeaser.subtitle')}
          aside={<BillingToggle value={billing} onChange={setBilling} />}
        />
        <Reveal className="mt-12 grid gap-4 lg:grid-cols-3">
          {plans.slice(0, 3).map((plan) => (
            <PlanCard key={plan.id} plan={plan} billing={billing} />
          ))}
        </Reveal>
        <div className="mt-8 flex justify-center">
          <ButtonLink href="/pricing" variant="secondary" size="lg">{t('pricingTeaser.cta')}</ButtonLink>
        </div>
      </div>
    </section>
  )
}
