/**
 * GET/POST /api/v1/reap — manual/daily-cron trigger for the stuck-job reaper.
 * Opportunistic sweeps also happen on queued-run creation (server/reaper.mjs).
 */
import { reapStaleJobs } from '../../server/reaper.mjs'

export const config = { runtime: 'nodejs', maxDuration: 60 }

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.authorization ?? ''
  const manual = new URL(req.url ?? '/', 'http://localhost').searchParams.get('manual')
  if (secret && auth !== 'Bearer ' + secret && manual !== secret) {
    res.status(401).json({ error: 'unauthorized: provide CRON_SECRET' })
    return
  }
  const result = await reapStaleJobs({ force: true })
  res.status(200).json({ ok: true, ...result })
}
