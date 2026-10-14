import { useCallback, useEffect, useRef, useState } from 'react'

/** Lock body scroll while a drawer/modal is open. */
export function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [locked])
}

/** Copy text to clipboard with a transient "copied" flag. */
export function useCopy(timeout = 1600) {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<number | null>(null)

  const copy = useCallback(
    async (value: string, id?: string) => {
      try {
        await navigator.clipboard.writeText(value)
      } catch {
        const el = document.createElement('textarea')
        el.value = value
        el.style.position = 'fixed'
        el.style.opacity = '0'
        document.body.appendChild(el)
        el.select()
        try {
          document.execCommand('copy')
        } catch {
          /* clipboard unavailable */
        }
        document.body.removeChild(el)
      }
      const key = id ?? value
      setCopied(key)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(null), timeout)
    },
    [timeout],
  )

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  return { copied, copy }
}

/** Animated number count-up, triggered when the element scrolls into view. */
export function useCountUp(target: number, duration = 1200, start = false) {
  const [value, setValue] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    if (!start) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(target * eased)
      if (p < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [target, duration, start])

  return value
}

/** True once the referenced element has entered the viewport. */
export function useInView<T extends HTMLElement>(rootMargin = '-10% 0px') {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true)
            observer.disconnect()
          }
        }
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, inView }
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : (window.matchMedia?.(query).matches ?? false),
  )
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** Scrolled-past-threshold flag, for sticky header styling. */
export function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}
