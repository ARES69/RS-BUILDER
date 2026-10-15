/**
 * Hero panel, v3: NOTHING IS SIMULATED.
 * Shows the live backend status (engine/providers/cooldowns from /v1/status)
 * and embeds a REAL artifact produced by a real LLM run, hosted on the public
 * blob store. No auto-playing fake steps, no scripted numbers.
 */
import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { useI18n } from '@/i18n'
import { AGENT_API_URL, fetchBackendStatus, type BackendStatus } from '@/lib/remoteAgent'

const REAL_ARTIFACT = {
  url: 'https://lbjvtuiqitewxjwu.public.blob.vercel-storage.com/art/job_4v3kxropgt2h/index.html',
  model: 'groq/openai/gpt-oss-120b',
}

export function LiveBoard() {
  const { t } = useI18n()
  const [status, setStatus] = useState<BackendStatus | null>(null)
  const [artifactHtml, setArtifactHtml] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchBackendStatus().then((s) => alive && setStatus(s))
    // the blob serves objects with content-disposition: attachment, which an
    // iframe would download instead of render — fetch the bytes and srcdoc them
    fetch(REAL_ARTIFACT.url)
      .then((r) => (r.ok ? r.text() : ''))
      .then((text) => alive && text && setArtifactHtml(text))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const now = Date.now()
  const providers = status?.providers ?? []

  return (
    <div className="relative rounded-2xl border border-line bg-bg-elev/70 p-4 shadow-2xl shadow-black/10">
      <div className="mb-3 flex items-center justify-between">
        <span className="eyebrow">{t('hero.liveBoardTitle')}</span>
        <span
          className={
            'rounded-full border px-2 py-0.5 font-mono text-[10px] ' +
            (status?.engine === 'llm' ? 'border-accent/50 bg-accent/10 text-accent' : 'border-line text-faint')
          }
        >
          {status ? 'engine: ' + status.engine : '…'}
        </span>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {providers.length === 0 && <span className="font-mono text-[10.5px] text-faint">{t('hero.liveBoardNoProviders')}</span>}
        {providers.map((p) => {
          const until = status?.cooldowns?.[p]
          const cooling = until && until > now
          return (
            <span
              key={p}
              className={
                'rounded-full border px-2 py-0.5 font-mono text-[10px] ' +
                (cooling ? 'border-amber-400/40 bg-amber-400/10 text-amber-500' : 'border-cyan/40 bg-cyan/10 text-cyan')
              }
              title={cooling ? t('hero.liveBoardCooling') : t('hero.liveBoardLive')}
            >
              {p}
              {cooling ? ' · ' + Math.max(1, Math.round((until - now) / 60000)) + 'm' : ' · live'}
            </span>
          )
        })}
      </div>

      <iframe
        title={t('hero.liveBoardArtifact')}
        srcDoc={artifactHtml ?? undefined}
        sandbox="allow-scripts"
        className="h-56 w-full rounded-xl border border-line bg-white"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-[10px] text-faint">
          {t('hero.liveBoardArtifact')} · {REAL_ARTIFACT.model}
        </span>
        <a href={REAL_ARTIFACT.url} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-cyan hover:underline">
          url <ExternalLink size={10} />
        </a>
      </div>

      {!AGENT_API_URL && <p className="mt-2 text-[10.5px] text-faint">{t('app.noBackend')}</p>}
    </div>
  )
}
