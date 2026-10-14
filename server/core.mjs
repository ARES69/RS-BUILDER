#!/usr/bin/env node
/**
 * RS-BUILDER reference agent backend — zero dependencies.
 *
 * Implements the wire contract the web app speaks when VITE_AGENT_API_URL is set:
 *
 *   GET  /v1/health            → { ok, name, version }
 *   POST /v1/runs              → Server-Sent Events stream of run events
 *        body: { prompt: string, locale: 'en' | 'ru' }
 *
 * Every SSE message is `data: <json>\n\n` where <json> is one of:
 *   {type:'run_start',runId} {type:'message',role,text:L} {type:'plan',steps:[{id,title:L,estimate}]}
 *   {type:'step_start',stepId} {type:'thought',stepId,text:L} {type:'tool',stepId,tool:{name,detail:L}}
 *   {type:'browse',stepId,page:{url,title,note:L}} {type:'console',stepId,line}
 *   {type:'file',stepId,file:{path,kind,content,bytes}} {type:'progress',credits,stepIndex,total}
 *   {type:'step_done',stepId} {type:'artifact',artifact:{title:L,fileName,kind,html,note:L}}
 *   {type:'delivered',items:L[]} {type:'done'} {type:'error',message}
 *
 * L = { en: string, ru: string } — the client renders the locale it asked for.
 *
 * The generator below is deterministic so you can develop the frontend against a
 * stable stream. Point the same endpoint at a real orchestrator (LangGraph,
 * your own agent loop, an LLM tool-calling loop) and the UI keeps working:
 * it only cares about the event shapes above.
 */
const VERSION = '1.0.0'

const L = (en, ru) => ({ en, ru })
import { buildPptx, buildSrt } from './tools.mjs'

/* ------------------------------------------------------------------ */
/* Plan synthesis                                                      */
/* ------------------------------------------------------------------ */

const KINDS = [
  { id: 'site', re: /(лендинг|сайт|landing|website|web app|веб-прилож|страниц)/i },
  { id: 'deck', re: /(дек|слайд|презентац|deck|slides?|pitch|питч)/i },
  { id: 'research', re: /(исследован|анализ|конкурент|отчёт|отчет|research|report|market|competitor|scan)/i },
  { id: 'game', re: /(игр|game|arcade|аркад|canvas|гейм)/i },
]

function detectKind(prompt) {
  return (KINDS.find((k) => k.re.test(prompt)) ?? { id: 'generic' }).id
}

