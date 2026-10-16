/**
 * E2E proof of the sandbox tab: real UI + real backend + real sandbox,
 * driven by a scripted mock LLM (no provider quota burned).
 *
 *   RSB_QA_BUILD=1 node scripts/qa-sandbox.mjs      # rebuild dist first
 *   node scripts/qa-sandbox.mjs                     # reuse the existing dist
 *
 * It starts mock-llm → agent-server → vite preview, opens /app with a prompt,
 * waits for the run to finish and then proves, in the browser:
 *   1. files created by run_shell/run_code reached the workspace
 *   2. the Sandbox tab shows the editor + a LIVE preview of the project
 *   3. the preview's real browser console is captured (console.log from app.js)
 *   4. editing enables "continue with my edits" and arms the next prompt
 *   5. the settings panel reports the sandbox truthfully (real · node · shell)
 */
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { chromium } from 'playwright'

const MOCK_PORT = Number(process.env.MOCK_PORT ?? 8791)
const API_PORT = Number(process.env.API_PORT ?? 8787)
const UI_PORT = Number(process.env.UI_PORT ?? 4173)
const OUT = '.shots'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
mkdirSync(OUT, { recursive: true })

let failures = 0
const check = (good, msg) => {
  console.log((good ? 'PASS' : 'FAIL') + '  ' + msg)
  if (!good) failures++
}

const children = []
const stopAll = () => {
  for (const child of children) {
    try { process.kill(-child.pid, 'SIGKILL') } catch { try { child.kill('SIGKILL') } catch { /* already gone */ } }
  }
}
process.on('exit', stopAll)
process.on('SIGINT', () => { stopAll(); process.exit(130) })
process.on('SIGTERM', () => { stopAll(); process.exit(143) })

/** A stale preview from a killed run would silently hijack the port. */
async function portFree(port) {
  try {
    const res = await fetch('http://127.0.0.1:' + port + '/', { signal: AbortSignal.timeout(1500) })
    return !res.ok && res.status !== 404
  } catch (error) {
    return error?.cause?.code === 'ECONNREFUSED' || /ECONNREFUSED|fetch failed/.test(String(error?.message ?? error)) || Boolean(error?.cause)
  }
}

async function waitFor(url, ms = 40_000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url)
      if (res.ok || res.status === 404) return true
    } catch { /* not up yet */ }
    await wait(300)
  }
  return false
}

/* --- build (optional) -------------------------------------------------- */
if (process.env.RSB_QA_BUILD) {
  console.log('→ building the UI with VITE_AGENT_API_URL=http://127.0.0.1:' + API_PORT)
  const built = spawnSync('npm', ['run', 'build'], {
    stdio: 'inherit',
    env: { ...process.env, VITE_AGENT_API_URL: 'http://127.0.0.1:' + API_PORT },
  })
  if (built.status !== 0) { console.error('build failed'); process.exit(1) }
}

rmSync('/tmp/rsb-qa-artifacts', { recursive: true, force: true })

/* --- mock LLM ---------------------------------------------------------- */
for (const port of [MOCK_PORT, API_PORT, UI_PORT]) {
  if (!(await portFree(port))) {
    console.error('FAIL  port ' + port + ' is busy — kill the stale process from a previous run first')
    process.exit(1)
  }
}

children.push(spawn('node', ['scripts/mock-llm-server.mjs', String(MOCK_PORT)], { stdio: ['ignore', 'inherit', 'inherit'], detached: true }))

/* --- agent backend (real orchestrator + real sandbox) ------------------- */
children.push(
  spawn('node', ['server/agent-server.mjs'], {
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: true,
    env: {
      ...process.env,
      PORT: String(API_PORT),
      OPENAI_API_KEY: 'mock-key',
      OPENAI_BASE_URL: 'http://127.0.0.1:' + MOCK_PORT + '/v1',
      RSB_PROVIDERS: 'openrouter',
      RSB_LLM_MODEL_CHAIN: 'mock-builder',
      RSB_ARTIFACT_DIR: '/tmp/rsb-qa-artifacts',
    },
  }),
)

/* --- static UI --------------------------------------------------------- */
children.push(
  spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--port', String(UI_PORT), '--strictPort', '--host', '127.0.0.1'], {
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: true,
  }),
)

const mockUp = await waitFor('http://127.0.0.1:' + MOCK_PORT + '/v1/models')
const apiUp = await waitFor('http://127.0.0.1:' + API_PORT + '/v1/health')
const uiUp = await waitFor('http://127.0.0.1:' + UI_PORT + '/')
check(mockUp && apiUp && uiUp, 'stack is up (mock=' + mockUp + ' api=' + apiUp + ' ui=' + uiUp + ')')
if (!apiUp) { stopAll(); process.exit(1) }

const status = await (await fetch('http://127.0.0.1:' + API_PORT + '/v1/status')).json()
check(status.sandbox?.mode === 'real' && status.sandbox?.shell === true, '/v1/status reports the real sandbox → ' + JSON.stringify(status.sandbox))
check((status.capabilities ?? []).some((c) => c.startsWith('sandbox:')), '/v1/status advertises sandbox capabilities → ' + JSON.stringify(status.capabilities))

/* --- drive the UI ------------------------------------------------------ */
const errors = []
const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1500, height: 940 }, locale: 'en-US', deviceScaleFactor: 1 })
const page = await context.newPage()
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

const runBodies = []
page.on('request', (req) => {
  if (req.url().includes('/v1/runs') && req.method() === 'POST') runBodies.push(req.postData() ?? '')
})

