import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '@/i18n'

const KEY = 'rsb-cookie-choice'

export function CookieBanner() {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(KEY)) {
        const timer = window.setTimeout(() => setVisible(true), 1200)
        return () => window.clearTimeout(timer)
      }
    } catch {
      /* storage blocked — stay hidden */
    }
  }, [])

  const choose = (value: string) => {
    try {
      window.localStorage.setItem(KEY, value)
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="animate-rise fixed bottom-4 left-4 z-[70] w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-line bg-bg-elev p-4 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.8)]">
      <div className="flex items-start gap-3">
        <p className="flex-1 text-[12.5px] leading-relaxed text-muted">{t('cookie.text')}</p>
        <button
          type="button"
          onClick={() => choose('dismissed')}
          aria-label={t('common.close')}
          className="text-faint transition-colors hover:text-fg"
        >
          <X size={14} />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => choose('accepted')}
          className="h-9 flex-1 rounded-full bg-accent text-[12.5px] font-bold text-accent-ink transition-colors hover:bg-accent-strong"
        >
          {t('cookie.accept')}
        </button>
        <button
          type="button"
          onClick={() => choose('declined')}
          className="h-9 flex-1 rounded-full border border-line text-[12.5px] font-semibold text-muted transition-colors hover:text-fg"
        >
          {t('cookie.decline')}
        </button>
      </div>
    </div>
  )
}
