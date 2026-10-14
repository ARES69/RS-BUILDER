import { useI18n } from '@/i18n'
import { workflowSteps } from '@/data/home'
import { Stagger, StaggerItem } from '@/lib/motion'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ButtonLink } from '@/components/ui/Button'

export function Workflow() {
  const { t, l } = useI18n()

  return (
    <section id="workflow" className="relative scroll-mt-24 overflow-hidden border-y border-line bg-bg-elev py-20 sm:py-28">
      <div className="grid-bg-sm pointer-events-none absolute inset-0 opacity-40" />
      <div className="shell relative">
        <SectionHeading eyebrow={t('workflow.eyebrow')} title={t('workflow.title')} subtitle={t('workflow.subtitle')} />

        <div className="relative mt-14">
          <span className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-line-strong to-transparent lg:block" />
          <Stagger className="grid gap-4 lg:grid-cols-4">
            {workflowSteps.map((step) => (
              <StaggerItem key={step.index}>
                <div className="group relative h-full rounded-2xl border border-line bg-surface/70 p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-accent/35">
                  <div className="flex items-center gap-3">
                    <span className="relative z-10 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-bg text-accent">
                      <Icon name={step.icon} size={17} />
                    </span>
                    <span className="font-mono text-[12px] tracking-[0.14em] text-faint">{step.index}</span>
                  </div>
                  <h3 className="mt-4 text-[16.5px] font-bold tracking-[-0.02em] text-fg">{l(step.title)}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{l(step.description)}</p>
                  <p className="mt-4 border-t border-line pt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-accent/80">
                    {l(step.detail)}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/app" size="lg">{t('workflow.ctaPrimary')}</ButtonLink>
          <ButtonLink href="/features/webapp" variant="secondary" size="lg">{t('workflow.ctaSecondary')}</ButtonLink>
        </div>
      </div>
    </section>
  )
}
