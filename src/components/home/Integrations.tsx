import { useI18n } from '@/i18n'
import { integrations } from '@/data/home'
import { Reveal } from '@/lib/motion'
import { Marquee } from '@/components/ui/Marquee'
import { SectionHeading } from '@/components/ui/SectionHeading'

export function Integrations() {
  const { t } = useI18n()
  const half = Math.ceil(integrations.length / 2)
  const rowA = integrations.slice(0, half)
  const rowB = integrations.slice(half)

  const pill = (name: string) => (
    <span
      key={name}
      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-4 py-2 text-[13.5px] font-semibold text-muted"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {name}
    </span>
  )

  return (
    <section id="integrations" className="scroll-mt-24 overflow-hidden py-16 sm:py-20">
      <div className="shell">
        <SectionHeading eyebrow={t('integrations.eyebrow')} title={t('integrations.title')} subtitle={t('integrations.subtitle')} />
      </div>
      <Reveal className="mt-10 flex flex-col gap-3">
        <Marquee>{rowA.map(pill)}</Marquee>
        <Marquee reverse>{rowB.map(pill)}</Marquee>
      </Reveal>
    </section>
  )
}
