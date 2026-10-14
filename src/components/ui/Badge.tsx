import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'violet' | 'outline'
  className?: string
}) {
  const tones = {
    neutral: 'bg-surface-2 text-muted border-line',
    accent: 'bg-accent/15 text-accent border-accent/30',
    violet: 'bg-violet/15 text-violet border-violet/30',
    outline: 'bg-transparent text-fg border-line-strong',
  } as const
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
