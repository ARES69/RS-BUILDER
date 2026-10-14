/** Live end-to-end proof against the production Vercel deployment. */
import { chromium } from 'playwright'

const BASE = process.env.PROD_URL ?? 'https://rs-builder-sigma.vercel.app'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  // the workspace probes /auth/me on load; 401 there is the expected anonymous answer
  if (m.type() === 'error' && /auth\?action=me|\/auth\?action=me/.test(m.text())) return
  if (m.type() === 'error') errors.push('console: ' + m.text())
})

let ok = true
const check = (good, msg) => { console.log((good ? 'PASS' : 'FAIL') + '  ' + msg); if (!good) ok = false }

const health = await page.request.get(BASE + '/api/v1/health').then((r) => r.json())
check(health.ok === true && health.runtime === 'vercel-node', 'GET /api/v1/health on production → ' + JSON.stringify(health))

await page.goto(BASE + '/app?prompt=' + encodeURIComponent('Один экран приветствия с заголовком и кнопкой'), { waitUntil: 'load' })
await page.evaluate(() => localStorage.setItem('rsb-theme', 'dark'))
await page.waitForTimeout(3000)
check(await page.locator('text=Live backend').count() > 0, 'workspace badge shows LIVE backend (same-origin /api)')
const engine = health.engine ?? 'deterministic'
// cold free-model starts can take >10s before the first agent message lands
await page
  .waitForFunction(() => (document.querySelector('main')?.textContent ?? '').includes('RS-BUILDER'), null, { timeout: 90000 })
  .catch(() => {})
const mainText = await page.locator('main').first().textContent()
check((mainText ?? '').includes('RS-BUILDER'), 'agent message streamed from the production function (engine=' + engine + ')')

await page.waitForSelector('iframe[title]', { timeout: 150000 })
const len = (await page.locator('iframe[title]').first().getAttribute('srcdoc'))?.length ?? 0
check(len > 500, 'artifact from production backend mounted (' + len + 'b)')
await page.screenshot({ path: '.shots/production-live.png' })

await page.goto(BASE + '/', { waitUntil: 'load' })
await page.waitForTimeout(2500)
check(await page.locator('text=What should I').count() > 0, 'landing renders on production')
await page.screenshot({ path: '.shots/production-home.png' })

await page.goto(BASE + '/blog', { waitUntil: 'load' })
await page.waitForTimeout(2000)
check(await page.locator('text=Notes from the build').count() > 0, 'blog renders on production')

await browser.close()
console.log(errors.length ? 'page errors:\n' + errors.join('\n') : 'no console errors on production')
process.exit(ok && !errors.length ? 0 : 1)
