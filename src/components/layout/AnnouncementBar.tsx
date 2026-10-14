import { useState } from 'react'
import { ArrowRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'

export function AnnouncementBar() {
  const { t } = useI18n()
  const [hidden, setHidden] = useState(false)
  if (hidden) return null

  return (
    <div className="relative z-50 border-b border-line bg-surface/60 backdrop-blur">
      <div className="shell flex h-10 items-center justify-center gap-3">
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          <span className="animate-pulse-dot absolute inline-flex h-full w-full rounded-full bg-accent" />
        </span>
        <Link
          to="/blog/introducing-rs-builder-2-0"
          className="group flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted transition-colors hover:text-fg"
        >
          <span className="truncate">{t('announcement.text')}</span>
          <span className="hidden shrink-0 items-center gap-1 font-semibold text-accent sm:inline-flex">
            {t('announcement.cta')}
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label={t('announcement.dismiss')}
          className="absolute right-3 text-faint transition-colors hover:text-fg sm:right-6"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
