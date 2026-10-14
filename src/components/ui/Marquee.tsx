import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Seamless horizontal marquee: children are duplicated and translated -50%. */
export function Marquee({
  children,
  className,
  itemClassName,
  reverse = false,
}: {
  children: ReactNode[]
  className?: string
  itemClassName?: string
  reverse?: boolean
}) {
  const items = [...children, ...children]
  return (
    <div className={cn('mask-fade-x relative overflow-hidden', className)}>
      <div
        className="animate-marquee flex w-max items-center gap-10"
        style={reverse ? { animationDirection: 'reverse' } : undefined}
      >
        {items.map((child, i) => (
          <div key={i} className={cn('flex shrink-0 items-center', itemClassName)}>
            {child}
          </div>
        ))}
      </div>
    </div>
  )
}
