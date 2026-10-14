import { chromium } from 'playwright'
const BASE = process.env.BASE ?? 'http://localhost:4174'
const browser = await chromium.launch()
const errors = []

async function shoot(name, path, { width = 1440, height = 900, waits = [0], wait = 2500 } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'en-US', colorScheme: 'dark' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`) })
  await page.goto(BASE + path, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.setItem('rsb-theme', 'dark'))
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(wait)
  for (let i = 0; i < waits.length; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), waits[i])
    await page.waitForTimeout(700)
    await page.screenshot({ path: `.shots/${name}-${i}.png` })
  }
  await ctx.close()
}

await shoot('dark-home', '/', { waits: [0, 2900, 5200] })
await shoot('dark-workspace', '/app?scenario=site', { waits: [0], wait: 13000 })
await shoot('dark-pricing', '/pricing', { waits: [0, 1200] })
await shoot('dark-mobile', '/', { width: 390, height: 844, waits: [0, 900] })

await browser.close()
console.log(errors.length ? 'ISSUES:\n' + errors.join('\n') : 'No console errors (dark).')
