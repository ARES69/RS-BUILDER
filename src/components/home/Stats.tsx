import { useI18n } from '@/i18n'
import { stats } from '@/data/home'
import { useCountUp, useInView } from '@/lib/hooks'
import { Reveal } from '@/lib/motion'

function formatNumber(value: string, progress: number) {
  const match = value.match(/^([\d.]+)(.*)$/)
  if (!match) return value
  const target = parseFloat(match[1])
  const decimals = (match[1].split('.')[1] ?? '').length
  const current = target * progress
  return current.toFixed(decimals) + match[2]
}

function StatValue({ value }: { value: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>()
  const animated = useCountUp(1, 1100, inView)
  return (
    <span ref={ref} className="block text-[clamp(1.9rem,4vw,2.9rem)] font-extrabold tracking-[-0.04em] text-fg">
      {inView ? formatNumber(value, animated) : formatNumber(value, 0)}
    </span>
  )
}

export function Stats() {
  const { l } = useI18n()
  return (
    <section className="border-y border-line bg-surface/40">
      <div className="shell grid grid-cols-2 gap-y-8 py-10 md:grid-cols-4">
        {stats.map((stat, i) => (
          <Reveal key={stat.value} delay={i * 0.06} className="text-center md:text-left">
            <StatValue value={stat.value} />
            <span className="mt-1 block text-[13px] leading-snug text-muted">{l(stat.label)}</span>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
