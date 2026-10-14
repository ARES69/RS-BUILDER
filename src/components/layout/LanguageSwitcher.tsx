import { useEffect, useRef, useState } from 'react'
import { Check, Globe } from 'lucide-react'
import { LOCALES, useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

const labels: Record<string, string> = { en: 'English', ru: 'Русский' }

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('common.language')}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-semibold text-muted transition-colors hover:border-line-strong hover:text-fg',
          compact && 'h-8 px-2.5',
        )}
      >
        <Globe size={14} strokeWidth={1.9} />
        <span className="uppercase">{locale}</span>
      </button>
      {open ? (
        <div
          role="listbox"
          className="animate-pop absolute right-0 z-50 mt-2 w-40 overflow-hidden rounded-xl border border-line bg-bg-elev p-1 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.65)]"
        >
          {LOCALES.map((code) => (
            <button
              key={code}
              role="option"
              aria-selected={code === locale}
              type="button"
              onClick={() => {
                setLocale(code)
                setOpen(false)
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2 text-[13px] transition-colors',
                code === locale ? 'bg-surface-2 text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              {labels[code]}
              {code === locale ? <Check size={14} className="text-accent" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