function buildRun(prompt, locale) {
  const ru = locale === 'ru'
  const snippet = prompt.trim().slice(0, 140)

  const plans = {
    site: [
      { id: 's1', title: L('Define structure and copy angle', 'Определить структуру и подачу текста'), estimate: '35s', credits: 40 },
      { id: 's2', title: L('Generate palette and type scale', 'Сгенерировать палитру и типографическую шкалу'), estimate: '50s', credits: 60 },
      { id: 's3', title: L('Build the page and components', 'Собрать страницу и компоненты'), estimate: '2m 10s', credits: 130 },
      { id: 's4', title: L('Responsive pass, audit and deploy', 'Адаптив, аудит и деплой'), estimate: '45s', credits: 70 },
    ],
    deck: [
      { id: 'd1', title: L('Parse source data and extract the story', 'Разобрать исходные данные и выделить суть'), estimate: '55s', credits: 80 },
      { id: 'd2', title: L('Build the master layout', 'Собрать мастер-макет'), estimate: '1m 20s', credits: 110 },
      { id: 'd3', title: L('Write slides and speaker notes', 'Написать слайды и заметки спикера'), estimate: '2m 40s', credits: 210 },
      { id: 'd4', title: L('Export PPTX, PDF and web deck', 'Экспорт в PPTX, PDF и веб-дек'), estimate: '43s', credits: 60 },
    ],
    research: [
      { id: 'r1', title: L('Build the source universe', 'Собрать полную выборку источников'), estimate: '1m 40s', credits: 180 },
      { id: 'r2', title: L('Run parallel sub-agents over slices', 'Запустить параллельные суб-агенты по срезам'), estimate: '4m 10s', credits: 480 },
      { id: 'r3', title: L('Verify claims against primary sources', 'Проверить утверждения по первоисточникам'), estimate: '2m 05s', credits: 240 },
      { id: 'r4', title: L('Merge, dedupe and write the report', 'Свести, дедуплицировать и написать отчёт'), estimate: '1m 30s', credits: 160 },
    ],
    game: [
      { id: 'g1', title: L('Design the core loop', 'Спроектировать основной цикл'), estimate: '1m 05s', credits: 90 },
      { id: 'g2', title: L('Game-feel pass: shake, particles, easing', 'Проход по game feel: тряска, частицы, плавность'), estimate: '2m 20s', credits: 190 },
      { id: 'g3', title: L('Scoring, persistence and HUD', 'Очки, сохранение и HUD'), estimate: '1m 40s', credits: 150 },
      { id: 'g4', title: L('Automated playtest and balance', 'Автоматический плейтест и баланс'), estimate: '3m 05s', credits: 240 },
    ],
    generic: [
      { id: 'a1', title: L('Interpret the request', 'Интерпретировать запрос'), estimate: '25s', credits: 40 },
      { id: 'a2', title: L('Gather references', 'Собрать референсы'), estimate: '55s', credits: 70 },
      { id: 'a3', title: L('Draft the artifact', 'Подготовить черновик артефакта'), estimate: '1m 20s', credits: 90 },
      { id: 'a4', title: L('Self-review and hand over', 'Самопроверка и передача'), estimate: '20s', credits: 60 },
    ],
  }

  const kind = detectKind(prompt)
  const steps = plans[kind]

  const thoughts = {
    s1: [
      L('Single deliverable, decision-first layout: value proposition above the fold, proof right after.',
        'Один артефакт, компоновка под решение: ценность на первом экране, доказательства сразу после.'),
      L(`Brief received: "${snippet}". Four sections is the shortest path to a decision.`,
        `Бриф получен: «${snippet}». Четыре секции — кратчайший путь к решению.`),
    ],
    s2: [L('Two accents max; contrast checked against WCAG AA for body text.', 'Максимум два акцента; контраст проверен по WCAG AA для основного текста.')],
    s3: [L('Semantic markup, one portable file, zero external requests.', 'Семантическая разметка, один переносимый файл, ноль внешних запросов.')],
    s4: [L('Rendering at 360/768/1440 before publishing the preview URL.', 'Рендер на 360/768/1440 перед публикацией preview-URL.')],
    d1: [L('Growth curve is the strongest slide; it goes third, right after the problem.', 'Кривая роста — сильнейший слайд; ставлю третьей, сразу после проблемы.')],
    d2: [L('One grid, one kicker style, slide numbers bottom-right.', 'Одна сетка, один стиль киккера, номера слайдов справа внизу.')],
    d3: [L('One argument per slide, max 22 words of body copy.', 'По одному аргументу на слайд, не больше 22 слов основного текста.')],
    d4: [L('Charts stay vector so they remain editable after export.', 'Графики остаются векторными, чтобы их можно было править после экспорта.')],
    r1: [L('Seeding from public lists, expanding until no new source appears.', 'Посев из публичных списков, расширение до исчерпания новых источников.')],
    r2: [L('One sub-agent per slice with an identical brief and shared schema.', 'По суб-агенту на срез с единым брифом и общей схемой.')],
    r3: [L('Marketing pages overstate; re-checking every claim against a primary source.', 'Маркетинговые страницы преувеличивают; перепроверяю каждое утверждение по первоисточнику.')],
    r4: [L('Conflicts flagged, duplicates collapsed, gaps listed explicitly.', 'Противоречия помечены, дубли схлопнуты, пробелы перечислены явно.')],
    g1: [L('Single input with a double-tap skill ceiling forces timing, not mashing.', 'Одно действие с двойным прыжком требует тайминга, а не спама.')],
    g2: [L('Shake scales with event weight and decays per frame.', 'Тряска зависит от значимости события и затухает покадрово.')],
    g3: [L('Persistence guarded by try/catch: sandboxed embeds often block storage.', 'Сохранение обёрнуто в try/catch: изолированные фреймы часто блокируют хранилище.')],
    g4: [L('Median survival under 60s is too punishing; softening the ramp.', 'Медиана выживания меньше 60s слишком жестока; смягчаю кривую.')],
    a1: [L('Ambiguity is high: publish the interpretation before spending time on the artifact.', 'Неопределённость высокая: сначала публикую интерпретацию, прежде чем тратить время на артефакт.')],
    a2: [L('Three references kept out of fourteen visited.', 'Три референса оставлены из четырнадцати посещённых.')],
    a3: [L('No placeholders left in the final version; assumptions stated explicitly.', 'В финальной версии не осталось заглушек; допущения сформулированы явно.')],
    a4: [L('Structure, accuracy and consistency checked; handing over.', 'Структура, точность и согласованность проверены; передаю.')],
  }

  const tools = {
    s1: [{ name: 'editor', detail: L('Drafting information architecture', 'Черновик информационной архитектуры') }],
    s2: [{ name: 'design', detail: L('Producing palette directions', 'Генерация вариантов палитры') }],
    s3: [
      { name: 'editor', detail: L('Writing index.html', 'Запись index.html') },
      { name: 'shell', detail: L('Validating markup', 'Валидация разметки') },
    ],
    s4: [
      { name: 'browser', detail: L('Rendering breakpoints', 'Рендер брейкпоинтов') },
      { name: 'deploy', detail: L('Publishing preview build', 'Публикация preview-сборки') },
    ],
    d1: [{ name: 'shell', detail: L('Loading source data', 'Загрузка исходных данных') }],
    d2: [{ name: 'design', detail: L('Generating master layouts', 'Генерация мастер-макетов') }],
    d3: [{ name: 'editor', detail: L('Writing slide copy', 'Запись текстов слайдов') }],
    d4: [{ name: 'render', detail: L('Rendering 3 formats', 'Рендер трёх форматов') }],
    r1: [{ name: 'search', detail: L('Seeding the source list', 'Посев списка источников') }],
    r2: [{ name: 'fleet', detail: L('Sub-agents on slices', 'Суб-агенты на срезах') }],
    r3: [{ name: 'browser', detail: L('Re-visiting primary sources', 'Повторный обход первоисточников') }],
    r4: [{ name: 'editor', detail: L('Writing the merged report', 'Запись сведённого отчёта') }],
    g1: [{ name: 'editor', detail: L('Writing the loop skeleton', 'Запись каркаса цикла') }],
    g2: [{ name: 'design', detail: L('Picking the palette', 'Выбор палитры') }],
    g3: [{ name: 'editor', detail: L('Wiring HUD and persistence', 'Подключение HUD и сохранения') }],
    g4: [{ name: 'browser', detail: L('Running headless playtests', 'Headless-плейтесты') }],
    a1: [{ name: 'editor', detail: L('Writing the interpretation brief', 'Запись брифа с интерпретацией') }],
    a2: [{ name: 'search', detail: L('Searching comparable deliverables', 'Поиск сопоставимых артефактов') }],
    a3: [{ name: 'editor', detail: L('Writing the artifact', 'Запись артефакта') }],
    a4: [{ name: 'render', detail: L('Rendering the preview', 'Рендер превью') }],
  }

  const logs = [
    ['plan: ' + steps.length + ' steps · locale ' + locale, 'prompt: ' + snippet],
    ['tokens: contrast AA ✓ · type scale 66/42/24/16/13', 'sources visited: 14 · kept: 3'],
    ['wrote artifact · 0 external requests', 'html-validate: 0 errors, 0 warnings'],
    ['preview published → https://preview.rs-builder.app/run-' + Math.random().toString(36).slice(2, 7)],
  ]

  const artifactHtml = artifactFor(kind, snippet, ru)

  const titles = {
    site: L('Generated landing page', 'Сгенерированный лендинг'),
    deck: L('Generated deck', 'Сгенерированный дек'),
    research: L('Research report', 'Отчёт об исследовании'),
    game: L('Playable build', 'Играбельная сборка'),
    generic: L('Task brief & first artifact', 'Бриф задачи и первый артефакт'),
  }

  const downloads = []
  if (kind === 'deck') {
    const deckSlides = [
      { title: 'Ferrite Systems: telemetry that explains itself', bullets: ['Seed round · 2026'] },
      { title: 'Alerts tell you something broke. Never why.', bullets: ['74% of on-call time is triage', '11 tools correlated by hand', '38m median time to root cause'] },
      { title: 'ARR grew 4.6x in nine months', bullets: ['0.4M → 3.4M € ARR', 'NRR 131%', '6 of 9 accounts expanded'] },
      { title: 'One narrative per incident', bullets: ['Ingests metrics, logs, traces, deploys', 'Causal timeline + likely trigger', 'Blameless postmortem draft'] },
      { title: 'A 41B€ market with a narrative gap', bullets: ['13% CAGR through 2030', '2.1M SRE/platform roles in EU+US'] },
      { title: 'Built by people who carried the pager', bullets: ['CEO: platform infra, 8y', 'CTO: distributed tracing', 'Design: incident UX'] },
      { title: 'Raising 4.5M€ to 2M€ ARR in 18 months', bullets: ['45% engineering', '35% go-to-market', '20% operations & compliance'] },
    ]
    downloads.push({
      name: 'ferrite-seed.pptx',
      mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      base64: Buffer.from(buildPptx('Ferrite Systems — seed deck', deckSlides)).toString('base64'),
    })
  }
  if (kind === 'game' || kind === 'site') {
    downloads.push({
      name: 'captions.srt',
      mime: 'text/plain',
      base64: Buffer.from(buildSrt([
        { from: 0, to: 2.5, text: ru ? 'Демо-субтитры: настоящий SubRip-файл.' : 'Demo captions: a real SubRip file.' },
        { from: 2.5, to: 6, text: ru ? 'Сгенерирован движком запуска.' : 'Generated by the run engine.' },
      ]), 'utf8').toString('base64'),
    })
  }

  return {
    kind,
    steps,
    thoughts,
    tools,
    logs,
    intro: L(
      'Connected to the live RS-BUILDER backend. Here is how I will execute this: a visible plan, streamed reasoning, and a finished artifact at the end.',
      'Подключён живой бэкенд RS-BUILDER. Выполню так: видимый план, рассуждения в потоке и готовый артефакт в конце.',
    ),
    outro: L(
      'Done — artifact attached, sources and files listed. Tell me what to adjust and I will continue from this run instead of starting over.',
      'Готово — артефакт приложен, файлы и источники перечислены. Скажите, что поправить: продолжу с этого запуска, а не заново.',
    ),
    artifact: {
      title: titles[kind],
      fileName: kind === 'game' ? 'game.html' : kind === 'deck' ? 'deck.html' : kind === 'research' ? 'report.html' : 'index.html',
      kind: kind === 'game' ? 'game' : kind === 'deck' ? 'slides' : kind === 'research' ? 'report' : 'html',
      html: artifactHtml,
      note: L('Streamed from the live backend', 'Получено с живого бэкенда'),
      downloads,
    },
    delivered: [
      L('artifact (attached above)', 'артефакт (приложен выше)'),
      L('source list with citations', 'список источников с цитатами'),
      L('run log and credit report', 'лог запуска и отчёт по кредитам'),
    ],
  }
}

