import { cn } from '@/lib/cn'

/**
 * RS-BUILDER brand mark: an "R" beam with a placed block — the builder motif.
 * Rendered inline so it inherits `currentColor` and stays crisp at any size.
 */
export function LogoMark({ className, accent = true }: { className?: string; accent?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('h-8 w-8', className)} role="img" aria-label="RS-BUILDER">
      <g fill="none" stroke="currentColor" strokeWidth={3.1} strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.4 24.2V8.4h5.3a4.1 4.1 0 0 1 0 8.2h-5.3" />
        <path d="M15.6 16.6 21.4 24.2" />
      </g>
      <rect x="20.6" y="6.4" width="5" height="5" rx="1.6" fill={accent ? 'var(--accent)' : 'currentColor'} />
    </svg>
  )
}

export function Logo({
  className,
  compact = false,
  markClass,
}: {
  className?: string
  compact?: boolean
  markClass?: string
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={cn('h-7 w-7 text-fg', markClass)} />
      {!compact && (
        <span className="text-[15px] font-extrabold uppercase tracking-[-0.02em] text-fg">
          RS<span className="text-faint">-</span>BUILDER
        </span>
      )}
    </span>
  )
}
