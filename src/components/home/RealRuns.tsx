/**
 * Landing strip of REAL hosted artifacts (public gallery). No mockups:
 * every card links to /view/<jobId>, where the actual artifact renders.
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { useI18n } from '@/i18n'
import { fetchGallery, type GalleryEntry } from '@/lib/auth'
import { SectionHeading } from '@/components/ui/SectionHeading'

export function RealRuns() {
  const { t } = useI18n()
  const [items, setItems] = useState<GalleryEntry[]>([])

  useEffect(() => {
    let alive = true
    fetchGallery().then((g) => alive && setItems(g.slice(0, 3)))
    return () => {
      alive = false
    }
  }, [])

  if (!items.length) return null

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-16">
      <SectionHeading eyebrow={t('app.realRunsEyebrow')} title={t('app.realRunsTitle')} subtitle={t('app.realRunsHint')} />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {items.map((g) => (
          <Link
            key={g.jobId}
            to={'/view/' + g.jobId}
            className="group flex flex-col rounded-2xl border border-line bg-surface/50 p-4 transition-all hover:-translate-y-0.5 hover:border-accent/40"
          >
            <span className="line-clamp-2 text-[13px] font-semibold text-fg">{g.prompt}</span>
            <span className="mt-2 font-mono text-[10.5px] text-faint">
              {g.model ?? 'live run'} · v{g.version}
            </span>
            <span className="mt-3 inline-flex items-center gap-1 font-mono text-[10.5px] text-cyan opacity-0 transition-opacity group-hover:opacity-100">
              /view/{g.jobId.slice(-6)} <ExternalLink size={10} />
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
