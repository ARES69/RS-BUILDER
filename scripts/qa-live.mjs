/**
 * End-to-end check of the LIVE backend path:
 * static preview build (VITE_AGENT_API_URL set) + agent-server.mjs over SSE.
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:8801/rs-builder-live.html'
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(BASE + '#/app?scenario=site', { waitUntil: 'load' })
await page.evaluate(() => localStorage.setItem('rsb-theme', 'dark'))
await page.waitForTimeout(2000)

const badge = await page.locator('text=Live backend').count()
const intro = await page.locator('text=Connected to the live RS-BUILDER backend').count()
console.log(`${badge ? 'PASS' : 'FAIL'}  workspace shows LIVE backend badge`)
console.log(`${intro ? 'PASS' : 'FAIL'}  first agent message came from the server`)

await page.waitForSelector('iframe[title]', { timeout: 45000 })
const srcdocLen = await page.locator('iframe[title]').first().getAttribute('srcdoc').then((v) => (v ?? '').length)
console.log(`${srcdocLen > 500 ? 'PASS' : 'FAIL'}  artifact streamed over SSE and mounted (${srcdocLen}b)`)

await page.waitForTimeout(1200)
await page.screenshot({ path: '.shots/live-backend-0.png' })

// blog page on the simulator build
await page.goto('http://localhost:4174/#/blog', { waitUntil: 'load' }).catch(() => {})
await browser.close()
console.log(errors.length ? 'ISSUES:\n' + errors.join('\n') : 'No console errors (live backend e2e).')
process.exit(badge && intro && srcdocLen > 500 ? 0 : 1)
