/** GET /api/v1/job?id=… — job snapshot (status + full event log, no secrets). */
import { getJob } from '../../server/jobstore.mjs'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed, use GET' })
    return
  }
  const id = String(req.query?.id ?? '')
  if (req.query?.canary === '1') {
    const { put, list, get } = await import('@vercel/blob')
    const name = 'rsb-jobs/canary-' + Date.now()
    const putRes = await put(name, JSON.stringify({ ping: 1 }), { access: 'private', contentType: 'application/json', addRandomSuffix: false })
    const listed = await list({ prefix: 'rsb-jobs/' })
    let readBack = null
    let readError = null
    try {
      const g = await get(name)
      readBack = await g.text()
    } catch (e) {
      readError = String(e?.message ?? e)
    }
    res.status(200).json({ putUrl: putRes.url, putPathname: putRes.pathname, listedCount: (listed.blobs || []).length, listedNames: (listed.blobs || []).map((b) => b.pathname).slice(0, 5), readBack, readError })
    return
  }
  const job = await getJob(id)
  if (!job) {
    const { listJobs, jobStoreKind } = await import('../../server/jobstore.mjs')
    let listed = []
    let listError = null
    try { listed = (await listJobs()).map((j) => j.id + ':' + j.status) } catch (e) { listError = String(e?.message ?? e) }
    res.status(404).json({ error: 'job not found', debug: { kind: jobStoreKind(), listed, listError, id } })
    return
  }
  const { kickToken, ...rest } = job
  res.status(200).json(rest)
}
