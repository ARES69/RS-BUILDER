/** Blog screenshots; spawns and kills its own static server. */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'

const server = spawn('python3', ['-m', 'http.server', '8802'], { cwd: 'preview', stdio: 'ignore' })
await new Promise((r) => setTimeout(r, 1500))

const browser = await chromium.launch()
const errors = []
for (const [name, hash, width] of [
  ['blog-list', '#/blog', 1440],
  ['blog-post', '#/blog/the-plan-is-the-interface', 1440],
  ['blog-mobile', '#/blog', 390],
]) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 844 : 900 }, colorScheme: 'dark' })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`))
  await page.goto('http://localhost:8802/rs-builder.html' + hash, { waitUntil: 'load' })
  await page.evaluate(() => localStorage.setItem('rsb-theme', 'dark'))
  await page.reload({ waitUntil: 'load' })
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `.shots/${name}-0.png` })
  if (name === 'blog-list') {
    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }))
    await page.waitForTimeout(700)
    await page.screenshot({ path: '.shots/blog-list-1.png' })
  }
  await ctx.close()
}
await browser.close()
server.kill()
console.log(errors.length ? 'ISSUES:\n' + errors.join('\n') : 'Blog shots OK, no console errors.')
