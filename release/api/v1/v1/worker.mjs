/**
 * Internal worker endpoint: POST {jobId, kickToken}.
 * The kickToken is a per-job secret minted at creation, so only the creator
 * (our own runs handler / reaper / chained worker) can start a worker.
 */
import { getJob } from '../../server/jobstore.mjs'
import { processJob } from '../../server/worker.mjs'

export const config = { runtime: 'nodejs', maxDuration: 300 }

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed, use POST' })
    return
  }
  let body = ''
  if (typeof req[Symbol.asyncIterator] === 'function') {
    for await (const chunk of req) body += chunk
  } else {
    body = await new Promise((resolve) => {
      let acc = ''
      req.on('data', (c) => (acc += c))
      req.on('end', () => resolve(acc))
      req.on('error', () => resolve(acc))
    })
  }
  let payload = {}
  try { payload = JSON.parse(body || '{}') } catch { /* noop */ }

  const job = await getJob(payload.jobId)
  if (!job || job.kickToken !== payload.kickToken) {
    res.status(401).json({ error: 'unknown job or bad kick token' })
    return
  }
  const result = await processJob(job.id)
  res.status(200).json({ ok: true, ...result })
}
