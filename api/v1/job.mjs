/** GET /api/v1/job?id=… — job snapshot (status + full event log, no secrets). */
import { getJob } from '../../server/jobstore.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed, use GET' })
    return
  }
  const id = String(req.query?.id ?? '')
  if (req.query?.canary === '3') {
    const { put, get } = await import('@vercel/blob')
    const { getVercelOidcToken } = await import('@vercel/oidc')
    const name = 'rsb-jobs/canary3-' + Date.now()
    await put(name, JSON.stringify({ ping: 3 }), { access: 'private', contentType: 'application/json', addRandomSuffix: false })
    const oidc = await getVercelOidcToken()
    const out = {}
    for (const [label, opts] of [
      ['access-only', { access: 'private' }],
      ['access+oidc', { access: 'private', oidcToken: oidc }],
      ['access+jwt-as-token', { access: 'private', token: oidc }],
    ]) {
      try {
        const r = await get(name, opts)
        out[label] = 'OK ' + (await r.text()).slice(0, 20)
      } catch (e) {
        out[label] = 'ERR ' + String(e?.message ?? e).slice(0, 120)
      }
    }
    res.status(200).json(out)
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
