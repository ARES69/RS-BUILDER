import { Check } from 'lucide-react'
import { useI18n } from '@/i18n'
import type { Plan } from '@/data/pricing'
import { cn } from '@/lib/cn'
import { useCountUp, useInView } from '@/lib/hooks'
import { ButtonLink } from '@/components/ui/Button'
import type { Billing } from './BillingToggle'

function Price({ value, billing, label }: { value: number; billing: Billing; label?: string }) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const animated = useCountUp(value, 650, inView || value === 0)

  if (value < 0) {
    return <span className="text-[clamp(2rem,4vw,2.6rem)] font-extrabold tracking-[-0.04em] text-fg">{label}</span>
  }

  return (
    <span ref={ref} className="flex items-baseline gap-1">
      <span className="text-[clamp(2rem,4vw,2.6rem)] font-extrabold tracking-[-0.04em] text-fg tabular-nums">
        ${Math.round(animated)}
      </span>
      <span className="text-[13px] font-medium text-muted">{billing === 'annual' ? label : label}</span>
    </span>
  )
}

export function PlanCard({ plan, billing, compact = false }: { plan: Plan; billing: Billing; compact?: boolean }) {
  const { t, l } = useI18n()
  const price = billing === 'annual' ? plan.priceAnnual : plan.priceMonthly
  const featured = Boolean(plan.highlight)

  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-3xl border p-6 transition-all duration-300',
        featured
          ? 'border-accent/40 bg-surface shadow-[0_30px_80px_-40px_color-mix(in_srgb,var(--accent)_55%,transparent)]'
          : 'border-line bg-surface/60 hover:border-line-strong',
        compact && 'p-5',
      )}
    >
      {featured ? (
        <>
          <span
            className="pointer-events-none absolute inset-x-0 -top-24 h-48"
            style={{ background: 'radial-gradient(50% 60% at 50% 60%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 70%)' }}
          />
          <span className="absolute right-5 top-5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-accent-ink">
            {t('common.popular')}
          </span>
        </>
      ) : null}

      <div className="relative">
        <h3 className="text-[15px] font-bold uppercase tracking-[0.1em] text-fg">{plan.name}</h3>
        <div className="mt-4">
          <Price
            value={price}
            billing={billing}
            label={plan.priceLabel ? l(plan.priceLabel) : t('common.perMonth')}
          />
        </div>
        {plan.priceMonthly > 0 ? (
          <p className="mt-1.5 text-[12px] text-faint">
            {billing === 'annual' ? t('pricing.annualNote') : t('pricing.monthlyNote')}
          </p>
        ) : plan.priceMonthly === 0 ? (
          <p className="mt-1.5 text-[12px] text-faint">{t('pricing.freeForever')}</p>
        ) : null}

        <p className="mt-4 text-[13.5px] leading-relaxed text-muted">{l(plan.summary)}</p>

        <div className="mt-5">
          {plan.cta === 'signup' ? (
            <ButtonLink href="/signup" variant={featured ? 'primary' : 'secondary'} full>
              {t('pricing.getStarted')}
            </ButtonLink>
          ) : (
            <ButtonLink href={`mailto:hello@rs-builder.app?subject=${encodeURIComponent('RS-BUILDER Team plan')}`} variant="secondary" full>
              {t('pricing.talkToUs')}
            </ButtonLink>
          )}
        </div>
      </div>

      {plan.credits > 0 ? (
        <div className="relative mt-6 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-line bg-bg-elev/60 p-3">
            <span className="block font-mono text-[16px] font-bold text-accent tabular-nums">
              {plan.credits.toLocaleString('en-US')}
            </span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted">{t('pricing.creditsShort')}</span>
          </div>
          <div className="rounded-xl border border-line bg-bg-elev/60 p-3">
            <span className="block font-mono text-[16px] font-bold text-fg tabular-nums">{plan.refreshCredits}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-muted">
              {l({ en: 'refresh / day', ru: 'refresh / день' })}
            </span>
          </div>
        </div>
      ) : null}

      <ul className="relative mt-5 flex flex-col gap-2.5 border-t border-line pt-5">
        {plan.features.map((feature) => (
          <li key={feature.en} className="flex items-start gap-2.5 text-[13px] leading-snug text-muted">
            <Check size={14} className="mt-0.5 shrink-0 text-accent" strokeWidth={2.6} />
            {l(feature)}
          </li>
        ))}
      </ul>
    </div>
  )
}
