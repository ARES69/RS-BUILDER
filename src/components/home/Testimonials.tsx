import { Quote } from 'lucide-react'
import { useI18n } from '@/i18n'
import { testimonials } from '@/data/home'
import { Stagger, StaggerItem } from '@/lib/motion'
import { SectionHeading } from '@/components/ui/SectionHeading'

export function Testimonials() {
  const { t, l } = useI18n()
  return (
    <section id="customers" className="scroll-mt-24 py-20 sm:py-28">
      <div className="shell">
        <SectionHeading eyebrow={t('testimonials.eyebrow')} title={t('testimonials.title')} />
        <Stagger className="mt-12 columns-1 gap-3 md:columns-2 lg:columns-3 [&>*]:mb-3">
          {testimonials.map((item) => (
            <StaggerItem key={item.name} className="break-inside-avoid">
              <figure className="rounded-2xl border border-line bg-surface/60 p-5 transition-colors hover:border-line-strong">
                <Quote size={16} className="text-accent" />
                <blockquote className="mt-3 text-[14px] leading-relaxed text-fg">{l(item.quote)}</blockquote>
                <figcaption className="mt-4 flex items-center gap-3 border-t border-line pt-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3 font-mono text-[11.5px] font-bold text-muted">
                    {item.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-fg">{item.name}</span>
                    <span className="block truncate text-[12px] text-muted">
                      {l(item.role)} · {item.company}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
