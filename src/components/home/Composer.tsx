import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ChevronDown, Square } from 'lucide-react'
import { useI18n } from '@/i18n'
import { heroChips } from '@/data/home'
import { cn } from '@/lib/cn'
import { Icon } from '@/components/ui/Icon'

export function Composer({
  onRun,
  running = false,
  onStop,
  placeholderKey = 'hero.composerPlaceholder',
  size = 'lg',
  className,
  initialPrompt,
}: {
  onRun: (prompt: string) => void
  running?: boolean
  onStop?: () => void
  placeholderKey?: string
  size?: 'md' | 'lg'
  className?: string
  initialPrompt?: string
}) {
  const { t, l } = useI18n()
  const [value, setValue] = useState(initialPrompt ?? '')
  const [expanded, setExpanded] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (initialPrompt !== undefined) setValue(initialPrompt)
  }, [initialPrompt])

  useEffect(() => {
    const node = areaRef.current
    if (!node) return
    node.style.height = 'auto'
    node.style.height = Math.min(node.scrollHeight, 220) + 'px'
  }, [value])

  const submit = () => {
    const prompt = value.trim()
    if (!prompt || running) return
    onRun(prompt)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit()
    }
  }

  const visible = expanded ? heroChips : heroChips.slice(0, 5)

  return (
    <div className={cn('w-full', className)}>
      <div
        className={cn(
          'group relative rounded-[26px] border border-line bg-surface/80 p-2 backdrop-blur-xl transition-all duration-300',
          'shadow-[0_24px_70px_-32px_rgba(0,0,0,0.6)] focus-within:border-accent/45 focus-within:shadow-[0_24px_80px_-28px_color-mix(in_srgb,var(--accent)_35%,transparent)]',
          size === 'lg' ? 'sm:p-2.5' : 'p-2',
        )}
      >
        <textarea
          ref={areaRef}
          rows={size === 'lg' ? 2 : 1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t(placeholderKey)}
          aria-label={t(placeholderKey)}
          className={cn(
            'w-full resize-none bg-transparent px-4 text-fg outline-none placeholder:text-faint',
            size === 'lg' ? 'py-3.5 text-[15.5px] leading-relaxed sm:text-[16.5px]' : 'py-2.5 text-[14px]',
          )}
        />
        <div className="mt-1 flex items-center justify-between gap-3 px-2 pb-1">
          <span className="hidden font-mono text-[11px] text-faint sm:block">{t('hero.composerHint')}</span>
          <div className="flex items-center gap-2">
            {running ? (
              <button
                type="button"
                onClick={onStop}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-line-strong px-4 text-[13px] font-semibold text-fg transition-colors hover:bg-surface-2"
              >
                <Square size={12} fill="currentColor" />
                {t('app.stop')}
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!value.trim()}
                aria-label={t('hero.composerCta')}
                className={cn(
                  'inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-bold transition-all',
                  value.trim()
                    ? 'bg-accent text-accent-ink hover:bg-accent-strong hover:-translate-y-px shadow-[0_10px_28px_-12px_color-mix(in_srgb,var(--accent)_80%,transparent)]'
                    : 'cursor-not-allowed bg-surface-2 text-faint',
                )}
              >
                <span className="hidden sm:inline">{t('hero.composerCta')}</span>
                <ArrowUp size={16} strokeWidth={2.4} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="mr-1 hidden text-[11.5px] font-semibold uppercase tracking-[0.12em] text-faint md:block">
          {t('hero.chipsLabel')}
        </span>
        {visible.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setValue(l(chip.prompt))}
            className="group inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-3.5 py-2 text-[13px] font-medium text-muted transition-all hover:-translate-y-px hover:border-accent/40 hover:text-fg"
          >
            <Icon name={chip.icon} size={14} className="text-accent transition-transform group-hover:scale-110" />
            {l(chip.label)}
            {chip.badge ? (
              <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                {t('common.new')}
              </span>
            ) : null}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-semibold text-faint transition-colors hover:text-fg"
        >
          {t('hero.moreChips')}
          <ChevronDown size={14} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>
      </div>
    </div>
  )
}