/* ------------------------------------------------------------------ */
/* Artifacts (compact, self-contained)                                 */
/* ------------------------------------------------------------------ */

function artifactFor(kind, snippet, ru) {
  const esc = String(snippet).replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const head = (title, bg, fg, accent) =>
    '<!doctype html><html lang="' + (ru ? 'ru' : 'en') + '"><head><meta charset="utf-8"/>' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"/><title>' + title + '</title><style>' +
    '*{box-sizing:border-box}body{margin:0;background:' + bg + ';color:' + fg +
    ';font:16px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif}' +
    '.page{max-width:860px;margin:0 auto;padding:52px 24px 80px}.k{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:' +
    accent + ';font-weight:700}h1{font-size:clamp(28px,4.6vw,44px);line-height:1.08;letter-spacing:-.03em;margin:10px 0}' +
    'p{color:' + fg + 'cc}.q{border:1px solid ' + accent + '55;border-left:3px solid ' + accent +
    ';border-radius:12px;padding:14px 16px;background:' + fg + '0a;font-size:14px}' +
    'table{width:100%;border-collapse:collapse;font-size:14px;margin-top:18px}th,td{text-align:left;padding:10px 12px;border-bottom:1px solid ' +
    fg + '22}th{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:' + fg + '88}' +
    '.foot{margin-top:36px;border-top:1px solid ' + fg + '22;padding-top:14px;font-size:12px;color:' + fg + '88}</style></head><body><div class="page">'

  if (kind === 'site') {
    return (
      head(ru ? 'Лендинг · черновик' : 'Landing page · draft', '#0b0b11', '#f4f4f1', '#c8f751') +
      '<span class="k">' + (ru ? 'Артефакт с живого бэкенда' : 'Live backend artifact') + '</span>' +
      '<h1>' + (ru ? 'Продукт, который объясняет себя за десять секунд' : 'A product that explains itself in ten seconds') + '</h1>' +
      '<p>' + (ru ? 'Первый экран, выбор тарифа и доказательства — в таком порядке. Остальное докрутим итерациями.' : 'Hero, plan picker and proof, in that order. The rest we iterate on.') + '</p>' +
      '<div class="q">' + esc + '</div>' +
      '<table><tr><th>' + (ru ? 'Секция' : 'Section') + '</th><th>' + (ru ? 'Статус' : 'Status') + '</th></tr>' +
      '<tr><td>' + (ru ? 'Герой + CTA' : 'Hero + CTA') + '</td><td>✓</td></tr>' +
      '<tr><td>' + (ru ? 'Тарифы (3)' : 'Plans (3)') + '</td><td>✓</td></tr>' +
      '<tr><td>' + (ru ? 'Доказательства' : 'Proof') + '</td><td>✓</td></tr>' +
      '<tr><td>' + (ru ? 'FAQ' : 'FAQ') + '</td><td>✓</td></tr></table>' +
      '<div class="foot">RS-BUILDER · ' + (ru ? 'сгенерировано бэкендом' : 'generated by the backend') + '</div></div></body></html>'
    )
  }
  if (kind === 'deck') {
    return (
      head(ru ? 'Дек · черновик' : 'Deck · draft', '#0b0b11', '#f4f4f1', '#c8f751') +
      '<span class="k">01 / 07</span><h1>' + (ru ? 'Проблема, продукт, тракция' : 'Problem, product, traction') + '</h1>' +
      '<p>' + (ru ? 'Семь слайдов, по одному аргументу на слайд, графики из ваших чисел.' : 'Seven slides, one argument each, charts from your numbers.') + '</p>' +
      '<div class="q">' + esc + '</div>' +
      '<div class="foot">RS-BUILDER · ' + (ru ? 'заметки спикера приложены' : 'speaker notes attached') + '</div></div></body></html>'
    )
  }
  if (kind === 'research') {
    return (
      head(ru ? 'Отчёт · черновик' : 'Report · draft', '#fbfaf7', '#14141a', '#0f8f87') +
      '<span class="k">' + (ru ? 'Wide Research · источники сверены' : 'Wide Research · sources verified') + '</span>' +
      '<h1>' + (ru ? 'Карта рынка и четыре пробела' : 'Market map and four gaps') + '</h1>' +
      '<div class="q">' + esc + '</div>' +
      '<table><tr><th>' + (ru ? 'Сегмент' : 'Segment') + '</th><th>' + (ru ? 'Игроков' : 'Players') + '</th><th>' + (ru ? 'Медианная цена' : 'Median price') + '</th></tr>' +
      '<tr><td>Copilot</td><td>17</td><td>19 €</td></tr><tr><td>Agent</td><td>9</td><td>79 €</td></tr>' +
      '<tr><td>Compliance</td><td>4</td><td>145 €</td></tr></table>' +
      '<div class="foot">RS-BUILDER · ' + (ru ? 'каждое утверждение с цитатой' : 'every claim cited') + '</div></div></body></html>'
    )
  }
  if (kind === 'game') {
    return (
      head('NEON HOP (backend)', '#08080c', '#f4f4f1', '#c8f751') +
      '<span class="k">' + (ru ? 'Сборка с живого бэкенда' : 'Live backend build') + '</span>' +
      '<h1>NEON HOP</h1><p>' + (ru ? 'Тап или пробел — прыжок, двойной в воздухе.' : 'Tap or space to hop, double in the air.') + '</p>' +
      '<canvas id="c" width="720" height="360" style="width:100%;border:1px solid #ffffff22;border-radius:14px;background:#0d0d14"></canvas>' +
      '<script>var c=document.getElementById("c"),x=c.getContext("2d"),t=0,py=300,vy=0,hops=0,obs=[],score=0;' +
      'function hop(){if(hops<2){vy=-12;hops++}}' +
      'addEventListener("keydown",function(e){if(e.code==="Space"){e.preventDefault();hop()}});' +
      'c.addEventListener("pointerdown",hop);' +
      'function loop(){t++;vy+=0.62;py+=vy;if(py>=300){py=300;vy=0;hops=0}' +
      'if(t%70===0)obs.push({x:740,h:24+Math.random()*40});' +
      'x.clearRect(0,0,720,360);x.strokeStyle="#c8f75155";x.beginPath();x.moveTo(0,316);x.lineTo(720,316);x.stroke();' +
      'for(var i=obs.length-1;i>=0;i--){var o=obs[i];o.x-=5.4;if(o.x<-30){obs.splice(i,1);score++;continue}' +
      'x.fillStyle="#ff6369";x.fillRect(o.x,316-o.h,20,o.h);' +
      'if(120+14>o.x&&120-14<o.x+20&&py>316-o.h-2){obs.length=0;score=0}}' +
      'x.fillStyle="#f4f4f1";x.fillRect(106,py-28,28,28);' +
      'x.fillStyle="#c8f751";x.font="600 14px ui-monospace,monospace";x.fillText("score "+score,16,26);' +
      'requestAnimationFrame(loop)}loop();' + '</' + 'script>' +
      '<div class="foot">RS-BUILDER · ' + (ru ? 'играбельно' : 'playable') + '</div></div></body></html>'
    )
  }
  return (
    head(ru ? 'Бриф задачи' : 'Task brief', '#0b0b11', '#f4f4f1', '#c8f751') +
    '<span class="k">' + (ru ? 'Интерпретация запроса' : 'Interpretation') + '</span>' +
    '<h1>' + (ru ? 'Как я понял задачу' : 'How I read the request') + '</h1>' +
    '<div class="q">' + esc + '</div>' +
    '<p>' + (ru ? 'Открытые вопросы: аудитория, бренд-материалы, критерий готовности, жёсткие ограничения.' : 'Open questions: audience, brand material, definition of done, hard constraints.') + '</p>' +
    '<div class="foot">RS-BUILDER · ' + (ru ? 'ответьте в композере — продолжу с этого запуска' : 'answer in the composer — I continue from this run') + '</div></div></body></html>'
  )
}


