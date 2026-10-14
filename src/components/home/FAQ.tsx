import { useState } from 'react'
import { Plus } from 'lucide-react'
import { useI18n } from '@/i18n'
import { faqs } from '@/data/faq'
import { cn } from '@/lib/cn'
import { Reveal } from '@/lib/motion'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ButtonLink } from '@/components/ui/Button'

export function FAQ({ limit }: { limit?: number }) {
  const { t, l } = useI18n()
  const [open, setOpen] = useState<number | null>(0)
  const items = limit ? faqs.slice(0, limit) : faqs

  return (
    <section id="faq" className="scroll-mt-24 border-t border-line bg-bg-elev py-20 sm:py-28">
      <div className="shell grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <SectionHeading
          align="left"
          eyebrow={t('faq.eyebrow')}
          title={t('faq.title')}
          subtitle={t('faq.subtitle')}
          className="lg:sticky lg:top-24 lg:self-start"
          aside={
            <ButtonLink href="/features/deep-research" variant="secondary" size="sm">
              {t('faq.cta')}
            </ButtonLink>
          }
        />
        <Reveal className="divide-y divide-[color:var(--border)] border-y border-line">
          {items.map((faq, i) => {
            const isOpen = open === i
            return (
              <div key={faq.q.en}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className={cn('text-[15px] font-semibold transition-colors', isOpen ? 'text-fg' : 'text-muted hover:text-fg')}>
                    {l(faq.q)}
                  </span>
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all duration-300',
                      isOpen ? 'rotate-45 border-accent/40 bg-accent/12 text-accent' : 'border-line text-faint',
                    )}
                  >
                    <Plus size={14} strokeWidth={2.4} />
                  </span>
                </button>
                <div
                  className="grid transition-all duration-300 ease-out"
                  style={{ gridTemplateRows: isOpen ? '1fr' : '0fr', opacity: isOpen ? 1 : 0 }}
                >
                  <div className="overflow-hidden">
                    <p className="pb-5 pr-10 text-[14px] leading-relaxed text-muted">{l(faq.a)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </Reveal>
      </div>
    </section>
  )
}
