/**
 * Headless smoke test (no browser binary required).
 *
 * Loads the single-file build into jsdom, polyfills the two browser APIs that
 * jsdom lacks, boots React and then drives the router through the main routes,
 * including a live agent run in the workspace. Any console.error / uncaught
 * exception fails the run.
 */
import { readFileSync, existsSync } from 'node:fs'
import { JSDOM, VirtualConsole } from 'jsdom'

const FILE = process.env.SMOKE_FILE ?? 'preview/rs-builder.html'
if (!existsSync(FILE)) {
  console.error('Build not found. Run: npm run build:preview')
  process.exit(1)
}

const problems = []
const virtualConsole = new VirtualConsole()
// jsdom's CSS parser does not understand modern CSS (nesting, @layer, oklch…),
// which Tailwind v4 emits. Browsers parse it fine (verified in Chromium), so
// that specific parser complaint is expected noise, not a product defect.
virtualConsole.on('jsdomError', (e) => {
  if (/Could not parse CSS stylesheet/i.test(e.message)) return
  problems.push('jsdomError: ' + e.message)
})
virtualConsole.on('error', (...args) => problems.push('console.error: ' + args.join(' ')))

const dom = new JSDOM(readFileSync(FILE, 'utf8'), {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  virtualConsole,
  beforeParse(window) {
    window.matchMedia = () => ({
      matches: false,
      media: '',
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      onchange: null,
      dispatchEvent: () => false,
    })
    window.IntersectionObserver = class {
      constructor(cb) { this.cb = cb }
      observe(el) { this.cb([{ isIntersecting: true, target: el }], this) }
      unobserve() {}
      disconnect() {}
      takeRecords() { return [] }
    }
    window.scrollTo = () => {}
    window.scroll = () => {}
    window.HTMLCanvasElement.prototype.getContext = () => null
    window.addEventListener('error', (e) => problems.push('window.error: ' + (e.error?.stack ?? e.message)))
    window.addEventListener('unhandledrejection', (e) => problems.push('unhandledrejection: ' + e.reason))
  },
})

const { window } = dom
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const root = () => window.document.getElementById('root')
const text = () => (root()?.textContent ?? '').replace(/\s+/g, ' ')

async function check(label, hash, needle, settle = 1500) {
  window.location.hash = hash
  await wait(settle)
  const html = root()?.innerHTML ?? ''
  const body = text()
  const ok = needle.every((n) => body.includes(n)) && html.length > 800
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(34)} html=${String(html.length).padStart(7)}b  hash=${hash}`)
  if (!ok) problems.push(`${label}: expected ${JSON.stringify(needle)} in rendered text`)
  return ok
}

await wait(2500) // initial mount

console.log('\n--- routes -------------------------------------------------')
await check('home renders', '#/', ['RS-BUILDER', 'Capabilities', 'Pricing'])
await check('capabilities section', '#/', ['One agent. Every kind of output.'])
await check('pricing page', '#/pricing', ['RS-BUILDER plans', 'Starter', 'Pro', 'Max', 'SOC 2 Type II'])
await check('feature page (deep)', '#/features/deep-research', ['Deep research', 'Every claim cited'])
await check('feature page (fleet)', '#/features/wide-research', ['Wide Research', 'sub-agents'])
await check('unknown feature -> 404', '#/features/nope', ['404'])
await check('brand kit', '#/brand', ['Brand kit', 'Signal', 'Inter'])
await check('legal + anchors', '#/legal', ['Terms of service', 'Privacy policy', 'Changelog'])
await check('sign in', '#/login', ['Welcome back', 'Work email'])
await check('sign up', '#/signup', ['Create your account'])
await check('workspace idle', '#/app', ['Nothing running', 'Sample tasks', 'Landing page'])
await check('blog index', '#/blog', ['Notes from the build', 'Featured', 'All posts'])
await check('blog post', '#/blog/credits-explained', ['Credits, explained', 'Refresh credits are the free lunch'])
await check('blog post 404', '#/blog/nope', ['404'])

console.log('\n--- agent run (simulated engine) ---------------------------')
window.location.hash = '#/app?scenario=site'
await wait(6000)
const running = text()
const planStarted = running.includes('Define structure and copy angle') || running.includes('Interpret')
console.log(`${planStarted ? 'PASS' : 'FAIL'}  plan streamed into the UI      credits-visible=${/\d+/.test(running)}`)
if (!planStarted) problems.push('workspace: plan steps never rendered')

// let it finish, then verify the artifact iframe was mounted
await wait(16000)
const done = text()
const iframe = window.document.querySelector('iframe[title]')
const finished = done.includes('Deploy') || done.includes('Lighthouse') || Boolean(iframe)
console.log(`${finished && iframe ? 'PASS' : 'FAIL'}  run completed + artifact mounted  iframe=${Boolean(iframe)} srcdoc=${iframe ? (iframe.getAttribute('srcdoc') || '').length + 'b' : '0b'}`)
if (!iframe) problems.push('workspace: artifact iframe missing after run completed')

console.log('\n--- i18n (driven through the real UI) -----------------------')
window.location.hash = '#/'
await wait(1200)
const doc = window.document
const langButton = [...doc.querySelectorAll('button')].find((b) => /^(EN|RU)$/.test(b.textContent.trim().toUpperCase()))
if (!langButton) {
  problems.push('i18n: language switcher button not found')
  console.log('FAIL  language switcher not found')
} else {
  langButton.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  await wait(400)
  const ruOption = [...doc.querySelectorAll('button[role="option"]')].find((b) => b.textContent.includes('Русский'))
  if (!ruOption) {
    problems.push('i18n: russian option missing from the switcher menu')
    console.log('FAIL  russian option missing')
  } else {
    ruOption.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
    await wait(1200)
    const ru = text()
    const ruOk = ru.includes('Возможности') && ru.includes('Тарифы')
    const stored = window.localStorage.getItem('rsb-locale') === 'ru'
    console.log(`${ruOk && stored ? 'PASS' : 'FAIL'}  russian locale applies            persisted=${stored} sample="${ru.slice(0, 48)}…"`)
    if (!ruOk || !stored) problems.push('i18n: russian strings not applied/persisted after UI switch')
  }
}

console.log('\n--- result --------------------------------------------------')
if (problems.length) {
  console.log('PROBLEMS (' + problems.length + '):')
  problems.slice(0, 25).forEach((p) => console.log(' - ' + p))
  process.exit(1)
}
console.log('ALL CHECKS PASSED — no console errors, no uncaught exceptions.')
window.close()
