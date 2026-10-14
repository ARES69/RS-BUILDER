/** One-shot live proof: agent server + static server + Chromium, all self-cleaning. */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const agent = spawn(process.execPath, ['server/agent-server.mjs'], { env: { ...process.env, PORT: '8787' }, stdio: 'ignore' })
const staticSrv = spawn('python3', ['-m', 'http.server', '8803'], { cwd: 'preview', stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1800))

let exitCode = 0
try {
  const health = await fetch('http://127.0.0.1:8787/v1/health').then((r) => r.json())
  console.log('health:', JSON.stringify(health))

  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))

  await page.goto('http://localhost:8803/rs-builder-live.html#/app?scenario=research', { waitUntil: 'load' })
  await page.evaluate(() => localStorage.setItem('rsb-theme', 'dark'))
  await page.waitForTimeout(2500)

  const badge = await page.locator('text=Live backend').count()
  const fromServer = await page.locator('text=Connected to the live RS-BUILDER backend').count()
  console.log((badge ? 'PASS' : 'FAIL') + '  badge "Live backend" visible')
  console.log((fromServer ? 'PASS' : 'FAIL') + '  intro message streamed from agent-server over SSE')

  await page.waitForSelector('iframe[title]', { timeout: 60000 })
  const len = (await page.locator('iframe[title]').first().getAttribute('srcdoc'))?.length ?? 0
  console.log((len > 500 ? 'PASS' : 'FAIL') + '  artifact from backend mounted in Preview (' + len + 'b)')

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(600)
  await page.screenshot({ path: '.shots/live-proof.png' })

  await browser.close()
  if (errors.length) { console.log('page errors:', errors.join(' | ')); exitCode = 1 }
  if (!badge || !fromServer || len <= 500) exitCode = 1
} finally {
  agent.kill()
  staticSrv.kill()
}
console.log(exitCode === 0 ? 'LIVE PROOF OK' : 'LIVE PROOF FAILED')
process.exit(exitCode)
