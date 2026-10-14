/** GET /api/v1/job?id=… — job snapshot (status + full event log, no secrets). */
import { getJob } from '../../server/jobstore.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed, use GET' })
    return
  }
  const id = String(req.query?.id ?? '')
  if (req.query?.canary === '4') {
    const js = await import('../../server/jobstore.mjs')
    const created = await js.createJob({ prompt: 'canary4', locale: 'en', kickToken: 'x'.repeat(32) })
    const steps = { createdId: created.id }
    try {
      const { get } = await import('@vercel/blob')
      const { getVercelOidcToken } = await import('@vercel/oidc')
      const oidc = await getVercelOidcToken()
      const meta = await get('rsb-jobs/' + created.id, { access: 'private', oidcToken: oidc })
      steps.metaKeys = Object.keys(meta)
      steps.downloadUrl = String(meta.downloadUrl).slice(0, 80)
      const dl = await fetch(meta.downloadUrl)
      steps.dlStatus = dl.status
      steps.dlBody = (await dl.text()).slice(0, 60)
    } catch (e) {
      steps.inlineError = String(e?.message ?? e).slice(0, 200)
    }
    const back = await js.getJob(created.id)
    steps.getJob = back ? back.status : null
    res.status(200).json(steps)
    return
  }
  const job = await getJob(id)
  if (!job) {
    res.status(404).json({ error: 'job not found' })
    return
  }
  const { kickToken, ...rest } = job
  res.status(200).json(rest)
}
