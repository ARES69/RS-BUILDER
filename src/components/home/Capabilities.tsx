import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useI18n } from '@/i18n'
import { capabilities } from '@/data/home'
import { cn } from '@/lib/cn'
import { Stagger, StaggerItem } from '@/lib/motion'
import { Icon } from '@/components/ui/Icon'
import { SectionHeading } from '@/components/ui/SectionHeading'

export function Capabilities() {
  const { t, l } = useI18n()

  return (
    <section id="capabilities" className="scroll-mt-24 py-20 sm:py-28">
      <div className="shell">
        <SectionHeading eyebrow={t('capabilities.eyebrow')} title={t('capabilities.title')} subtitle={t('capabilities.subtitle')} />

        <Stagger className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((cap) => (
            <StaggerItem key={cap.slug} className={cn(cap.span && 'lg:col-span-2')}>
              <Link
                to={'/features/' + cap.slug}
                className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:bg-surface"
              >
                <span
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background:
                      'radial-gradient(80% 60% at 20% 0%, color-mix(in srgb, var(--accent) 12%, transparent), transparent 70%)',
                  }}
                />
                <span className="relative flex items-start justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-bg-elev text-accent transition-transform duration-300 group-hover:scale-105">
                    <Icon name={cap.icon} size={18} />
                  </span>
                  <span className="flex items-center gap-2">
{cap.badge ? (
                      <span
                        className={
                          cap.badge === 'beta'
                            ? 'rounded-full bg-violet/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-violet'
                            : 'rounded-full bg-accent/15 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] text-accent'
                        }
                      >
                        {cap.badge === 'beta' ? t('common.beta') : t('common.new')}
                      </span>
                    ) : null}
                    <ArrowUpRight
                      size={16}
                      className="text-faint opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
                    />
                  </span>
                </span>
                <h3 className="relative mt-4 text-[16.5px] font-bold tracking-[-0.02em] text-fg">{l(cap.title)}</h3>
                <p className="relative mt-2 text-[13.5px] leading-relaxed text-muted">{l(cap.description)}</p>
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
