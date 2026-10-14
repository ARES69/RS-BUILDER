import type { Scenario } from '@/lib/agent'

// The artifact payloads are complete, self-contained documents rendered inside a
// sandboxed iframe. They deliberately avoid external requests so the demo works
// offline and inside restricted preview panes.
const CLOSE_SCRIPT = '</' + 'script>'

const siteArtifact = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Ember &amp; Oak — single-origin coffee, on repeat</title>
<style>
:root{--paper:#f7f2ea;--card:#fffdf9;--ink:#241c15;--muted:#7a6a5b;--ember:#c2571b;--leaf:#5d7a4a;--line:rgba(36,28,21,.14)}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.62 ui-serif,Georgia,'Times New Roman',serif}
h1,h2,h3,.sans{font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif}
.wrap{max-width:1000px;margin:0 auto;padding:0 22px}
header{display:flex;align-items:center;justify-content:space-between;padding:20px 0;border-bottom:1px solid var(--line)}
.mark{display:flex;align-items:center;gap:10px;font-weight:700;letter-spacing:-.02em}
.dot{width:12px;height:12px;border-radius:50%;background:var(--ember);box-shadow:0 0 0 4px rgba(194,87,27,.16)}
nav a{margin-left:20px;color:var(--muted);text-decoration:none;font-size:14px}
.btn{display:inline-block;background:var(--ink);color:var(--paper);padding:12px 20px;border-radius:999px;text-decoration:none;font:600 14px/1 ui-sans-serif,system-ui,sans-serif;border:0;cursor:pointer}
.btn.alt{background:transparent;color:var(--ink);border:1px solid var(--line)}
.hero{padding:74px 0 56px;display:grid;gap:18px}
.eyebrow{font:600 12px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--ember)}
h1{font-size:clamp(38px,6.4vw,68px);line-height:1.02;letter-spacing:-.035em;margin:0;max-width:16ch}
.lede{font-size:19px;color:var(--muted);max-width:52ch;margin:0}
.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px}
.beans{display:flex;gap:8px;margin-top:26px;flex-wrap:wrap}
.chip{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:7px 13px;font:500 12.5px/1 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
section{padding:52px 0;border-top:1px solid var(--line)}
h2{font-size:clamp(26px,3.4vw,36px);letter-spacing:-.03em;margin:0 0 8px}
.sub{color:var(--muted);margin:0 0 28px;max-width:56ch}
.grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(240px,1fr))}
.plan{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;display:flex;flex-direction:column;gap:10px}
.plan.best{border-color:var(--ink);box-shadow:0 18px 40px -28px rgba(36,28,21,.6)}
.price{font:800 34px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:-.03em}
.price span{font:500 13px/1 ui-sans-serif,system-ui,sans-serif;color:var(--muted);letter-spacing:0}
ul{margin:0;padding-left:18px;color:var(--muted);font-size:14.5px}
li{margin:5px 0}
.tag{align-self:flex-start;background:rgba(93,122,74,.14);color:var(--leaf);border-radius:999px;padding:4px 10px;font:600 11px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase}
details{border-bottom:1px solid var(--line);padding:14px 0}
summary{cursor:pointer;font:600 16px/1.4 ui-sans-serif,system-ui,sans-serif}
details p{color:var(--muted);margin:10px 0 0;font-size:15px}
footer{border-top:1px solid var(--line);padding:28px 0 46px;color:var(--muted);font-size:13.5px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
.stat{display:flex;gap:26px;flex-wrap:wrap;margin-top:6px}
.stat div{font:600 13px/1.5 ui-sans-serif,system-ui,sans-serif;color:var(--muted)}
.stat b{display:block;font-size:24px;color:var(--ink);letter-spacing:-.02em}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="mark"><span class="dot"></span> Ember &amp; Oak</div>
    <nav class="sans">
      <a href="#plans">Plans</a><a href="#how">How it works</a><a href="#faq">FAQ</a>
      <a class="btn" href="#plans" style="margin-left:20px">Start a subscription</a>
    </nav>
  </header>

  <div class="hero">
    <span class="eyebrow">Roasted to order · shipped within 48h</span>
    <h1>One origin at a time, until you have tasted them all.</h1>
    <p class="lede">A rotating subscription of single-origin lots from smallholder farms. We roast the day your box ships, and we tell you exactly who grew it.</p>
    <div class="actions"><a class="btn" href="#plans">Choose a plan</a><a class="btn alt" href="#how">How it works</a></div>
    <div class="beans">
      <span class="chip">Ethiopia · Guji</span><span class="chip">Colombia · Huila</span>
      <span class="chip">Kenya · Nyeri</span><span class="chip">Peru · Cajamarca</span>
    </div>
  </div>

  <section id="plans">
    <h2>Plans</h2>
    <p class="sub">Pause, skip or swap any week. Every plan includes tasting notes and the farmer's story.</p>
    <div class="grid">
      <div class="plan">
        <span class="tag">Solo</span>
        <div class="price">14€ <span>/ month</span></div>
        <p class="sub" style="margin:0">250 g, one origin, every month.</p>
        <ul><li>Whole bean or ground</li><li>Free shipping over 20€</li><li>Cancel anytime</li></ul>
        <a class="btn alt" href="#" style="margin-top:auto;text-align:center">Start solo</a>
      </div>
      <div class="plan best">
        <span class="tag">Explorer · most picked</span>
        <div class="price">29€ <span>/ month</span></div>
        <p class="sub" style="margin:0">Two 250 g bags, two origins, every month.</p>
        <ul><li>Everything in Solo</li><li>Early access to micro-lots</li><li>Brew guide matched to the lot</li><li>Free shipping, always</li></ul>
        <a class="btn" href="#" style="margin-top:auto;text-align:center">Start exploring</a>
      </div>
      <div class="plan">
        <span class="tag">House</span>
        <div class="price">69€ <span>/ month</span></div>
        <p class="sub" style="margin:0">1 kg for a busy household or small office.</p>
        <ul><li>Everything in Explorer</li><li>Two origins per shipment</li><li>Equipment loan on request</li></ul>
        <a class="btn alt" href="#" style="margin-top:auto;text-align:center">Feed the house</a>
      </div>
    </div>
  </section>

  <section id="how">
    <h2>How it works</h2>
    <div class="grid">
      <div class="plan"><span class="tag">01</span><h3 style="margin:6px 0 0">Pick your rhythm</h3><p class="sub" style="margin:0">Weekly, fortnightly or monthly. Change it any time from your account.</p></div>
      <div class="plan"><span class="tag">02</span><h3 style="margin:6px 0 0">We roast to order</h3><p class="sub" style="margin:0">Nothing sits on a shelf. Your lot is roasted the morning it ships.</p></div>
      <div class="plan"><span class="tag">03</span><h3 style="margin:6px 0 0">Taste, rate, steer</h3><p class="sub" style="margin:0">Rate each bag and the next selection adjusts to what you actually drink.</p></div>
    </div>
    <div class="stat">
      <div><b>48h</b>from roast to courier</div>
      <div><b>31</b>partner farms</div>
      <div><b>4.8/5</b>average bag rating</div>
      <div><b>12k</b>subscribers</div>
    </div>
  </section>

  <section id="faq">
    <h2>Questions</h2>
    <details open><summary>Can I skip a month?</summary><p>Yes — skip, pause or cancel from the account page up to 48 hours before your roast date. No emails required.</p></details>
    <details><summary>Whole bean or ground?</summary><p>Both, per bag. If you choose ground we ask for your brew method and grind for it: V60, Aeropress, moka or espresso.</p></details>
    <details><summary>Where do you ship?</summary><p>EU, UK, Switzerland and Norway. Shipping is free on Explorer and House plans.</p></details>
    <details><summary>Do you wholesale?</summary><p>We do. Cafés and offices get a separate price list and a rotating guest lot every quarter.</p></details>
  </section>

  <footer>
    <span>© 2026 Ember &amp; Oak Roasters · Rotterdam</span>
    <span class="sans">Demo artifact generated by RS-BUILDER</span>
  </footer>
</div>
</body>
</html>`

const deckArtifact = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Ferrite Systems — Seed deck</title>
<style>
:root{--bg:#0b0b11;--card:#12121a;--fg:#f4f4f1;--muted:#9c9ca8;--accent:#c8f751;--violet:#8b7bff;--line:rgba(255,255,255,.12)}
*{box-sizing:border-box}
html,body{margin:0;height:100%;background:var(--bg);color:var(--fg);font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif}
.deck{height:100vh;overflow-y:scroll;scroll-snap-type:y mandatory}
.slide{height:100vh;scroll-snap-align:start;display:flex;flex-direction:column;justify-content:center;gap:18px;padding:7vh 8vw;border-bottom:1px solid var(--line);position:relative}
.kicker{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:600}
h1{font-size:clamp(34px,5.4vw,66px);line-height:1.03;letter-spacing:-.035em;margin:0;max-width:20ch}
h2{font-size:clamp(26px,3.6vw,42px);letter-spacing:-.03em;margin:0}
p{font-size:clamp(15px,1.5vw,19px);color:var(--muted);margin:0;max-width:62ch;line-height:1.6}
.row{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}
.box{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:20px}
.box b{display:block;font-size:30px;letter-spacing:-.03em;color:var(--fg)}
.box span{font-size:13px;color:var(--muted)}
.num{position:absolute;right:8vw;bottom:5vh;font-size:12px;color:var(--muted);letter-spacing:.14em}
.brand{position:absolute;left:8vw;bottom:5vh;font-size:12px;color:var(--muted);letter-spacing:.14em}
ul{margin:0;padding-left:20px;color:var(--muted);font-size:clamp(14px,1.4vw,17px);line-height:1.75}
.cta{background:var(--accent);color:#0b0b0f;border-radius:14px;padding:22px 24px;font-weight:700;font-size:clamp(18px,2vw,24px);letter-spacing:-.02em;max-width:34ch}
</style>
</head>
<body>
<div class="deck">
  <section class="slide">
    <span class="kicker">Seed round · 2026</span>
    <h1>Ferrite Systems: infrastructure telemetry that explains itself.</h1>
    <p>We turn raw fleet telemetry into a plain-language incident narrative, so on-call engineers stop reading dashboards at 3 a.m.</p>
    <span class="brand">FERRITE SYSTEMS</span><span class="num">01 / 07</span>
  </section>

  <section class="slide">
    <span class="kicker">Problem</span>
    <h2>Alerts tell you something broke. Never why.</h2>
    <div class="row">
      <div class="box"><b>74%</b><span>of on-call time goes to triage, not repair</span></div>
      <div class="box"><b>11</b><span>average tools an SRE correlates by hand</span></div>
      <div class="box"><b>38m</b><span>median time to identify root cause</span></div>
    </div>
    <span class="brand">FERRITE SYSTEMS</span><span class="num">02 / 07</span>
  </section>

  <section class="slide">
    <span class="kicker">Traction</span>
    <h2>ARR grew 4.6x in nine months.</h2>
    <svg viewBox="0 0 720 260" width="100%" height="260" role="img" aria-label="ARR by quarter">
      <g stroke="rgba(255,255,255,.1)"><line x1="0" y1="65" x2="720" y2="65"/><line x1="0" y1="130" x2="720" y2="130"/><line x1="0" y1="195" x2="720" y2="195"/></g>
      <g fill="#8b7bff"><rect x="40" y="196" width="62" height="44" rx="6"/><rect x="150" y="170" width="62" height="70" rx="6"/><rect x="260" y="132" width="62" height="108" rx="6"/></g>
      <g fill="#c8f751"><rect x="370" y="96" width="62" height="144" rx="6"/><rect x="480" y="52" width="62" height="188" rx="6"/><rect x="590" y="18" width="62" height="222" rx="6"/></g>
      <g fill="#9c9ca8" font-size="13" font-family="ui-sans-serif,system-ui,sans-serif">
        <text x="40" y="252">Q1</text><text x="150" y="252">Q2</text><text x="260" y="252">Q3</text>
        <text x="370" y="252">Q4</text><text x="480" y="252">Q5</text><text x="590" y="252">Q6</text>
      </g>
      <g fill="#f4f4f1" font-size="13" font-family="ui-sans-serif,system-ui,sans-serif" font-weight="600">
        <text x="40" y="188">0.4M</text><text x="150" y="162">0.7M</text><text x="260" y="124">1.1M</text>
        <text x="370" y="88">1.6M</text><text x="480" y="44">2.3M</text><text x="590" y="10">3.4M</text>
      </g>
    </svg>
    <p>Net revenue retention 131%. Six of nine accounts expanded within two quarters of go-live.</p>
    <span class="brand">FERRITE SYSTEMS</span><span class="num">03 / 07</span>
  </section>

  <section class="slide">
    <span class="kicker">Product</span>
    <h2>One narrative per incident, generated as it happens.</h2>
    <ul>
      <li>Ingests metrics, logs, traces and deploy events without agents on host.</li>
      <li>Builds a causal timeline and names the most likely trigger.</li>
      <li>Posts the narrative to the incident channel, then keeps it updated.</li>
      <li>Exports a blameless postmortem draft an hour after resolution.</li>
    </ul>
    <span class="brand">FERRITE SYSTEMS</span><span class="num">04 / 07</span>
  </section>

  <section class="slide">
    <span class="kicker">Market</span>
    <h2>Observability is a 41B€ market with a narrative gap.</h2>
    <div class="row">
      <div class="box"><b>41B€</b><span>observability &amp; monitoring spend, 2026</span></div>
      <div class="box"><b>13%</b><span>CAGR through 2030</span></div>
      <div class="box"><b>2.1M</b><span>SRE and platform roles in EU + US</span></div>
    </div>
    <span class="brand">FERRITE SYSTEMS</span><span class="num">05 / 07</span>
  </section>

  <section class="slide">
    <span class="kicker">Team</span>
    <h2>Built by people who carried the pager.</h2>
    <div class="row">
      <div class="box"><b>D. Sokolov</b><span>CEO — 8 years platform infra, ex-fleet telemetry lead</span></div>
      <div class="box"><b>M. Iversen</b><span>CTO — distributed tracing, three exits</span></div>
      <div class="box"><b>P. Adeyemi</b><span>Head of Design — incident UX at two dev-tool companies</span></div>
    </div>
    <span class="brand">FERRITE SYSTEMS</span><span class="num">06 / 07</span>
  </section>

  <section class="slide">
    <span class="kicker">The ask</span>
    <div class="cta">Raising 4.5M€ to reach 2M€ ARR in 18 months.</div>
    <ul>
      <li>45% engineering: causal graph v2 and on-prem collector.</li>
      <li>35% go-to-market: two enterprise AEs and a partner channel.</li>
      <li>20% operations: SOC 2 Type II and an EU data residency region.</li>
    </ul>
    <span class="brand">FERRITE SYSTEMS</span><span class="num">07 / 07</span>
  </section>
</div>
</body>
</html>`

export const scenarios: Scenario[] = [
  {
    id: 'site',
    label: { en: 'Landing page', ru: 'Лендинг' },
    prompt: {
      en: 'Build a landing page for a single-origin coffee subscription: hero, three plans, how it works, FAQ, footer. Warm editorial palette, serif headings.',
      ru: 'Собери лендинг для подписки на моносортный кофе: герой, три тарифа, как это работает, FAQ, футер. Тёплая журнальная палитра, заголовки с засечками.',
    },
    kind: 'html',
    icon: 'globe',
    totalCredits: 320,
    runtime: '4m 12s',
    intro: {
      en: 'Got it. A conversion-first landing page in a warm editorial style. I will draft the structure, write the copy, generate the palette, build the page and verify it before handing it over.',
      ru: 'Понял. Лендинг с фокусом на конверсию в тёплом журнальном стиле. Составлю структуру, напишу тексты, подберу палитру, соберу страницу и проверю её перед сдачей.',
    },
    steps: [
      {
        id: 's1',
        title: { en: 'Define structure and copy angle', ru: 'Определить структуру и подачу текста' },
        estimate: '35s',
        credits: 40,
        thoughts: [
          { en: 'Single product, subscription model — the page needs a plan picker above the fold and trust signals right after.', ru: 'Один продукт, модель подписки — на первом экране нужен выбор тарифа, сразу после него сигналы доверия.' },
          { en: 'Five sections: hero, plans, how it works, FAQ, footer. That is the shortest path to a decision.', ru: 'Пять секций: герой, тарифы, как это работает, FAQ, футер. Это кратчайший путь к решению.' },
        ],
        tools: [{ name: 'editor', detail: { en: 'Drafting information architecture and headline candidates', ru: 'Черновик информационной архитектуры и вариантов заголовка' } }],
        console: ['plan: 5 sections, 3 plan tiers, 4 FAQ entries', 'copy angle: origin transparency + roast-to-order freshness'],
      },
      {
        id: 's2',
        title: { en: 'Generate palette and type scale', ru: 'Сгенерировать палитру и типографическую шкалу' },
        estimate: '50s',
        credits: 60,
        thoughts: [
          { en: 'Warm paper background, ember orange as the accent, olive green for tags. Serif for headings, system sans for UI.', ru: 'Тёплый бумажный фон, акцент — угольный оранжевый, теги — оливковый. Заголовки с засечками, UI — системный гротеск.' },
        ],
        tools: [
          { name: 'design', detail: { en: 'Producing 6 palette directions, selecting warm editorial', ru: 'Генерация 6 вариантов палитры, выбран тёплый журнальный' } },
          { name: 'file', detail: { en: 'Writing tokens.json', ru: 'Запись tokens.json' } },
        ],
        files: [
          {
            path: 'design/tokens.json',
            kind: 'json',
            bytes: '1.1 KB',
            content: `{
  "color": {
    "paper": "#f7f2ea",
    "card": "#fffdf9",
    "ink": "#241c15",
    "muted": "#7a6a5b",
    "ember": "#c2571b",
    "leaf": "#5d7a4a"
  },
  "radius": { "card": "18px", "pill": "999px" },
  "type": { "heading": "ui-serif, Georgia", "ui": "system-ui, sans-serif" }
}`,
          },
        ],
        console: ['tokens: 6 colors, 2 radii, 2 type families', 'contrast check: ink/paper 12.4:1 ✓ ember/paper 4.6:1 ✓'],
      },
      {
        id: 's3',
        title: { en: 'Build the page and components', ru: 'Собрать страницу и компоненты' },
        estimate: '2m 10s',
        credits: 130,
        thoughts: [
          { en: 'Semantic HTML, no framework needed for a page this size. Inline CSS keeps it a single portable file.', ru: 'Семантический HTML, фреймворк для такой страницы не нужен. Инлайновый CSS делает её одним переносимым файлом.' },
          { en: 'Plan cards: Solo 14€, Explorer 29€ highlighted, House 69€. FAQ as native details elements for accessibility.', ru: 'Карточки тарифов: Solo 14€, Explorer 29€ с выделением, House 69€. FAQ — на нативных details для доступности.' },
        ],
        tools: [
          { name: 'editor', detail: { en: 'Writing index.html (hero, plans, how, FAQ, footer)', ru: 'Запись index.html (герой, тарифы, как работает, FAQ, футер)' } },
          { name: 'shell', detail: { en: 'Validating markup and checking asset weight', ru: 'Валидация разметки и проверка веса ассетов' } },
        ],
        files: [
          {
            path: 'index.html',
            kind: 'html',
            bytes: '14.2 KB',
            content: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Ember &amp; Oak — single-origin coffee, on repeat</title>
    <style>:root{--paper:#f7f2ea;--ink:#241c15;--ember:#c2571b}
    body{margin:0;background:var(--paper);color:var(--ink)}
    /* … 218 more lines … */</style>
  </head>
  <body>
    <header><div class="mark">Ember &amp; Oak</div><nav>…</nav></header>
    <main>
      <section class="hero"><h1>One origin at a time…</h1></section>
      <section id="plans">…3 plan cards…</section>
      <section id="how">…3 steps + 4 stats…</section>
      <section id="faq">…4 details…</section>
    </main>
    <footer>…</footer>
  </body>
</html>`,
          },
          {
            path: 'README.md',
            kind: 'md',
            bytes: '0.8 KB',
            content: `# Ember & Oak — landing page

Single-file static page. No build step, no dependencies.

## Run locally
    python3 -m http.server 8080

## Sections
hero · plans (3) · how it works (3 steps + stats) · FAQ (4) · footer

## Editing
All colors and radii live in the :root block at the top of the file.`,
          },
        ],
        console: ['wrote index.html 14.2 KB', 'html-validate: 0 errors, 0 warnings', 'total weight: 14.2 KB (no external requests)'],
      },
      {
        id: 's4',
        title: { en: 'Check references and market wording', ru: 'Проверить референсы и формулировки' },
        estimate: '45s',
        credits: 40,
        thoughts: [
          { en: 'Verified that subscription coffee pages convert better with the plan picker above the fold and shipping terms next to the price.', ru: 'Проверил: у подписочных кофейных страниц конверсия выше, когда выбор тарифа на первом экране, а условия доставки — рядом с ценой.' },
        ],
        tools: [{ name: 'search', detail: { en: 'Comparing 12 subscription coffee landing pages', ru: 'Сравнение 12 лендингов кофейных подписок' } }],
        browse: [
          { url: 'https://example-coffee.co/subscribe', title: 'Competitor A — subscribe flow', note: { en: 'Plan picker above the fold, shipping stated inline', ru: 'Выбор тарифа на первом экране, доставка указана рядом' } },
          { url: 'https://example-roasters.eu/', title: 'Competitor B — homepage', note: { en: 'Hero video, plans buried two scrolls down — lower clarity', ru: 'Видео в герое, тарифы спрятаны на два скролла ниже — хуже читаемость' } },
        ],
        console: ['sources reviewed: 12', 'pattern: plan picker above fold in 9/12 top converters'],
      },
      {
        id: 's5',
        title: { en: 'Responsive pass, Lighthouse and deploy', ru: 'Адаптив, Lighthouse и деплой' },
        estimate: '32s',
        credits: 50,
        thoughts: [
          { en: 'Tightening the grid at 640px, raising tap targets to 44px, then running an audit and publishing a preview URL.', ru: 'Правлю сетку на 640px, увеличиваю тап-зоны до 44px, затем прогоняю аудит и публикую preview-URL.' },
        ],
        tools: [
          { name: 'browser', detail: { en: 'Rendering at 360 / 768 / 1440 px and capturing screenshots', ru: 'Рендер на 360 / 768 / 1440 px со скриншотами' } },
          { name: 'deploy', detail: { en: 'Publishing preview build', ru: 'Публикация preview-сборки' } },
        ],
        console: ['viewport 360px: no overflow ✓', 'viewport 768px: 2-col plans ✓', 'lighthouse: perf 98 · a11y 100 · best-practices 100 · seo 100', 'deployed → preview.rs-builder.app/ember-oak'],
      },
    ],
    outro: {
      en: 'Done. The page is a single portable HTML file — no build step, no external requests. Scores: performance 98, accessibility 100. Tell me what to adjust: copy tone, a fourth plan, real photos, or a working checkout.',
      ru: 'Готово. Страница — один переносимый HTML-файл: без сборки и внешних запросов. Оценки: performance 98, accessibility 100. Скажите, что поправить: тон текстов, четвёртый тариф, реальные фото или рабочий чекаут.',
    },
    artifact: {
      title: { en: 'Ember & Oak — landing page', ru: 'Ember & Oak — лендинг' },
      fileName: 'index.html',
      kind: 'html',
      html: siteArtifact,
      note: { en: 'Live preview of the generated page', ru: 'Живое превью сгенерированной страницы' },
    },
    delivered: [
      { en: 'index.html — 14.2 KB, zero dependencies', ru: 'index.html — 14.2 КБ, без зависимостей' },
      { en: 'design/tokens.json — palette and type scale', ru: 'design/tokens.json — палитра и типографика' },
      { en: 'Lighthouse report — 98 / 100 / 100 / 100', ru: 'Отчёт Lighthouse — 98 / 100 / 100 / 100' },
      { en: 'Preview URL, valid for 30 days', ru: 'Preview-URL, действует 30 дней' },
    ],
  },
  {
    id: 'deck',
    label: { en: 'Investor deck', ru: 'Инвест-дек' },
    prompt: {
      en: 'Turn our metrics CSV into a seed deck: problem, product, traction chart, market, team, the ask. Maximum seven slides, dark and technical.',
      ru: 'Преврати наш CSV с метриками в seed-дек: проблема, продукт, график тракции, рынок, команда, запрос. Максимум семь слайдов, тёмный и технический стиль.',
    },
    kind: 'slides',
    icon: 'presentation',
    totalCredits: 540,
    runtime: '6m 48s',
    intro: {
      en: 'Seven slides, dark technical style, charts drawn from your numbers. I will read the CSV, find the story in it, then lay out the deck and write speaker notes.',
      ru: 'Семь слайдов, тёмный технический стиль, графики по вашим числам. Прочитаю CSV, найду в нём историю, затем соберу дек и напишу заметки спикера.',
    },
    steps: [
      {
        id: 'd1',
        title: { en: 'Parse metrics.csv and extract the story', ru: 'Разобрать metrics.csv и выделить суть' },
        estimate: '55s',
        credits: 80,
        thoughts: [
          { en: 'ARR 0.4M → 3.4M over six quarters, NRR 131%. The growth curve is the strongest slide; it should come third, right after the problem.', ru: 'ARR 0.4M → 3.4M за шесть кварталов, NRR 131%. Кривая роста — сильнейший слайд; ставлю её третьей, сразу после проблемы.' },
        ],
        tools: [
          { name: 'shell', detail: { en: 'Loading metrics.csv (6 quarters × 9 columns)', ru: 'Загрузка metrics.csv (6 кварталов × 9 колонок)' } },
          { name: 'file', detail: { en: 'Normalizing columns and computing CAGR', ru: 'Нормализация колонок и расчёт CAGR' } },
        ],
        files: [
          {
            path: 'data/metrics.csv',
            kind: 'csv',
            bytes: '0.6 KB',
            content: `quarter,arr_eur,customers,nrr_pct,logo_churn_pct,deploy_h,team
Q1,410000,7,118,4.1,9,11
Q2,720000,11,124,3.2,7,14
Q3,1130000,16,127,2.8,5,18
Q4,1610000,21,129,2.1,4,22
Q5,2340000,27,130,1.7,3,26
Q6,3390000,34,131,1.2,2,31`,
          },
        ],
        console: ['rows: 6 · columns: 9 · missing: 0', 'arr cagr (6q): 69.4% · nrr trend: +13pt', 'narrative: telemetry teams drown in alerts, we write the story for them'],
      },
      {
        id: 'd2',
        title: { en: 'Build the master layout and palette', ru: 'Собрать мастер-макет и палитру' },
        estimate: '1m 20s',
        credits: 110,
        thoughts: [
          { en: 'Near-black canvas, lime for the key number, violet for historical quarters. One grid, one kicker style, slide numbers bottom-right.', ru: 'Почти чёрный фон, лайм для ключевой цифры, фиолетовый для прошлых кварталов. Одна сетка, один стиль киккера, номера слайдов справа внизу.' },
        ],
        tools: [
          { name: 'design', detail: { en: 'Generating master: title, section, chart, list, ask', ru: 'Генерация мастера: титул, секция, график, список, запрос' } },
          { name: 'render', detail: { en: 'Building the ARR chart as vector, not a bitmap', ru: 'Сборка графика ARR в векторе, а не битмапом' } },
        ],
        console: ['master slides: 5 layouts', 'chart: 6 bars, vector, labels inline', 'type scale: 66/42/19/13'],
      },
      {
        id: 'd3',
        title: { en: 'Write the seven slides', ru: 'Написать семь слайдов' },
        estimate: '2m 40s',
        credits: 210,
        thoughts: [
          { en: 'One argument per slide, max 22 words of body copy. Numbers do the persuading.', ru: 'По одному аргументу на слайд, не больше 22 слов в основном тексте. Убеждают цифры.' },
          { en: 'Slide 7 states the raise, the allocation in three buckets and the milestone it buys.', ru: 'Слайд 7: объём раунда, распределение по трём статьям и веха, которую это покупает.' },
        ],
        tools: [{ name: 'editor', detail: { en: 'Writing slide copy and speaker notes', ru: 'Запись текстов слайдов и заметок спикера' } }],
        files: [
          {
            path: 'deck/speaker-notes.md',
            kind: 'md',
            bytes: '2.3 KB',
            content: `# Speaker notes — Ferrite Systems seed deck

01 Title (20s) — one sentence on what we do. Do not read the headline.
02 Problem (45s) — land the 38-minute median. Ask the room if it matches their last incident.
03 Traction (60s) — the chart carries it. Say "4.6x in nine months" once, then stop.
04 Product (75s) — walk the narrative output, not the architecture.
05 Market (30s) — only the narrative gap line matters.
06 Team (30s) — pager credibility, one line each.
07 Ask (60s) — 4.5M to 2M ARR in 18 months. Allocation, then milestone.

Total: ~5m 20s. Leave 15 minutes for questions.`,
          },
        ],
        console: ['slides: 7 · words per slide avg: 18', 'speaker notes: 7 blocks, 5m20s total', 'reading level: grade 9'],
      },
      {
        id: 'd4',
        title: { en: 'Fact-check every number', ru: 'Проверить каждую цифру' },
        estimate: '50s',
        credits: 80,
        thoughts: [
          { en: 'Market figures need a source line in the appendix even if it never gets shown.', ru: 'Рыночным цифрам нужна строка с источником в приложении, даже если его не покажут.' },
        ],
        tools: [{ name: 'search', detail: { en: 'Verifying market size and CAGR claims against three sources', ru: 'Проверка объёма рынка и CAGR по трём источникам' } }],
        browse: [
          { url: 'https://example-analysts.io/observability-2026', title: 'Observability market report 2026', note: { en: 'Confirms 41B€ and 13% CAGR', ru: 'Подтверждает 41B€ и CAGR 13%' } },
        ],
        console: ['claims checked: 11 · verified: 11 · flagged: 0', 'appendix sources: 3'],
      },
      {
        id: 'd5',
        title: { en: 'Export PPTX, PDF and web deck', ru: 'Экспорт в PPTX, PDF и веб-дек' },
        estimate: '43s',
        credits: 60,
        tools: [
          { name: 'render', detail: { en: 'Rendering 3 formats with embedded vector charts', ru: 'Рендер трёх форматов с векторными графиками' } },
          { name: 'file', detail: { en: 'Packaging the deliverables', ru: 'Упаковка артефактов' } },
        ],
        console: ['ferrite-seed.pptx · 2.8 MB · editable charts', 'ferrite-seed.pdf · 1.4 MB · 7 pages', 'deck.html · 640 KB · scroll-snap web deck'],
      },
    ],
    outro: {
      en: 'Seven slides, all numbers traced back to metrics.csv, charts still editable. Speaker notes time out at about 5 minutes 20 seconds. Want a lighter version for a warm intro, or an appendix with the methodology?',
      ru: 'Семь слайдов, все цифры прослеживаются до metrics.csv, графики редактируемые. Заметки спикера по таймингу — около 5 минут 20 секунд. Нужна светлая версия для тёплого интро или приложение с методологией?',
    },
    artifact: {
      title: { en: 'Ferrite Systems — seed deck', ru: 'Ferrite Systems — seed-дек' },
      fileName: 'deck.html',
      kind: 'slides',
      html: deckArtifact,
      note: { en: 'Web deck — scroll to advance', ru: 'Веб-дек — листайте скроллом' },
    },
    delivered: [
      { en: 'ferrite-seed.pptx — editable charts', ru: 'ferrite-seed.pptx — редактируемые графики' },
      { en: 'ferrite-seed.pdf — 7 pages', ru: 'ferrite-seed.pdf — 7 страниц' },
      { en: 'deck.html — scrollable web deck', ru: 'deck.html — веб-дек со скроллом' },
      { en: 'speaker-notes.md — timed per slide', ru: 'speaker-notes.md — с таймингом на слайд' },
    ],
  },
]

const reportArtifact = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>EU AI coding tools — market scan</title>
<style>
:root{--bg:#fbfaf7;--card:#fff;--ink:#14141a;--muted:#6a6a76;--line:rgba(20,20,26,.12);--teal:#0f8f87;--amber:#b4690e}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.66 ui-sans-serif,system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif}
.page{max-width:900px;margin:0 auto;padding:56px 26px 90px}
.kicker{font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--teal);font-weight:700}
h1{font-size:clamp(30px,4.6vw,46px);line-height:1.08;letter-spacing:-.03em;margin:12px 0 10px}
.meta{color:var(--muted);font-size:13.5px;border-bottom:1px solid var(--line);padding-bottom:22px;margin-bottom:26px}
h2{font-size:22px;letter-spacing:-.02em;margin:38px 0 10px}
h3{font-size:16px;margin:22px 0 6px}
p{margin:0 0 14px}
.callout{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--teal);border-radius:12px;padding:18px 20px}
table{width:100%;border-collapse:collapse;font-size:14px;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}
th,td{text-align:left;padding:11px 13px;border-bottom:1px solid var(--line);vertical-align:top}
th{background:#f1efe9;font-size:11.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--muted)}
tr:last-child td{border-bottom:0}
.pill{display:inline-block;border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:600}
.ok{background:rgba(15,143,135,.13);color:var(--teal)}
.warn{background:rgba(180,105,14,.14);color:var(--amber)}
.gap{background:rgba(20,20,26,.07);color:var(--muted)}
ol,ul{margin:0 0 16px;padding-left:22px}
li{margin:6px 0}
sup a{color:var(--teal);text-decoration:none;font-weight:600}
.refs{font-size:13px;color:var(--muted)}
.refs li{margin:4px 0}
.foot{margin-top:44px;border-top:1px solid var(--line);padding-top:16px;font-size:12.5px;color:var(--muted);display:flex;justify-content:space-between;gap:14px;flex-wrap:wrap}
</style>
</head>
<body>
<div class="page">
  <span class="kicker">Wide Research · 32 sub-agents · 418 sources</span>
  <h1>AI coding tools sold into the EU: landscape, pricing and compliance gaps</h1>
  <div class="meta">Prepared by RS-BUILDER · run time 21m 05s · 1,840 credits · 40 vendors profiled, 32 in scope for the EU market</div>

  <div class="callout">
    <strong>Executive summary.</strong> The EU-facing AI coding market splits into three groups: editor copilots competing on price, autonomous agents competing on task completion, and compliance-first platforms selling to regulated industries. Group three is the least crowded and carries the highest average contract value. Four concrete gaps are listed in section 5.
  </div>

  <h2>1. Scope and method</h2>
  <p>Thirty-two sub-agents each profiled one to two vendors using public pricing pages, documentation, EU customer references, procurement notices and, where available, published SOC 2 / ISO 27001 summaries. A second pass cross-checked every pricing claim against a live page visit; nine vendors had changed pricing in the previous 60 days.<sup><a href="#r4">4</a></sup></p>

  <h2>2. Market structure</h2>
  <table>
    <thead><tr><th>Segment</th><th>Vendors</th><th>Median price / seat / month</th><th>Typical ACV</th><th>Crowding</th></tr></thead>
    <tbody>
      <tr><td>Editor copilot</td><td>17</td><td>19 €</td><td>230 €</td><td><span class="pill warn">High</span></td></tr>
      <tr><td>Autonomous agent</td><td>9</td><td>79 €</td><td>2,400 €</td><td><span class="pill warn">Medium</span></td></tr>
      <tr><td>Compliance-first platform</td><td>4</td><td>145 €</td><td>18,600 €</td><td><span class="pill ok">Low</span></td></tr>
      <tr><td>Self-hosted / air-gapped</td><td>2</td><td>Custom</td><td>40,000 €+</td><td><span class="pill ok">Very low</span></td></tr>
    </tbody>
  </table>

  <h2>3. Pricing patterns</h2>
  <ul>
    <li>Nineteen of thirty-two vendors price per seat; seven meter on usage units, and the usage-metered group reports 22% higher expansion revenue on average.</li>
    <li>Only six publish EU prices in euro without a "contact us" gate — a friction point repeatedly mentioned in procurement threads.</li>
    <li>Annual discounts cluster at 15–20%; three vendors offer no annual discount at all.</li>
  </ul>

  <h2>4. Compliance posture</h2>
  <table>
    <thead><tr><th>Control</th><th>Vendors with it</th><th>Notes</th></tr></thead>
    <tbody>
      <tr><td>EU data residency</td><td>11 / 32</td><td>Seven of those are the compliance-first and self-hosted groups</td></tr>
      <tr><td>SOC 2 Type II</td><td>21 / 32</td><td>Four more report "in progress"</td></tr>
      <tr><td>ISO 27001</td><td>14 / 32</td><td>Most common among vendors with public-sector customers</td></tr>
      <tr><td>Contractual no-training clause</td><td>18 / 32</td><td>Nine require an enterprise tier for it</td></tr>
      <tr><td>DPA available self-serve</td><td>9 / 32</td><td><span class="pill gap">Gap</span> most gate it behind sales</td></tr>
    </tbody>
  </table>

  <h2>5. Identified gaps</h2>
  <ol>
    <li><strong>Regulated mid-market.</strong> Banks under 5,000 employees and public health bodies want EU residency plus SSO without a 40k€ contract. Only two vendors serve this band credibly.</li>
    <li><strong>Self-serve DPA.</strong> Twenty-three vendors force a sales call for a data processing agreement; legal teams consistently flag this as the slowest step in procurement.</li>
    <li><strong>Usage transparency.</strong> Metered vendors rarely expose per-task cost before the run finishes. Buyers treat this as a budget risk.</li>
    <li><strong>Local-language output.</strong> Documentation and code comments in German, French, Dutch and Polish are an unmet requirement in 14 of 60 reviewed tenders.</li>
  </ol>

  <h2>6. Contradictions found</h2>
  <p>Three vendors advertise "SOC 2 certified" on marketing pages while their trust center lists Type I only. Two claim EU residency that on inspection routes inference through a US region. Both findings are flagged in the source spreadsheet with the exact page captured.<sup><a href="#r7">7</a></sup></p>

  <h2>7. Sources</h2>
  <ol class="refs">
    <li id="r1">Vendor public pricing pages, captured 2026-10-04 through 2026-10-09 (32 sites).</li>
    <li id="r2">Vendor trust centers and security summaries (24 of 32 published one).</li>
    <li id="r3">EU procurement portals: 60 tenders mentioning AI-assisted development, 2025–2026.</li>
    <li id="r4">Second-pass verification log with timestamps for the nine pricing changes.</li>
    <li id="r5">Published analyst estimates for developer-tool spend in the EU.</li>
    <li id="r6">Customer reference interviews quoted in vendor case studies (18).</li>
    <li id="r7">Contradiction evidence pack: page captures and archive diffs.</li>
  </ol>

  <div class="foot">
    <span>RS-BUILDER · Wide Research report · 38 pages in the full export, abridged here</span>
    <span>Companion files: vendors.csv, pricing-matrix.xlsx, evidence/</span>
  </div>
</div>
</body>
</html>`

const gameArtifact = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>NEON HOP — one-button arcade</title>
<style>
html,body{margin:0;height:100%;background:#08080c;color:#f4f4f1;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;overflow:hidden}
#wrap{position:fixed;inset:0;display:grid;place-items:center}
canvas{background:radial-gradient(circle at 50% 22%,#1b1b28 0%,#08080c 62%);border:1px solid rgba(255,255,255,.12);border-radius:16px;max-width:96vw;max-height:78vh;touch-action:none}
#hud{position:absolute;top:max(14px,3vh);left:0;right:0;display:flex;justify-content:center;gap:26px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#8e8e9c}
#hud b{color:#c8f751;font-weight:600}
#msg{position:absolute;left:0;right:0;bottom:max(16px,5vh);text-align:center;font-size:13px;letter-spacing:.08em;color:#8e8e9c}
#msg em{color:#c8f751;font-style:normal}
</style>
</head>
<body>
<div id="wrap">
  <canvas id="c" width="760" height="430"></canvas>
  <div id="hud">
    <span>score <b id="s">0</b></span>
    <span>best <b id="b">0</b></span>
    <span>combo <b id="x">x1</b></span>
  </div>
  <div id="msg">tap / click / space to hop &nbsp;·&nbsp; collect the <em>lime cells</em> &nbsp;·&nbsp; avoid the <em>red blocks</em></div>
</div>
<script>
(function () {
  var c = document.getElementById('c'), x = c.getContext('2d');
  var W = c.width, H = c.height, GROUND = H - 62;
  var elS = document.getElementById('s'), elB = document.getElementById('b'), elX = document.getElementById('x');
  var player, obs, cells, parts, stars, score, best, combo, comboT, speed, shake, t, dead, started, rafId;

  try { best = parseInt(window.localStorage.getItem('neonhop.best') || '0', 10) || 0; } catch (e) { best = 0; }

  function reset() {
    player = { x: 130, y: GROUND, vy: 0, r: 15, hops: 0 };
    obs = []; cells = []; parts = []; stars = [];
    score = 0; combo = 1; comboT = 0; speed = 5.2; shake = 0; t = 0; dead = false;
    for (var i = 0; i < 46; i++) stars.push({ x: Math.random() * W, y: Math.random() * (GROUND - 30), z: Math.random() * 0.7 + 0.15 });
    elB.textContent = best;
  }

  function hop() {
    if (!started) { started = true; reset(); loop(); return; }
    if (dead) { started = true; reset(); return; }
    if (player.hops < 2) {
      player.vy = player.hops === 0 ? -13.4 : -11.6;
      player.hops++;
      burst(player.x, GROUND - 4, 8, '#8b7bff', 2.4);
    }
  }

  function burst(bx, by, n, color, sp) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = Math.random() * sp + 0.6;
      parts.push({ x: bx, y: by, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1, life: 1, color: color });
    }
  }

  function spawn() {
    if (Math.random() < 0.55) {
      var h = 26 + Math.random() * 44;
      obs.push({ x: W + 40, y: GROUND - h, w: 22 + Math.random() * 20, h: h });
    } else {
      cells.push({ x: W + 40, y: GROUND - 70 - Math.random() * 110, r: 9, ph: Math.random() * 6.28 });
    }
  }

  function hit(o) {
    return player.x + player.r * 0.7 > o.x && player.x - player.r * 0.7 < o.x + o.w && player.y > o.y - 2;
  }

  function step() {
    t++;
    speed = 5.2 + Math.min(6.4, t / 900);
    if (t % Math.max(26, 62 - Math.floor(t / 240)) === 0) spawn();

    player.vy += 0.66;
    player.y += player.vy;
    if (player.y >= GROUND) { player.y = GROUND; player.vy = 0; player.hops = 0; }

    for (var i = stars.length - 1; i >= 0; i--) {
      stars[i].x -= speed * stars[i].z * 0.35;
      if (stars[i].x < -4) { stars[i].x = W + 4; stars[i].y = Math.random() * (GROUND - 30); }
    }

    for (var j = obs.length - 1; j >= 0; j--) {
      obs[j].x -= speed;
      if (obs[j].x + obs[j].w < -20) { obs.splice(j, 1); continue; }
      if (hit(obs[j])) { dead = true; shake = 16; burst(player.x, player.y - 10, 26, '#ff6369', 5); }
    }

    for (var k = cells.length - 1; k >= 0; k--) {
      var cl = cells[k];
      cl.x -= speed; cl.ph += 0.12;
      if (cl.x < -20) { cells.splice(k, 1); combo = 1; continue; }
      var dx = cl.x - player.x, dy = cl.y - (player.y - 10);
      if (dx * dx + dy * dy < (cl.r + player.r) * (cl.r + player.r)) {
        cells.splice(k, 1);
        combo = Math.min(9, combo + 1); comboT = 190;
        score += 12 * combo;
        burst(cl.x, cl.y, 14, '#c8f751', 3.6);
        shake = Math.max(shake, 5);
      }
    }

    if (comboT > 0) { comboT--; if (comboT === 0) combo = 1; }
    if (!dead) score += combo * 0.35;
    if (shake > 0) shake *= 0.86;

    for (var p = parts.length - 1; p >= 0; p--) {
      var q = parts[p];
      q.x += q.vx; q.y += q.vy; q.vy += 0.14; q.life -= 0.022;
      if (q.life <= 0) parts.splice(p, 1);
    }

    elS.textContent = Math.floor(score);
    elX.textContent = 'x' + combo;
    if (dead) {
      if (Math.floor(score) > best) {
        best = Math.floor(score);
        try { window.localStorage.setItem('neonhop.best', String(best)); } catch (e) {}
        elB.textContent = best;
      }
    }
  }

  function draw() {
    var sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
    x.save();
    x.clearRect(0, 0, W, H);
    x.translate(sx, sy);

    x.fillStyle = 'rgba(255,255,255,.5)';
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      x.globalAlpha = 0.16 + s.z * 0.5;
      x.fillRect(s.x, s.y, s.z * 2.1, s.z * 2.1);
    }
    x.globalAlpha = 1;

    x.strokeStyle = 'rgba(200,247,81,.35)';
    x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, GROUND + 1); x.lineTo(W, GROUND + 1); x.stroke();
    x.strokeStyle = 'rgba(255,255,255,.06)';
    x.lineWidth = 1;
    for (var g = 0; g < W; g += 40) {
      var off = (t * speed * 0.6) % 40;
      x.beginPath(); x.moveTo(g - off, GROUND + 2); x.lineTo(g - off - 18, H); x.stroke();
    }

    x.fillStyle = '#ff6369';
    for (var j = 0; j < obs.length; j++) {
      var o = obs[j];
      x.fillRect(o.x, o.y, o.w, o.h);
      x.fillStyle = 'rgba(255,99,105,.22)';
      x.fillRect(o.x - 3, o.y - 3, o.w + 6, o.h + 3);
      x.fillStyle = '#ff6369';
    }

    for (var k = 0; k < cells.length; k++) {
      var cl = cells[k], pu = 1 + Math.sin(cl.ph) * 0.14;
      x.fillStyle = 'rgba(200,247,81,.2)';
      x.beginPath(); x.arc(cl.x, cl.y, cl.r * 2 * pu, 0, 6.283); x.fill();
      x.fillStyle = '#c8f751';
      x.beginPath(); x.arc(cl.x, cl.y, cl.r * pu, 0, 6.283); x.fill();
    }

    for (var p = 0; p < parts.length; p++) {
      var q = parts[p];
      x.globalAlpha = Math.max(0, q.life);
      x.fillStyle = q.color;
      x.fillRect(q.x - 2, q.y - 2, 4, 4);
    }
    x.globalAlpha = 1;

    var py = player.y - player.r;
    x.fillStyle = 'rgba(139,123,255,.25)';
    x.fillRect(player.x - player.r - 4, py - 4, (player.r + 4) * 2, (player.r + 4) * 2);
    x.fillStyle = dead ? '#ff6369' : '#f4f4f1';
    x.fillRect(player.x - player.r, py, player.r * 2, player.r * 2);
    x.fillStyle = '#08080c';
    x.fillRect(player.x + 2, py + 6, 6, 6);

    if (!started) {
      x.fillStyle = 'rgba(8,8,12,.72)';
      x.fillRect(0, 0, W, H);
      x.fillStyle = '#c8f751';
      x.font = '700 46px ui-monospace, Menlo, monospace';
      x.textAlign = 'center';
      x.fillText('NEON HOP', W / 2, H / 2 - 12);
      x.fillStyle = '#9c9ca8';
      x.font = '500 15px ui-monospace, Menlo, monospace';
      x.fillText('press space or tap to start', W / 2, H / 2 + 22);
    } else if (dead) {
      x.fillStyle = 'rgba(8,8,12,.74)';
      x.fillRect(0, 0, W, H);
      x.fillStyle = '#f4f4f1';
      x.font = '700 34px ui-monospace, Menlo, monospace';
      x.textAlign = 'center';
      x.fillText('RUN OVER — ' + Math.floor(score), W / 2, H / 2 - 8);
      x.fillStyle = '#9c9ca8';
      x.font = '500 14px ui-monospace, Menlo, monospace';
      x.fillText('best ' + best + ' · tap to run again', W / 2, H / 2 + 22);
    }
    x.restore();
  }

  function loop() {
    if (!dead) step(); else { shake *= 0.9; for (var p = parts.length - 1; p >= 0; p--) { var q = parts[p]; q.x += q.vx; q.y += q.vy; q.vy += 0.14; q.life -= 0.022; if (q.life <= 0) parts.splice(p, 1); } }
    draw();
    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener('keydown', function (e) {
    if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); hop(); }
  });
  c.addEventListener('pointerdown', function (e) { e.preventDefault(); hop(); });

  started = false;
  reset();
  draw();
  window.addEventListener('pagehide', function () { if (rafId) cancelAnimationFrame(rafId); });
})();
` + CLOSE_SCRIPT + `
</body>
</html>`

const researchAndGame: Scenario[] = [
  {
    id: 'research',
    label: { en: 'Market scan', ru: 'Сканирование рынка' },
    prompt: {
      en: 'Wide Research: map every AI coding tool sold into the EU — pricing, compliance posture, and where the gaps are.',
      ru: 'Wide Research: составь карту всех ИИ-инструментов для кодинга, которые продаются в ЕС, — цены, комплаенс и где пустые ниши.',
    },
    kind: 'report',
    icon: 'microscope',
    totalCredits: 1840,
    runtime: '21m 05s',
    intro: {
      en: 'This needs a fleet. I will split the vendor list into slices, run one sub-agent per slice in parallel, then verify pricing claims and merge everything into a single sourced report.',
      ru: 'Здесь нужен флот. Разделю список вендоров на срезы, запущу по суб-агенту на срез параллельно, затем проверю заявления о ценах и сведу всё в один отчёт с источниками.',
    },
    steps: [
      {
        id: 'r1',
        title: { en: 'Build the vendor universe', ru: 'Собрать полную выборку вендоров' },
        estimate: '3m 10s',
        credits: 180,
        thoughts: [
          { en: 'Starting from four seed lists, then expanding by "alternatives to" pages, funding databases and EU procurement mentions until no new vendors appear.', ru: 'Начинаю с четырёх посевных списков, затем расширяю через страницы «альтернативы», базы финансирования и упоминания в закупках ЕС — пока не перестанут появляться новые вендоры.' },
        ],
        tools: [
          { name: 'search', detail: { en: 'Seeding from 4 lists, expanding via alternatives pages', ru: 'Посев из 4 списков, расширение через страницы альтернатив' } },
          { name: 'file', detail: { en: 'Deduplicating into vendors.csv', ru: 'Дедупликация в vendors.csv' } },
        ],
        files: [
          {
            path: 'research/vendors.csv',
            kind: 'csv',
            bytes: '6.4 KB',
            content: `vendor,segment,eu_residency,soc2,iso27001,price_seat_eur,billing,no_training_clause
alpha-code,editor_copilot,yes,yes,no,19,seat,yes
beta-pilot,editor_copilot,no,yes,no,22,seat,enterprise_only
gamma-agent,autonomous_agent,yes,yes,yes,79,usage,yes
delta-forge,autonomous_agent,no,type1,no,95,seat,no
epsilon-secure,compliance_platform,yes,yes,yes,145,seat,yes
zeta-airgap,self_hosted,on_prem,yes,yes,custom,annual,yes
# 34 more rows …`,
          },
        ],
        console: ['seed lists: 4 · raw hits: 217 · after dedupe: 61', 'in scope (sells into EU): 32 · excluded: 29 (US-only / defunct / not coding)'],
      },
      {
        id: 'r2',
        title: { en: 'Deploy 32 sub-agents in parallel', ru: 'Запустить 32 суб-агента параллельно' },
        estimate: '9m 40s',
        credits: 980,
        thoughts: [
          { en: 'One vendor per sub-agent, identical brief: pricing, residency, certifications, EU references, no-training clause. Same schema for all, so merging is mechanical.', ru: 'По одному вендору на суб-агента, единый бриф: цены, резидентность, сертификаты, референсы в ЕС, пункт про обучение. Общая схема — сведение будет механическим.' },
        ],
        tools: [
          { name: 'fleet', detail: { en: '32 sub-agents · identical brief · shared schema', ru: '32 суб-агента · единый бриф · общая схема' } },
          { name: 'browser', detail: { en: 'Visiting pricing pages, docs and trust centers', ru: 'Обход страниц с ценами, документации и trust-центров' } },
        ],
        browse: [
          { url: 'https://example-alpha-code.dev/pricing', title: 'alpha-code — pricing', note: { en: '19€ seat, EU region in Frankfurt', ru: '19€ за место, регион ЕС во Франкфурте' } },
          { url: 'https://example-gamma-agent.io/trust', title: 'gamma-agent — trust center', note: { en: 'SOC 2 Type II report available under NDA', ru: 'Отчёт SOC 2 Type II доступен под NDA' } },
          { url: 'https://ted.europa.eu/notice/2026-4411', title: 'EU tender 2026-4411', note: { en: 'Public health body requires ISO 27001 + EU residency', ru: 'Орган здравоохранения требует ISO 27001 + резидентность в ЕС' } },
        ],
        console: ['fleet: 32 agents launched · 0 failed · 418 sources visited', 'avg per agent: 13.1 sources, 41s', 'partial findings streamed to the matrix as they land'],
      },
      {
        id: 'r3',
        title: { en: 'Verify pricing and certification claims', ru: 'Проверить заявления о ценах и сертификатах' },
        estimate: '4m 25s',
        credits: 420,
        thoughts: [
          { en: 'Marketing pages lie. Second pass re-visits each pricing page and each trust center, capturing timestamps and archive diffs.', ru: 'Маркетинговые страницы врут. Второй проход заново посещает каждую страницу цен и trust-центр, фиксируя временные метки и дифы архива.' },
          { en: 'Three vendors claim SOC 2 while their trust center shows Type I only. Two claim EU residency but route inference to a US region. Flagging all five.', ru: 'Три вендора заявляют SOC 2, хотя trust-центр показывает только Type I. Два заявляют резидентность ЕС, но направляют инференс в регион США. Помечаю все пять.' },
        ],
        tools: [
          { name: 'browser', detail: { en: 'Re-visiting 32 pricing pages with timestamps', ru: 'Повторный обход 32 страниц цен с таймстампами' } },
          { name: 'search', detail: { en: 'Cross-checking certification claims against registries', ru: 'Сверка заявлений о сертификатах с реестрами' } },
        ],
        console: ['claims checked: 11 · verified: 11 · contradicted: 5', 'pricing changed in last 60d: 9 vendors', 'evidence pack: 5 captures + archive diffs'],
      },
      {
        id: 'r4',
        title: { en: 'Merge, dedupe and detect gaps', ru: 'Свести, дедуплицировать и найти пробелы' },
        estimate: '2m 30s',
        credits: 180,
        thoughts: [
          { en: 'Collapsing duplicate findings, resolving conflicts by evidence quality, then clustering what buyers ask for that nobody supplies.', ru: 'Схлопываю дубли находок, разрешаю конфликты по качеству доказательств, затем кластеризую то, что покупатели просят, но никто не даёт.' },
        ],
        tools: [{ name: 'editor', detail: { en: 'Writing the merged report and the comparison matrix', ru: 'Запись сведённого отчёта и сравнительной матрицы' } }],
        files: [
          {
            path: 'research/pricing-matrix.csv',
            kind: 'csv',
            bytes: '4.1 KB',
            content: `segment,vendors,median_price_eur,typical_acv_eur,crowding
editor_copilot,17,19,230,high
autonomous_agent,9,79,2400,medium
compliance_platform,4,145,18600,low
self_hosted,2,custom,40000+,very_low`,
          },
          {
            path: 'research/gaps.md',
            kind: 'md',
            bytes: '2.8 KB',
            content: `# Gaps identified

1. Regulated mid-market — EU residency + SSO below 40k€ ACV. Only 2 credible vendors.
2. Self-serve DPA — 23/32 gate it behind a sales call; legal teams flag it as the slowest step.
3. Usage transparency — metered vendors rarely show per-task cost before the run ends.
4. Local-language output — DE/FR/NL/PL comments and docs requested in 14/60 tenders.

Evidence: see vendors.csv columns and evidence/ captures.`,
          },
        ],
        console: ['findings merged: 418 → 96 unique', 'conflicts flagged: 5 · gaps identified: 4', 'report: 38 pages · matrix: 32 rows × 14 cols'],
      },
      {
        id: 'r5',
        title: { en: 'Export report, matrix and evidence pack', ru: 'Экспорт отчёта, матрицы и пакета доказательств' },
        estimate: '1m 20s',
        credits: 80,
        tools: [
          { name: 'render', detail: { en: 'Rendering PDF and HTML report', ru: 'Рендер отчёта в PDF и HTML' } },
          { name: 'file', detail: { en: 'Zipping evidence captures', ru: 'Архивация скриншотов-доказательств' } },
        ],
        console: ['eu-ai-coding-scan.pdf · 38 pages · 4.2 MB', 'vendors.csv + pricing-matrix.csv', 'evidence.zip · 41 captures · 11 MB'],
      },
    ],
    outro: {
      en: 'Thirty-two vendors profiled from 418 sources, five claims contradicted with evidence, four market gaps documented. The full export has 38 pages; what you see here is the abridged version. Want the gap analysis expanded into a positioning memo?',
      ru: 'Описано 32 вендора по 418 источникам, пять заявлений опровергнуты с доказательствами, четыре рыночных пробела задокументированы. В полном экспорте 38 страниц; здесь — сокращённая версия. Развернуть анализ пробелов в мемо по позиционированию?',
    },
    artifact: {
      title: { en: 'EU AI coding tools — market scan', ru: 'ИИ-инструменты ЕС — сканирование рынка' },
      fileName: 'report.html',
      kind: 'report',
      html: reportArtifact,
      note: { en: 'Abridged report — the full export is 38 pages', ru: 'Сокращённый отчёт — в полном экспорте 38 страниц' },
    },
    delivered: [
      { en: 'report.pdf — 38 pages, fully cited', ru: 'report.pdf — 38 страниц, все ссылки' },
      { en: 'vendors.csv — 32 vendors × 14 columns', ru: 'vendors.csv — 32 вендора × 14 колонок' },
      { en: 'gaps.md — four documented opportunities', ru: 'gaps.md — четыре задокументированные возможности' },
      { en: 'evidence.zip — 41 page captures with timestamps', ru: 'evidence.zip — 41 скриншот с таймстампами' },
    ],
  },
  {
    id: 'game',
    label: { en: 'Arcade game', ru: 'Аркада' },
    prompt: {
      en: 'Make a one-button arcade game with real juice: screen shake, particles, combo scoring and a local leaderboard.',
      ru: 'Сделай аркаду на одну кнопку с настоящей «сочностью»: тряска экрана, частицы, комбо-очки и локальный лидерборд.',
    },
    kind: 'game',
    icon: 'gamepad',
    totalCredits: 760,
    runtime: '9m 33s',
    intro: {
      en: 'One-button runner, canvas based, no dependencies. I will build the loop, add the game-feel pass, then actually play it to tune difficulty.',
      ru: 'Раннер на одну кнопку, на canvas, без зависимостей. Соберу игровой цикл, добавлю проход по game feel, затем сам поиграю, чтобы настроить сложность.',
    },
    steps: [
      {
        id: 'g1',
        title: { en: 'Design the core loop', ru: 'Спроектировать основной цикл' },
        estimate: '1m 05s',
        credits: 90,
        thoughts: [
          { en: 'Single input: hop. Double-hop allowed for a skill ceiling. Obstacles on the ground, collectibles in the air — that forces timing instead of mashing.', ru: 'Одно действие: прыжок. Двойной прыжок даёт потолок мастерства. Препятствия на земле, собираемые предметы в воздухе — это требует тайминга, а не спама.' },
        ],
        tools: [{ name: 'editor', detail: { en: 'Writing the loop skeleton and tuning constants', ru: 'Запись каркаса цикла и констант настройки' } }],
        console: ['loop: fixed 60fps requestAnimationFrame', 'gravity 0.66 · hop -13.4 · double hop -11.6', 'speed ramp: 5.2 → 11.6 over ~15min'],
      },
      {
        id: 'g2',
        title: { en: 'Game feel pass: shake, particles, easing', ru: 'Проход по game feel: тряска, частицы, плавность' },
        estimate: '2m 20s',
        credits: 190,
        thoughts: [
          { en: 'Shake scales with event weight: 5 on pickup, 16 on death, decaying at 0.86 per frame. Particles inherit the accent colors.', ru: 'Тряска зависит от значимости события: 5 на подборе, 16 на смерти, затухание 0.86 за кадр. Частицы наследуют цвета акцентов.' },
        ],
        tools: [
          { name: 'design', detail: { en: 'Picking a two-color neon palette on near-black', ru: 'Выбор двухцветной неоновой палитры на почти чёрном' } },
          { name: 'render', detail: { en: 'Generating starfield parallax and ground streaks', ru: 'Генерация параллакса звёзд и полос на земле' } },
        ],
        files: [
          {
            path: 'src/feel.js',
            kind: 'code',
            bytes: '2.2 KB',
            content: `// game feel constants — tune here
export const FEEL = {
  shakeOnPickup: 5,
  shakeOnDeath: 16,
  shakeDecay: 0.86,
  particleBurst: 14,
  comboWindowFrames: 190,
  comboMax: 9,
  coyoteFrames: 0,   // single-button: intentionally strict
  hitboxInset: 0.7,  // forgiving hitbox = fewer unfair deaths
}`,
          },
        ],
        console: ['particles: pooled, max 220 alive', 'shake: decaying, capped at 16px', 'hitbox inset 0.7 — forgiving on near-misses'],
      },
      {
        id: 'g3',
        title: { en: 'Combo scoring and local leaderboard', ru: 'Комбо-очки и локальный лидерборд' },
        estimate: '1m 40s',
        credits: 150,
        thoughts: [
          { en: 'Combo increments per cell collected, resets if one is missed, caps at x9. Best score persists in localStorage inside a try/catch — sandboxed embeds often block it.', ru: 'Комбо растёт за каждую собранную ячейку, сбрасывается при пропуске, максимум x9. Рекорд хранится в localStorage внутри try/catch — в изолированных фреймах доступ часто запрещён.' },
        ],
        tools: [{ name: 'editor', detail: { en: 'Wiring HUD, combo timer and persistence', ru: 'Подключение HUD, таймера комбо и сохранения' } }],
        console: ['hud: score / best / combo, updated per frame', 'persistence: localStorage guarded by try/catch', 'combo decay: 190 frames (~3.2s)'],
      },
      {
        id: 'g4',
        title: { en: 'Playtest and balance', ru: 'Плейтест и баланс' },
        estimate: '3m 05s',
        credits: 240,
        thoughts: [
          { en: 'Automated playtest: 40 runs with a naive bot. Median survival 34s was too punishing — lowered the spawn floor from 34 to 26 frames and softened gravity slightly.', ru: 'Автоматический плейтест: 40 запусков наивным ботом. Медиана выживания 34s — слишком жёстко; снизил нижнюю границу спавна с 34 до 26 кадров и немного смягчил гравитацию.' },
          { en: 'Second pass: median 71s, top decile 2m 40s. That is a fair curve for a one-button game.', ru: 'Второй проход: медиана 71s, верхний дециль 2m 40s. Для игры на одну кнопку это честная кривая.' },
        ],
        tools: [
          { name: 'browser', detail: { en: 'Running 40 headless playtests and collecting survival times', ru: '40 headless-плейтестов со сбором времени выживания' } },
          { name: 'shell', detail: { en: 'Computing the difficulty curve', ru: 'Расчёт кривой сложности' } },
        ],
        console: ['playtests: 40 · median survival 34s → tuned → 71s', 'p90: 2m40s · unfair-death reports: 0', 'spawn floor 34 → 26 frames · gravity 0.70 → 0.66'],
      },
      {
        id: 'g5',
        title: { en: 'Build and package', ru: 'Сборка и упаковка' },
        estimate: '43s',
        credits: 90,
        tools: [
          { name: 'shell', detail: { en: 'Bundling to a single index.html', ru: 'Сборка в один index.html' } },
          { name: 'deploy', detail: { en: 'Publishing a playable preview', ru: 'Публикация играбельного превью' } },
        ],
        console: ['bundle: 11.4 KB single file · 0 dependencies', 'lighthouse: perf 100 · a11y 94 (canvas alt text) · best-practices 100', 'deployed → preview.rs-builder.app/neon-hop'],
      },
    ],
    outro: {
      en: 'Playable right now in the Preview tab — space or tap to hop, double-hop in the air, collect lime cells for combo multipliers. Balance curve came from 40 automated playtests. Want sound, a second obstacle type, or touch controls tuned for mobile?',
      ru: 'Уже играбельно во вкладке Preview — пробел или тап для прыжка, двойной прыжок в воздухе, собирайте лаймовые ячейки ради множителя комбо. Кривая баланса получена из 40 автоматических плейтестов. Добавить звук, второй тип препятствий или настроить управление под мобильные?',
    },
    artifact: {
      title: { en: 'NEON HOP — playable build', ru: 'NEON HOP — играбельная сборка' },
      fileName: 'index.html',
      kind: 'game',
      html: gameArtifact,
      note: { en: 'Space / click to play — the real generated build', ru: 'Пробел или клик — это настоящая сгенерированная сборка' },
    },
    delivered: [
      { en: 'index.html — 11.4 KB, zero dependencies', ru: 'index.html — 11.4 КБ, без зависимостей' },
      { en: 'src/feel.js — tuning constants', ru: 'src/feel.js — константы настройки' },
      { en: 'Playtest log — 40 runs, survival distribution', ru: 'Лог плейтестов — 40 запусков, распределение выживания' },
      { en: 'Playable preview URL', ru: 'URL играбельного превью' },
    ],
  },
]

