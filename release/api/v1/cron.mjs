/**
 * Real scheduled automations.
 *
 * Vercel Cron invokes this on the schedule from vercel.json, sending
 * `Authorization: Bearer <CRON_SECRET>`. The handler runs a full engine run
 * (LLM orchestrator or deterministic fallback) for AUTOMATION_PROMPT and
 * delivers a summary to WEBHOOK_URL (Slack-compatible {text} payload).
 *
 * Manual trigger for tests: GET/POST /api/v1/cron?manual=<CRON_SECRET>
 */
import { runEvents, engineInfo } from '../../server/engine.mjs'

export const config = { runtime: 'nodejs', maxDuration: 300 }

export default async function handler(req, res) {
  // Staging/secondary projects share the account's free quotas — cron can be
  // switched off per project without touching the code again.
  if (process.env.RSB_CRON_DISABLED === '1') {
    res.status(200).json({ ok: true, skipped: true, reason: 'RSB_CRON_DISABLED=1' })
    return
  }
  const secret = process.env.CRON_SECRET
  const url = new URL(req.url ?? '/', 'http://localhost')
  const auth = req.headers.authorization ?? ''
  if (secret && auth !== 'Bearer ' + secret && url.searchParams.get('manual') !== secret) {
    res.status(401).json({ error: 'unauthorized: provide CRON_SECRET' })
    return
  }

  const prompt =
    process.env.AUTOMATION_PROMPT ||
    'Daily brief: use search_web for "AI coding tools news", fetch the two strongest sources, and write brief.md with five bullets and citations.'
  const locale = process.env.AUTOMATION_LOCALE === 'ru' ? 'ru' : 'en'

  const events = []
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 240000)
  try {
    for await (const event of runEvents(prompt, locale, controller.signal)) events.push(event)
  } finally {
    clearTimeout(timer)
  }

  const artifact = events.find((e) => e.type === 'artifact')?.artifact
  const summary = {
    runAt: new Date().toISOString(),
    engine: engineInfo(),
    events: events.length,
    credits: events.filter((e) => e.type === 'progress').at(-1)?.credits ?? 0,
    artifact: artifact
      ? { title: artifact.title.en, fileName: artifact.fileName, downloads: (artifact.downloads ?? []).map((d) => d.name) }
      : null,
    sources: events.filter((e) => e.type === 'browse').map((e) => e.page.url),
  }

  const webhook = process.env.WEBHOOK_URL
  if (webhook) {
    await fetch(webhook, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text:
          'RS-BUILDER automation · ' +
          (summary.artifact?.title ?? 'no artifact') +
          ' · ' + summary.events + ' events · ' + summary.sources.length + ' sources · engine=' + summary.engine.engine,
      }),
    }).catch(() => {})
  }

  res.status(200).json(summary)
}
