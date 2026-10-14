import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import { useI18n } from '@/i18n'
import { featureBySlug, featurePages } from '@/data/features'
import { Reveal, Stagger, StaggerItem } from '@/lib/motion'
import { Icon } from '@/components/ui/Icon'
import { Mockup, type MockKind } from '@/components/ui/Mockups'
import { ButtonLink } from '@/components/ui/Button'
import { CTASection } from '@/components/home/CTASection'
import NotFound from './NotFound'

const planNames: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  max: 'Max',
  team: 'Team',
}

export default function Feature() {
  const { slug } = useParams()
  const { t, l } = useI18n()
  const feature = featureBySlug(slug)

  if (!feature) return <NotFound />

  const related = feature.related
    .map((s) => featurePages.find((f) => f.slug === s))
    .filter((f): f is (typeof featurePages)[number] => Boolean(f))

  return (
    <>
      <section className="relative overflow-hidden pb-14 pt-10 sm:pt-14">
        <div className="grid-bg mask-fade-b pointer-events-none absolute inset-0 -z-10 opacity-60" />
        <div className="shell">
          <Link
            to="/#capabilities"
            className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-muted transition-colors hover:text-fg"
          >
            <ArrowLeft size={14} /> {t('features.backToFeatures')}
          </Link>

          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
            <Reveal>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-accent">
                  <Icon name={feature.icon} size={20} />
                </span>
                <span className="eyebrow">{t('features.eyebrow')}</span>
                {feature.badge ? (
                  <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-accent">
                    {t('common.new')}
                  </span>
                ) : null}
              </div>

              <h1 className="h-display mt-5 text-[clamp(2rem,5vw,3.4rem)] text-fg">{l(feature.title)}</h1>
              <p className="mt-4 max-w-xl text-pretty text-[16px] font-medium leading-relaxed text-fg/85">
                {l(feature.tagline)}
              </p>
              <p className="mt-4 max-w-xl text-pretty text-[14.5px] leading-relaxed text-muted">{l(feature.lead)}</p>

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <ButtonLink href={'/app?scenario=' + feature.slug} size="lg">
                  {t('features.tryCta')}
                  <ArrowRight size={16} />
                </ButtonLink>
                <ButtonLink href="/pricing" variant="secondary" size="lg">
                  {t('common.seePricing')}
                </ButtonLink>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-baseline gap-2 rounded-2xl border border-line bg-surface/60 px-4 py-2.5">
                  <span className="font-mono text-[18px] font-bold text-accent">{feature.metric.value}</span>
                  <span className="text-[12.5px] text-muted">{l(feature.metric.label)}</span>
                </span>
                <span className="inline-flex items-center gap-2 rounded-2xl border border-line bg-surface/60 px-4 py-2.5 text-[12.5px] text-muted">
                  {t('features.includedIn')}
                  <b className="font-semibold text-fg">
                    {feature.minPlan === 'starter' ? t('features.plansAll') : planNames[feature.minPlan] + '+'}
                  </b>
                </span>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <Mockup kind={feature.mock as MockKind} />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-bg-elev py-16 sm:py-20">
        <div className="shell">
          <h2 className="eyebrow">{t('features.highlights')}</h2>
          <Stagger className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {feature.highlights.map((h) => (
              <StaggerItem key={h.title.en}>
                <div className="h-full rounded-2xl border border-line bg-surface/60 p-5 transition-colors hover:border-accent/30">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-bg text-accent">
                    <Icon name={h.icon} size={16} />
                  </span>
                  <h3 className="mt-4 text-[14.5px] font-bold tracking-[-0.01em] text-fg">{l(h.title)}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{l(h.text)}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="shell grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <h2 className="eyebrow">{t('features.overview')}</h2>
            <div className="mt-5 space-y-4">
              {feature.body.map((paragraph, i) => (
                <p key={i} className="text-pretty text-[15px] leading-relaxed text-muted">
                  {l(paragraph)}
                </p>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="eyebrow">{t('features.useCases')}</h2>
            <ul className="mt-5 space-y-3">
              {feature.useCases.map((useCase) => (
                <li key={useCase.en} className="flex items-start gap-3 rounded-xl border border-line bg-surface/50 p-4">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <span className="text-[14px] leading-snug text-fg">{l(useCase)}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {related.length ? (
        <section className="border-t border-line bg-bg-elev py-16">
          <div className="shell">
            <h2 className="eyebrow">{t('features.related')}</h2>
            <Stagger className="mt-6 grid gap-3 sm:grid-cols-3">
              {related.map((r) => (
                <StaggerItem key={r.slug}>
                  <Link
                    to={'/features/' + r.slug}
                    className="group flex h-full items-start gap-3 rounded-2xl border border-line bg-surface/60 p-5 transition-all hover:-translate-y-1 hover:border-accent/35"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-bg text-accent">
                      <Icon name={r.icon} size={16} />
                    </span>
                    <span>
                      <span className="block text-[14.5px] font-bold tracking-[-0.01em] text-fg">{l(r.title)}</span>
                      <span className="mt-1 line-clamp-2 block text-[12.5px] leading-snug text-muted">{l(r.tagline)}</span>
                    </span>
                    <ArrowRight
                      size={15}
                      className="ml-auto shrink-0 text-faint transition-transform group-hover:translate-x-0.5"
                    />
                  </Link>
                </StaggerItem>
              ))}
            </Stagger>
          </div>
        </section>
      ) : null}

      <CTASection />
    </>
  )
}
