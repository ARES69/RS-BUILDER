import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Reveal } from '@/lib/motion'

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
  aside,
  id,
}: {
  eyebrow?: string
  title: ReactNode
  subtitle?: ReactNode
  align?: 'center' | 'left'
  className?: string
  aside?: ReactNode
  id?: string
}) {
  return (
    <Reveal
      id={id}
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        aside && 'md:flex-row md:items-end md:justify-between md:text-left',
        className,
      )}
    >
      <div className={cn('flex flex-col gap-4', align === 'center' && 'items-center')}>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2 className="h-display text-balance text-[clamp(1.9rem,4.4vw,3.4rem)] text-fg">{title}</h2>
        {subtitle ? (
          <p className="text-pretty max-w-2xl text-[15px] leading-relaxed text-muted md:text-base">{subtitle}</p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </Reveal>
  )
}
