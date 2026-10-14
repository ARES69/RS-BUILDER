import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { legalSections } from '@/data/legal'
import { cn } from '@/lib/cn'
import { Reveal } from '@/lib/motion'
import { SITE } from '@/data/site'
import { scrollToNode } from '@/lib/dom'

export default function Legal() {
  const { l } = useI18n()
  const location = useLocation()
  const [active, setActive] = useState('about')

  useEffect(() => {
    const id = location.hash.replace('#', '')
    if (id && legalSections.some((s) => s.id === id)) {
      setActive(id)
      window.setTimeout(() => scrollToNode(document.getElementById(id)), 60)
    }
  }, [location.hash])

  return (
    <section className="py-14 sm:py-20">
      <div className="shell grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
        <nav className="lg:sticky lg:top-24 lg:self-start">
          <span className="eyebrow">RS-BUILDER</span>
          <ul className="mt-4 space-y-1">
            {legalSections.map((section) => (
              <li key={section.id}>
                <a
                  href={'#' + section.id}
                  onClick={() => setActive(section.id)}
                  className={cn(
                    'block rounded-lg px-3 py-2 text-[13.5px] transition-colors',
                    active === section.id ? 'bg-surface-2 font-semibold text-fg' : 'text-muted hover:text-fg',
                  )}
                >
                  {l(section.title)}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 px-3 text-[12px] leading-relaxed text-faint">
            {l({ en: 'Questions? ', ru: 'Вопросы? ' })}
            <a href={'mailto:' + SITE.support} className="text-accent hover:underline">
              {SITE.support}
            </a>
          </p>
        </nav>

        <div className="flex flex-col gap-12">
          {legalSections.map((section) => (
            <Reveal key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
                <h1 className="text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold tracking-[-0.03em] text-fg">
                  {l(section.title)}
                </h1>
                <span className="font-mono text-[11.5px] text-faint">
                  {l({ en: 'updated', ru: 'обновлено' })} {section.updated}
                </span>
              </div>
              <div className="mt-5 space-y-4">
                {section.blocks.map((block, i) => (
                  <p key={i} className="max-w-3xl text-pretty text-[14.5px] leading-relaxed text-muted">
                    {l(block)}
                  </p>
                ))}
                {section.list ? (
                  <ul className="mt-2 max-w-3xl space-y-2">
                    {section.list.map((item) => (
                      <li key={item.en} className="flex items-start gap-2.5 text-[14px] leading-snug text-muted">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        {l(item)}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