scenarios.push(...researchAndGame)

/* ------------------------------------------------------------------ */
/* Ad-hoc runs: any prompt that does not match a scripted scenario     */
/* still gets a believable plan, execution log and a written artifact. */
/* ------------------------------------------------------------------ */

const keywords: { match: RegExp; scenarioId: string }[] = [
  { match: /(лендинг|сайт|landing|website|web app|веб-прилож|страниц)/i, scenarioId: 'site' },
  { match: /(дек|слайд|презентац|deck|slides?|pitch|питч)/i, scenarioId: 'deck' },
  { match: /(исследован|анализ|конкурент|отчёт|отчет|research|report|market|competitor|scan)/i, scenarioId: 'research' },
  { match: /(игр|game|arcade|аркад|canvas|гейм)/i, scenarioId: 'game' },
]

export function matchScenario(prompt: string): Scenario | undefined {
  const hit = keywords.find((k) => k.match.test(prompt))
  return hit ? scenarios.find((s) => s.id === hit.scenarioId) : undefined
}

export function buildAdHocScenario(prompt: string): Scenario {
  const trimmed = prompt.trim().slice(0, 220)
  const briefArtifact = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Task brief — RS-BUILDER</title>
<style>
:root{--bg:#0b0b11;--card:#12121a;--fg:#f4f4f1;--muted:#9c9ca8;--accent:#c8f751;--line:rgba(255,255,255,.12)}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 ui-sans-serif,system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif}
.page{max-width:820px;margin:0 auto;padding:54px 26px 80px}
.kicker{font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:700}
h1{font-size:clamp(28px,4vw,42px);letter-spacing:-.03em;line-height:1.1;margin:12px 0 8px}
.meta{color:var(--muted);font-size:13px;border-bottom:1px solid var(--line);padding-bottom:20px;margin-bottom:24px}
h2{font-size:18px;letter-spacing:-.01em;margin:32px 0 10px}
.quote{background:var(--card);border:1px solid var(--line);border-left:3px solid var(--accent);border-radius:12px;padding:16px 18px;color:#dedee4;font-size:15px}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-size:11px;letter-spacing:.1em;text-transform:uppercase}
ol,ul{margin:0;padding-left:22px;color:#dedee4}
li{margin:7px 0}
.foot{margin-top:40px;border-top:1px solid var(--line);padding-top:14px;font-size:12.5px;color:var(--muted)}
code{font-family:ui-monospace,Menlo,monospace;font-size:13px;background:rgba(255,255,255,.06);padding:1px 5px;border-radius:5px}
</style>
</head>
<body>
<div class="page">
  <span class="kicker">Task brief · generated artifact</span>
  <h1>Interpretation and execution plan</h1>
  <div class="meta">RS-BUILDER · ad-hoc run · this document is the first deliverable of the task</div>

  <h2>Your request, as understood</h2>
  <div class="quote">${'{{PROMPT}}'}</div>

  <h2>Interpretation</h2>
  <p>The request is open-ended, so the first deliverable is an agreed interpretation rather than a finished artifact. Below is the reading the agent will act on, the decisions it needs from you, and the plan it will execute once confirmed.</p>

  <h2>Open questions</h2>
  <ol>
    <li>Who is the audience for the output, and where will they read it?</li>
    <li>Is there existing brand material — palette, type, tone — to follow?</li>
    <li>What does "done" look like: a draft for review, or a shipped artifact?</li>
    <li>Any hard constraints — deadline, format, length, languages?</li>
  </ol>

  <h2>Proposed plan</h2>
  <table>
    <thead><tr><th>#</th><th>Step</th><th>Output</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>Clarify scope and success criteria</td><td>this brief, signed off</td></tr>
      <tr><td>2</td><td>Gather source material and references</td><td>source list</td></tr>
      <tr><td>3</td><td>Produce a first draft in the requested format</td><td>draft artifact</td></tr>
      <tr><td>4</td><td>Self-review pass: structure, accuracy, consistency</td><td>review notes</td></tr>
      <tr><td>5</td><td>Export and hand over with iteration options</td><td>final files</td></tr>
    </tbody>
  </table>

  <h2>Assumptions in force until you say otherwise</h2>
  <ul>
    <li>Output language matches the language of the request.</li>
    <li>Neutral professional tone, no placeholder text left in the final version.</li>
    <li>Any numbers used will carry a source, or be marked as illustrative.</li>
  </ul>

  <div class="foot">Reply in the composer to confirm, correct or extend this plan — the run continues from where it is, it does not restart. <code>credits used so far: 60</code></div>
</div>
</body>
</html>`.replace('{{PROMPT}}', trimmed ? trimmed.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '—')

  return {
    id: 'adhoc-' + Math.random().toString(36).slice(2, 8),
    label: { en: 'Custom task', ru: 'Своя задача' },
    prompt: { en: prompt, ru: prompt },
    kind: 'report',
    icon: 'microscope',
    totalCredits: 260,
    runtime: '3m 20s',
    intro: {
      en: 'Open-ended request, so I will start by pinning down what "done" means, then produce a first artifact you can react to. Here is the plan.',
      ru: 'Запрос открытый, поэтому начну с того, что зафиксирую критерий готовности, затем сделаю первый артефакт, на который можно отреагировать. Вот план.',
    },
    steps: [
      {
        id: 'a1',
        title: { en: 'Interpret the request', ru: 'Интерпретировать запрос' },
        estimate: '25s',
        credits: 40,
        thoughts: [
          { en: 'Extracting the deliverable, the audience and any hard constraints from the prompt.', ru: 'Выделяю из промпта артефакт, аудиторию и жёсткие ограничения.' },
          { en: 'Ambiguity is high — the cheapest correct move is to publish the interpretation before spending time on the artifact.', ru: 'Неопределённость высокая — дешевле всего сначала опубликовать интерпретацию, прежде чем тратить время на артефакт.' },
        ],
        tools: [{ name: 'editor', detail: { en: 'Writing the interpretation brief', ru: 'Запись брифа с интерпретацией' } }],
        console: ['deliverable: unspecified → defaulting to a written brief', 'audience: unspecified · constraints: none detected', 'ambiguity score: 0.71 → clarifying pass required'],
      },
      {
        id: 'a2',
        title: { en: 'Gather references', ru: 'Собрать референсы' },
        estimate: '55s',
        credits: 70,
        thoughts: [
          { en: 'Collecting comparable examples so the first draft is not built from nothing.', ru: 'Собираю сопоставимые примеры, чтобы первый черновик не строился с нуля.' },
        ],
        tools: [
          { name: 'search', detail: { en: 'Searching for comparable deliverables', ru: 'Поиск сопоставимых артефактов' } },
          { name: 'browser', detail: { en: 'Opening the three strongest references', ru: 'Открытие трёх сильнейших референсов' } },
        ],
        browse: [
          { url: 'https://example-reference-a.dev/', title: 'Reference A', note: { en: 'Strong structure, weak visual hierarchy', ru: 'Сильная структура, слабая визуальная иерархия' } },
          { url: 'https://example-reference-b.io/spec', title: 'Reference B — spec', note: { en: 'Useful constraint checklist', ru: 'Полезный чек-лист ограничений' } },
        ],
        console: ['sources: 14 visited · 3 kept', 'patterns extracted: 6'],
      },
      {
        id: 'a3',
        title: { en: 'Draft the artifact', ru: 'Подготовить черновик артефакта' },
        estimate: '1m 20s',
        credits: 90,
        thoughts: [
          { en: 'Writing the brief document: interpretation, open questions, proposed plan, assumptions in force.', ru: 'Пишу документ-бриф: интерпретация, открытые вопросы, предлагаемый план, действующие допущения.' },
        ],
        tools: [
          { name: 'editor', detail: { en: 'Writing brief.html and notes.md', ru: 'Запись brief.html и notes.md' } },
          { name: 'file', detail: { en: 'Saving the deliverable set', ru: 'Сохранение набора артефактов' } },
        ],
        files: [
          {
            path: 'output/brief.html',
            kind: 'html',
            bytes: '5.4 KB',
            content: `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Task brief</title></head>
  <body>
    <h1>Interpretation and execution plan</h1>
    <section id="understood">…your request, as understood…</section>
    <section id="questions">…4 open questions…</section>
    <section id="plan">…5-step plan with outputs…</section>
    <section id="assumptions">…3 assumptions in force…</section>
  </body>
</html>`,
          },
          {
            path: 'output/notes.md',
            kind: 'md',
            bytes: '1.2 KB',
            content: `# Run notes

- Ambiguity was high, so the first deliverable is an interpretation brief.
- 3 references kept out of 14 visited; patterns extracted into the plan table.
- Next iteration should produce the real artifact once the four questions are answered.
- Assumptions are listed explicitly so a correction is one message away.`,
          },
        ],
        console: ['wrote output/brief.html 5.4 KB', 'wrote output/notes.md 1.2 KB', 'self-review: structure ✓ · no placeholders ✓ · sources cited ✓'],
      },
      {
        id: 'a4',
        title: { en: 'Self-review and hand over', ru: 'Самопроверка и передача' },
        estimate: '20s',
        credits: 60,
        thoughts: [
          { en: 'Checking that nothing is left as a placeholder and that every assumption is explicit.', ru: 'Проверяю, что не осталось заглушек и что все допущения сформулированы явно.' },
        ],
        tools: [{ name: 'render', detail: { en: 'Rendering the final artifact preview', ru: 'Рендер превью итогового артефакта' } }],
        console: ['placeholders found: 0', 'assumptions stated: 3', 'artifact rendered → preview pane'],
      },
    ],
    outro: {
      en: 'Here is the first deliverable: how I read your request, what I still need from you, and the plan I will run once you confirm. Answer any of the four questions in the composer and I will continue from here — the run does not restart.',
      ru: 'Вот первый артефакт: как я понял запрос, что ещё нужно от вас и план, который я выполню после подтверждения. Ответьте на любой из четырёх вопросов в композере — и я продолжу с этого места, запуск не начнётся заново.',
    },
    artifact: {
      title: { en: 'Interpretation & execution plan', ru: 'Интерпретация и план выполнения' },
      fileName: 'brief.html',
      kind: 'report',
      html: briefArtifact,
      note: { en: 'First deliverable of an open-ended run', ru: 'Первый артефакт открытого запуска' },
    },
    delivered: [
      { en: 'brief.html — interpretation, questions, plan', ru: 'brief.html — интерпретация, вопросы, план' },
      { en: 'notes.md — run notes and next iteration', ru: 'notes.md — заметки о запуске и следующей итерации' },
      { en: 'Source list — 3 references kept of 14 visited', ru: 'Список источников — 3 из 14 посещённых' },
    ],
  }
}

export function scenarioFor(prompt: string): Scenario {
  return matchScenario(prompt) ?? buildAdHocScenario(prompt)
}
