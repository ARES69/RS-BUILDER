import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:4173'
const OUT = '.shots'
mkdirSync(OUT, { recursive: true })

const errors = []
const browser = await chromium.launch()

async function shoot(name, path, { width = 1440, height = 900, waits = [0], wait = 1800, before } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, locale: 'en-US' })
  const page = await ctx.newPage()
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] console: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`))
  await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 }).catch((e) => errors.push(`[${name}] nav: ${e.message}`))
  await page.waitForTimeout(wait)
  if (before) await before(page)
  for (let i = 0; i < waits.length; i++) {
    await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), waits[i])
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}/${name}-${i}.png` })
  }
  await ctx.close()
}

await shoot('home', '/', { waits: [0, 900, 1800, 2900, 4000, 5200, 6400], wait: 2500 })
await shoot('home-dark', '/', { waits: [0, 1800, 3000, 5200], wait: 2500, before: async (p) => { await p.evaluate(() => localStorage.setItem('rsb-theme', 'dark')); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500) } })
await shoot('home-mobile', '/', { width: 390, height: 844, waits: [0, 780, 1600], wait: 2500 })
await shoot('home-ru', '/', { waits: [0, 2900], wait: 2500, before: async (p) => { await p.evaluate(() => localStorage.setItem('rsb-locale', 'ru')); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500) } })
await shoot('home-light', '/', { waits: [0, 1800], wait: 2200, before: async (p) => { await p.evaluate(() => localStorage.setItem('rsb-theme', 'light')); await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1500) } })
await shoot('pricing', '/pricing', { waits: [0, 1100, 2400, 3600], wait: 2200 })
await shoot('feature', '/features/wide-research', { waits: [0, 1000, 2000], wait: 2200 })
await shoot('brand', '/brand', { waits: [0, 1000], wait: 2200 })
await shoot('login', '/login', { waits: [0], wait: 2200 })
await shoot('app-idle', '/app', { waits: [0], wait: 2200 })
await shoot('app-run', '/app?scenario=game', { waits: [0], wait: 14000 })
await shoot('app-done', '/app?scenario=site', {
  waits: [0],
  wait: 3000,
  before: async (p) => {
    // speed up: hit 4x, then wait for the run to finish
    const btn = p.locator('button:has-text("4×")').first()
    if (await btn.count()) await btn.click()
    await p.waitForTimeout(16000)
  },
})

await browser.close()
console.log(errors.length ? 'ISSUES:\n' + errors.join('\n') : 'No console errors.')