/* ------------------------------------------------------------------ */
/* Transport-agnostic run stream                                       */
/* ------------------------------------------------------------------ */

const sleep = (ms, signal) =>
  new Promise((resolve) => {
    if (signal?.aborted) return resolve()
    const onAbort = () => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })

/**
 * Yields the full event sequence for a run. Used by:
 *  - server/agent-server.mjs (standalone Node server, SSE over HTTP)
 *  - api/runs.mjs (Vercel serverless function, same-origin /api/v1/runs)
 * Any other transport can wrap it the same way.
 */
export async function* runEvents(prompt, locale, signal) {
  const run = buildRun(String(prompt ?? '').trim() || 'unspecified task', locale === 'ru' ? 'ru' : 'en')
  const runId = 'run_' + Math.random().toString(36).slice(2, 10)

  yield { type: 'run_start', runId }
  yield { type: 'message', role: 'user', text: L(prompt, prompt) }
  await sleep(450, signal)
  if (signal?.aborted) return
  yield { type: 'message', role: 'agent', text: run.intro }
  await sleep(600, signal)
  yield { type: 'plan', steps: run.steps.map((s) => ({ id: s.id, title: s.title, estimate: s.estimate })) }
  await sleep(500, signal)

  let credits = 0
  for (let i = 0; i < run.steps.length; i++) {
    const step = run.steps[i]
    if (signal?.aborted) return
    yield { type: 'step_start', stepId: step.id }
    await sleep(380, signal)

    for (const thought of run.thoughts[step.id] ?? []) {
      yield { type: 'thought', stepId: step.id, text: thought }
      await sleep(650, signal)
    }
    for (const tool of run.tools[step.id] ?? []) {
      yield { type: 'tool', stepId: step.id, tool }
      await sleep(520, signal)
    }
    for (const line of run.logs[i] ?? []) {
      yield { type: 'console', stepId: step.id, line }
      await sleep(220, signal)
    }
    if (i === 1) {
      yield {
        type: 'file',
        stepId: step.id,
        file: {
          path: 'output/notes.md',
          kind: 'md',
          bytes: '1.2 KB',
          content: '# Run notes\n\n- prompt: ' + String(prompt).slice(0, 120) + '\n- locale: ' + locale + '\n- backend: rs-builder core v' + VERSION + '\n',
        },
      }
      await sleep(320, signal)
    }
    if (i === 2) {
      yield {
        type: 'browse',
        stepId: step.id,
        page: {
          url: 'https://example-reference.dev/pricing',
          title: 'Reference — pricing',
          note: L('Pattern confirmed: decision elements above the fold', 'Паттерн подтверждён: элементы решения на первом экране'),
        },
      }
      await sleep(420, signal)
    }

    credits += step.credits
    yield { type: 'progress', credits, stepIndex: i, total: run.steps.length }
    yield { type: 'step_done', stepId: step.id }
    await sleep(360, signal)
  }

  yield { type: 'artifact', artifact: run.artifact }
  await sleep(500, signal)
  yield { type: 'delivered', items: run.delivered }
  await sleep(260, signal)
  yield { type: 'message', role: 'agent', text: run.outro }
  yield { type: 'done' }
}

export { VERSION, buildRun, detectKind }
