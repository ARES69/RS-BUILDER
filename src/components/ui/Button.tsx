import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-semibold tracking-[-0.01em] rounded-full transition-all duration-200 select-none disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap'

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink hover:bg-accent-strong shadow-[0_10px_30px_-12px_color-mix(in_srgb,var(--accent)_70%,transparent)] hover:shadow-[0_16px_40px_-14px_color-mix(in_srgb,var(--accent)_80%,transparent)] hover:-translate-y-px',
  secondary:
    'bg-surface text-fg border border-line-strong hover:border-fg/40 hover:bg-surface-2 hover:-translate-y-px',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
  quiet: 'bg-surface-2 text-fg hover:bg-surface-3 border border-line',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-[52px] px-7 text-[15px]',
}

type CommonProps = {
  children: ReactNode
  variant?: Variant
  size?: Size
  className?: string
  icon?: ReactNode
  full?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  onClick,
  type = 'button',
  disabled,
  icon,
  full,
  ...rest
}: CommonProps & { onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; href?: undefined }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, variants[variant], sizes[size], full && 'w-full', className)}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function ButtonLink({
  children,
  href,
  variant = 'primary',
  size = 'md',
  className,
  icon,
  full,
  onClick,
}: CommonProps & { href: string; onClick?: () => void }) {
  const cls = cn(base, variants[variant], sizes[size], full && 'w-full', className)
  const content = (
    <>
      {icon}
      {children}
    </>
  )
  if (href.startsWith('http') || href.startsWith('mailto:')) {
    return (
      <a
        href={href}
        className={cls}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noreferrer noopener' : undefined}
        onClick={onClick}
      >
        {content}
      </a>
    )
  }
  return (
    <Link to={href} className={cls} onClick={onClick}>
      {content}
    </Link>
  )
}
