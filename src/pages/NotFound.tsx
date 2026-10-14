import { Link } from 'react-router-dom'
import { useI18n } from '@/i18n'
import { LogoMark } from '@/components/Logo'
import { ButtonLink } from '@/components/ui/Button'

export default function NotFound() {
  const { t } = useI18n()
  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden py-20">
      <div className="grid-bg pointer-events-none absolute inset-0 -z-10 opacity-50" />
      <div className="shell flex flex-col items-center text-center">
        <LogoMark className="h-12 w-12 text-fg" />
        <p className="mt-6 font-mono text-[13px] uppercase tracking-[0.2em] text-accent">{t('notFound.code')}</p>
        <h1 className="h-display mt-3 max-w-xl text-[clamp(1.9rem,5vw,3.2rem)] text-fg">{t('notFound.title')}</h1>
        <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-muted">{t('notFound.subtitle')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/" size="lg">{t('notFound.cta')}</ButtonLink>
          <Link
            to="/app"
            className="inline-flex h-[52px] items-center rounded-full border border-line-strong px-7 text-[15px] font-semibold text-fg transition-colors hover:bg-surface-2"
          >
            {t('common.openWorkspace')}
          </Link>
        </div>
      </div>
    </section>
  )
}
