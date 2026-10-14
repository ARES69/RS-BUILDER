import { motion, useReducedMotion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from './cn'

const EASE = [0.22, 1, 0.36, 1] as const

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
  y?: number
  once?: boolean
  id?: string
  as?: 'div' | 'section' | 'li' | 'span'
}

/** Fade + rise on scroll into view. Respects prefers-reduced-motion. */
export function Reveal({ children, className, delay = 0, y = 18, once = true, id, as = 'div' }: RevealProps) {
  const reduced = useReducedMotion()
  const Component = motion[as]
  return (
    <Component
      id={id}
      className={className}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-64px' }}
      transition={{ duration: reduced ? 0.2 : 0.6, delay: reduced ? 0 : delay, ease: EASE }}
    >
      {children}
    </Component>
  )
}

export function Stagger({
  children,
  className,
  stagger = 0.07,
  delay = 0,
}: {
  children: ReactNode
  className?: string
  stagger?: number
  delay?: number
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-48px' }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: reduced ? 0 : stagger, delayChildren: reduced ? 0 : delay } },
      }}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
  y = 16,
  ...rest
}: { children: ReactNode; className?: string; y?: number } & HTMLMotionProps<'div'>) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={cn(className)}
      variants={{
        hidden: reduced ? { opacity: 0 } : { opacity: 0, y },
        show: { opacity: 1, y: 0, transition: { duration: reduced ? 0.2 : 0.55, ease: EASE } },
      }}
      {...rest}
    >
      {children}
    </motion.div>
  )
}

export { motion }
