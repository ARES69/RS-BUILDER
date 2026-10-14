/** GET /api/v1/job?id=… — job snapshot (status + full event log, no secrets). */
import { getJob } from '../../server/jobstore.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed, use GET' })
    return
  }
  const id = String(req.query?.id ?? '')
  if (req.query?.canary === '2') {
    const { put, get, list } = await import('@vercel/blob')
    const { getVercelOidcToken } = await import('@vercel/oidc')
    const name = 'rsb-jobs/canary2-' + Date.now()
    await put(name, JSON.stringify({ ping: 2 }), { access: 'private', contentType: 'application/json', addRandomSuffix: false })
    const oidc = await getVercelOidcToken()
    const out = { storeId: process.env.BLOB_STORE_ID, hasStatic: Boolean(process.env.BLOB_READ_WRITE_TOKEN) }
    for (const [label, fn] of [
      ['oidcToken', () => get(name, { oidcToken: oidc })],
      ['oidc+storeId', () => get(name, { oidcToken: oidc, storeId: process.env.BLOB_STORE_ID })],
      ['jwt-as-token', () => get(name, { token: oidc })],
      ['no-options', () => get(name)],
    ]) {
      try {
        const r = await fn()
        out[label] = 'OK ' + (await r.text()).slice(0, 20)
      } catch (e) {
        out[label] = 'ERR ' + String(e?.message ?? e).slice(0, 140)
      }
    }
    const l = await list({ prefix: 'rsb-jobs/canary2-' })
    out.listed = (l.blobs || []).map((b) => b.pathname)
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
