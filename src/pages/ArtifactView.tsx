/**
 * Public share page for a real hosted artifact: /view/<jobId>.
 * No auth: the gallery entry is already public-safe (prompt excerpt, urls, model).
 */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink, Sparkles } from 'lucide-react'
import { useI18n } from '@/i18n'
import { Logo } from '@/components/Logo'
import { fetchGalleryHtml, type GalleryEntry } from '@/lib/auth'
import { withBaseHtml } from '@/lib/withBase'

export default function ArtifactView() {
  const { jobId } = useParams()
  const { t } = useI18n()
  const [entry, setEntry] = useState<GalleryEntry | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const response = await fetch('/api/v1/artifacts?job=' + encodeURIComponent(jobId ?? ''))
        if (!response.ok) throw new Error('status ' + response.status)
        const data = (await response.json()) as GalleryEntry
        if (!alive) return
        setEntry(data)
        const text = await fetchGalleryHtml(data.pageUrl)
        if (alive && text) setHtml(withBaseHtml(text, data.pageUrl))
        else if (alive) setFailed(true)
      } catch {
        if (alive) setFailed(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [jobId])

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-[13px] font-bold tracking-tight text-fg">RS-BUILDER</span>
        </Link>
        <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{entry?.prompt ?? ''}</span>
        {entry?.model && (
          <span className="hidden shrink-0 rounded-full border border-cyan/40 bg-cyan/10 px-2.5 py-1 font-mono text-[10.5px] text-cyan sm:inline">
            ⚡ {entry.model}
          </span>
        )}
        <Link
          to={'/app?prompt=' + encodeURIComponent(entry?.prompt ?? '')}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-[11.5px] font-semibold text-black transition-opacity hover:opacity-90"
        >
          <Sparkles size={12} /> {t('view.cta')}
        </Link>
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        {failed ? (
          <div className="flex flex-1 items-center justify-center p-8 text-[13px] text-muted">{t('view.missing')}</div>
        ) : !html ? (
          <div className="flex flex-1 items-center justify-center p-8 text-[13px] text-muted">{t('view.loading')}</div>
        ) : (
          <iframe title={entry?.prompt ?? 'artifact'} srcDoc={html} sandbox="allow-scripts" className="min-h-0 w-full flex-1 bg-white" />
        )}
      </main>

      {entry && (
        <footer className="flex items-center justify-between gap-3 border-t border-line px-4 py-2 font-mono text-[10.5px] text-faint">
          <span>
            {t('view.version')} v{entry.version} · {new Date(entry.createdAt).toLocaleString(localeDate(t))}
          </span>
          <a href={entry.pageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan hover:underline">
            {t('view.original')} <ExternalLink size={10} />
          </a>
        </footer>
      )}
    </div>
  )
}

function localeDate(t: (k: string) => string): string {
  return t('view.locale') === 'ru' ? 'ru-RU' : 'en-US'
}