await page.goto('http://127.0.0.1:' + UI_PORT + '/app?prompt=' + encodeURIComponent('Собери лендинг кофейни'), { waitUntil: 'domcontentloaded' })
await wait(1200)
await page.screenshot({ path: OUT + '/sandbox-01-plan.png' })

// the header chip flips to Completed when the run finishes
const done = await page
  .waitForSelector('header:has-text("Completed")', { timeout: 90_000 })
  .then(() => true)
  .catch(() => false)
check(done, 'the run finished in the UI (header chip = Completed)')

// the agent console lives in its own tab: open it to read the sandbox truth
await page.getByRole('button', { name: /^Console/ }).click()
await wait(600)
const consoleTab = await page.evaluate(() => document.body.innerText)
check(/sandbox · real/.test(consoleTab), 'the console banner states the sandbox mode honestly → ' + (consoleTab.match(/sandbox ·[^\n]*/) ?? ['missing'])[0])
check(/built site\/|built /.test(consoleTab) || /css-bytes|built/.test(consoleTab), 'node output from the sandbox reached the console trace')
check(/no-secrets|order|loaded|built/.test(consoleTab), 'the trace carries real child-process output')
await page.screenshot({ path: OUT + '/sandbox-02-console.png' })

// --- the Sandbox tab ----------------------------------------------------
await page.getByRole('button', { name: /^Sandbox/ }).click()
await wait(2200)

const fileChips = await page.locator('div.flex.min-h-0.flex-col.lg\\:flex-row > div:first-child button').allInnerTexts().catch(() => [])
check(fileChips.some((t) => /index\.html/.test(t)) && fileChips.some((t) => /styles\.css/.test(t)) && fileChips.some((t) => /app\.js/.test(t)) && fileChips.some((t) => /data\.json/.test(t)), 'the sandbox file strip lists what shell + node created → ' + JSON.stringify(fileChips))

const frame = page.frameLocator('iframe[title="sandbox preview"]')
const heading = await frame.locator('h1').first().innerText().catch(() => '')
check(/Maroon Coffee/.test(heading), 'the live preview renders the multi-file project (css+js resolved relative to the entry) → ' + heading)
const cardCount = await frame.locator('.card').count().catch(() => 0)
check(cardCount === 3, 'the node-generated menu rendered 3 cards → ' + cardCount)

await page.getByRole('button', { name: 'Run', exact: true }).click()
await wait(2200)
const browserConsole = await page.locator('div.max-h-28').first().innerText().catch(() => '')
check(/maroon app\.js loaded/.test(browserConsole), 'the preview REAL browser console is captured (console.log from the project js) → ' + JSON.stringify(browserConsole.slice(0, 120)))
await page.screenshot({ path: OUT + '/sandbox-03-sandbox-tab.png' })

// --- editing arms the next run -----------------------------------------
const editor = page.locator('textarea[wrap="off"]').first()
const before = await editor.inputValue()
await editor.click()
await editor.press('Control+End')
await editor.type('<!-- edited by the human in the sandbox tab -->')
await wait(1000)
const after = await editor.inputValue()
check(after.includes('edited by the human'), 'the editor accepts changes')
const rebuiltSrcdoc = await page.locator('iframe[title="sandbox preview"]').first().getAttribute('srcdoc')
check(String(rebuiltSrcdoc).includes('edited by the human'), 'the live preview rebuilds from the edited source (debounced)')

const armButton = page.getByRole('button', { name: /Continue with my edits/ })
check(await armButton.isEnabled().catch(() => false), '"continue with my edits" becomes enabled once a file is edited')
await armButton.click()
await wait(700)
const chip = await page.evaluate(() => document.body.innerText)
check(/your edits/i.test(chip) && /index\.html/.test(chip), 'the armed-edits chip shows what will be sent with the next message')
await page.screenshot({ path: OUT + '/sandbox-04-armed-edits.png' })

// --- settings panel tells the truth about the sandbox -------------------
await page.getByRole('button', { name: /Settings/ }).first().click()
await wait(1400)
const settingsText = await page.evaluate(() => document.body.innerText)
check(/sandbox:\s*real/.test(settingsText), 'settings show sandbox: real · node · shell → ' + (settingsText.match(/sandbox:[^\n]*/i) ?? ['missing'])[0])
await page.screenshot({ path: OUT + '/sandbox-05-settings.png' })
await page.keyboard.press('Escape')
await wait(500)

// --- the armed edits really ride along with the next prompt -------------
const composer = page.locator('textarea').first()
await composer.fill('Добавь в футер строку про обжарку и пересобери страницу')
await composer.press('Enter')
const followUp = await page
  .waitForFunction(() => /Добавь в футер/.test(document.body.innerText), null, { timeout: 15_000 })
  .then(() => true)
  .catch(() => false)
check(followUp, 'the follow-up prompt reached the thread')
await wait(1500)
const followBody = runBodies.at(-1) ?? ''
check(/"files"/.test(followBody) && followBody.includes('edited by the human'), 'the follow-up request carries the user-edited workspace as seed files → ' + followBody.slice(0, 120))
await page.screenshot({ path: OUT + '/sandbox-06-followup.png' })

// the standalone dev server implements only health/status/runs: the UI's
// credits/history/gallery probes 404 by design there — not a product bug
const realErrors = errors.filter((e) => !/Failed to load resource.*404/.test(e))
check(realErrors.length === 0, 'no page errors during the whole flow (404s on dev-server-only routes ignored: ' + (errors.length - realErrors.length) + ') → ' + JSON.stringify(realErrors.slice(0, 3)))

await browser.close()
stopAll()
console.log(failures === 0 ? '\nSANDBOX UI E2E OK' : '\nSANDBOX UI E2E FAILED (' + failures + ')')
process.exit(failures === 0 ? 0 : 1)
