import type { IconName, L } from './types'

export type FeaturePage = {
  slug: string
  icon: IconName
  badge?: 'new' | 'beta'
  title: L
  tagline: L
  lead: L
  body: L[]
  mock: 'site' | 'slides' | 'report' | 'game' | 'video' | 'browser' | 'schedule' | 'design' | 'fleet'
  highlights: { icon: IconName; title: L; text: L }[]
  useCases: L[]
  related: string[]
  minPlan: 'starter' | 'pro' | 'max' | 'team'
  metric: { value: string; label: L }
}

export const featurePages: FeaturePage[] = [
  {
    slug: 'webapp',
    icon: 'globe',
    title: { en: 'Websites & web apps', ru: 'Сайты и веб-приложения' },
    tagline: {
      en: 'Describe the product. Get a deployed, responsive site with real code behind it.',
      ru: 'Опишите продукт — получите задеплоенный адаптивный сайт с настоящим кодом внутри.',
    },
    lead: {
      en: 'RS-BUILDER scaffolds the project, writes components, wires routing and forms, generates the copy and imagery, runs a build, fixes the errors it finds, and publishes the result to a shareable URL.',
      ru: 'RS-BUILDER создаёт проект, пишет компоненты, связывает роутинг и формы, генерирует тексты и графику, запускает сборку, исправляет найденные ошибки и публикует результат по ссылке.',
    },
    body: [
      {
        en: 'The output is a real codebase, not a locked canvas. You get the file tree, the dependencies, the build config and a diff of every iteration, so a developer can pick it up on day one.',
        ru: 'На выходе — настоящий код, а не закрытый холст. Вы получаете дерево файлов, зависимости, конфиг сборки и диф каждой итерации, поэтому разработчик может подхватить проект в первый же день.',
      },
      {
        en: 'Ask for changes in plain language — "make the pricing table three columns, keep the typography" — and the agent edits the source rather than repainting a picture.',
        ru: 'Правки формулируются обычным языком — «сделай таблицу тарифов в три колонки, типографику оставь» — и агент редактирует исходники, а не перерисовывает картинку.',
      },
    ],
    mock: 'site',
    highlights: [
      { icon: 'bolt', title: { en: 'Build-aware', ru: 'Понимает сборку' }, text: { en: 'Runs the bundler, reads the errors, fixes them before you see them.', ru: 'Запускает бандлер, читает ошибки и чинит их до того, как вы их увидите.' } },
      { icon: 'palette', title: { en: 'Design tokens', ru: 'Дизайн-токены' }, text: { en: 'Palette, spacing and type scale stay consistent across every page.', ru: 'Палитра, отступы и шкала типографики едины на всех страницах.' } },
      { icon: 'globe', title: { en: 'One-click deploy', ru: 'Деплой в один клик' }, text: { en: 'Published to a preview URL, or export to your own hosting.', ru: 'Публикация на preview-URL или экспорт на ваш хостинг.' } },
      { icon: 'gitBranch', title: { en: 'Versioned iterations', ru: 'Версии итераций' }, text: { en: 'Every change is a restorable snapshot with a diff.', ru: 'Каждое изменение — восстанавливаемый снапшот с дифом.' } },
    ],
    useCases: [
      { en: 'Launch pages for a campaign that has to go live today', ru: 'Промо-страницы для кампании, которая должна выйти сегодня' },
      { en: 'Internal tools and dashboards nobody has time to build', ru: 'Внутренние инструменты и дашборды, на которые нет времени' },
      { en: 'Portfolios, docs sites and event microsites', ru: 'Портфолио, сайты документации и микросайты событий' },
      { en: 'Prototypes to test with users before writing production code', ru: 'Прототипы для проверки на пользователях до написания прод-кода' },
    ],
    related: ['design', 'automations', 'slides'],
    minPlan: 'starter',
    metric: { value: '4m 12s', label: { en: 'median time to a deployed landing page', ru: 'медиана времени до задеплоенного лендинга' } },
  },
  {
    slug: 'slides',
    icon: 'presentation',
    title: { en: 'AI slides', ru: 'Слайды' },
    tagline: {
      en: 'Narrative first, layout second — decks with charts, imagery and speaker notes.',
      ru: 'Сначала нарратив, потом вёрстка — презентации с графиками, иллюстрациями и заметками спикера.',
    },
    lead: {
      en: 'Give the agent raw material — a CSV, a memo, a recording transcript, a link — and it produces a structured deck: argument per slide, custom charts drawn from your data, consistent master layout, and notes for whoever presents it.',
      ru: 'Передайте агенту сырой материал — CSV, мемо, расшифровку записи или ссылку — и он соберёт структурированную презентацию: по одному аргументу на слайд, графики по вашим данным, единый мастер-макет и заметки для спикера.',
    },
    body: [
      {
        en: 'Charts are generated from the underlying numbers rather than pasted images, so they stay editable and accurate when the data changes.',
        ru: 'Графики строятся из исходных чисел, а не вставляются картинками, поэтому остаются редактируемыми и корректными при изменении данных.',
      },
      {
        en: 'Export to PPTX, PDF or a live web deck. Slide order and density are steerable: "cut to ten slides, keep the traction chart" works as a normal instruction.',
        ru: 'Экспорт в PPTX, PDF или живой веб-дек. Порядок и плотность слайдов управляемы: «сократи до десяти слайдов, график тракции оставь» работает как обычная инструкция.',
      },
    ],
    mock: 'slides',
    highlights: [
      { icon: 'table', title: { en: 'Data-driven charts', ru: 'Графики из данных' }, text: { en: 'CSV, Sheets or a query becomes a real chart.', ru: 'CSV, Sheets или запрос превращаются в настоящий график.' } },
      { icon: 'presentation', title: { en: 'Master layouts', ru: 'Мастер-макеты' }, text: { en: 'Title, section, comparison, quote, appendix — all consistent.', ru: 'Титул, секция, сравнение, цитата, приложение — всё единообразно.' } },
      { icon: 'fileText', title: { en: 'Speaker notes', ru: 'Заметки спикера' }, text: { en: 'Written to be read aloud, timed per slide.', ru: 'Написаны так, чтобы их читали вслух, с таймингом на слайд.' } },
      { icon: 'gitBranch', title: { en: 'PPTX / PDF / web', ru: 'PPTX / PDF / web' }, text: { en: 'Take the format your audience actually opens.', ru: 'Формат, который ваша аудитория реально открывает.' } },
    ],
    useCases: [
      { en: 'Board and investor updates from raw metrics', ru: 'Отчёты для совета и инвесторов из сырых метрик' },
      { en: 'Sales decks tailored per prospect', ru: 'Продающие презентации под каждого клиента' },
      { en: 'Conference talks and internal training', ru: 'Доклады на конференции и внутреннее обучение' },
      { en: 'Weekly team recaps pulled from Linear and Slack', ru: 'Еженедельные сводки команды из Linear и Slack' },
    ],
    related: ['deep-research', 'design', 'webapp'],
    minPlan: 'starter',
    metric: { value: '14', label: { en: 'slides produced per run on average', ru: 'слайдов в среднем за один запуск' } },
  },
  {
    slug: 'deep-research',
    icon: 'microscope',
    title: { en: 'Deep research', ru: 'Глубокое исследование' },
    tagline: {
      en: 'Dozens of sources read, cross-checked and cited — delivered as a structured report.',
      ru: 'Десятки источников прочитаны, сверены и процитированы — на выходе структурированный отчёт.',
    },
    lead: {
      en: 'The agent plans a research strategy, browses, reads long documents, extracts numbers into tables, checks conflicting claims against each other and writes it all up with an inline citation on every assertion.',
      ru: 'Агент планирует стратегию исследования, работает в браузере, читает длинные документы, выносит цифры в таблицы, сверяет противоречащие утверждения и оформляет всё с цитатой на каждое заявление.',
    },
    body: [
      {
        en: 'Intermediate findings are visible while the run is going, so you can redirect it — "skip the pricing section, go deeper on regulation" — without throwing the work away.',
        ru: 'Промежуточные находки видны прямо во время запуска, поэтому можно менять направление — «пропусти раздел с ценами, копай глубже в регулирование» — не теряя сделанное.',
      },
      {
        en: 'Outputs come as a report, a spreadsheet of extracted data and a source list, each individually downloadable.',
        ru: 'Результат — отчёт, таблица с извлечёнными данными и список источников; каждый файл скачивается отдельно.',
      },
    ],
    mock: 'report',
    highlights: [
      { icon: 'compass', title: { en: 'Real browsing', ru: 'Настоящий браузер' }, text: { en: 'Reads paywalled and JS-heavy pages inside a logged-in session.', ru: 'Читает страницы под пейволом и с JS внутри сессии с логином.' } },
      { icon: 'shield', title: { en: 'Every claim cited', ru: 'Каждое утверждение с цитатой' }, text: { en: 'Inline references you can audit in one click.', ru: 'Встроенные ссылки, которые проверяются в один клик.' } },
      { icon: 'table', title: { en: 'Structured extraction', ru: 'Структурированное извлечение' }, text: { en: 'Numbers land in tables, not buried in prose.', ru: 'Цифры попадают в таблицы, а не тонут в тексте.' } },
      { icon: 'fileText', title: { en: 'Long-form output', ru: 'Длинный формат' }, text: { en: '20–60 page reports with an executive summary up top.', ru: 'Отчёты на 20–60 страниц с саммари в начале.' } },
    ],
    useCases: [
      { en: 'Market and competitor scans before a launch', ru: 'Сканирование рынка и конкурентов перед запуском' },
      { en: 'Due diligence on vendors, tools and suppliers', ru: 'Проверка вендоров, инструментов и поставщиков' },
      { en: 'Regulatory landscape mapping', ru: 'Карта регуляторного ландшафта' },
      { en: 'Literature and patent reviews', ru: 'Обзоры литературы и патентов' },
    ],
    related: ['wide-research', 'slides', 'automations'],
    minPlan: 'starter',
    metric: { value: '60+', label: { en: 'sources read per deep research run', ru: 'источников читается за одно исследование' } },
  },
  {
    slug: 'wide-research',
    icon: 'network',
    badge: 'new',
    title: { en: 'Wide Research', ru: 'Wide Research' },
    tagline: {
      en: 'Send a fleet of sub-agents at a question too big for one thread.',
      ru: 'Отправьте флот суб-агентов на вопрос, который не влезает в одну ветку.',
    },
    lead: {
      en: 'The coordinator splits the problem — 40 competitors, 30 regions, 25 papers — assigns one sub-agent per slice, runs them in parallel and then merges the results into a single deduplicated, sourced deliverable.',
      ru: 'Координатор делит задачу — 40 конкурентов, 30 регионов, 25 статей — назначает по суб-агенту на срез, запускает их параллельно и сводит результаты в один дедуплицированный документ с источниками.',
    },
    body: [
      {
        en: 'You see the fleet: each sub-agent has its own row in the run view with live status, sources visited and partial findings.',
        ru: 'Флот видно целиком: у каждого суб-агента своя строка в окне запуска со статусом, посещёнными источниками и частичными находками.',
      },
      {
        en: 'Merging is not concatenation. Contradictions are flagged, duplicates collapsed and gaps listed explicitly at the end of the report.',
        ru: 'Сведение — это не склейка. Противоречия помечаются, дубли схлопываются, а пробелы явно перечисляются в конце отчёта.',
      },
    ],
    mock: 'fleet',
    highlights: [
      { icon: 'network', title: { en: 'Up to 40 sub-agents', ru: 'До 40 суб-агентов' }, text: { en: 'Scale the fleet to the size of the question.', ru: 'Масштаб флота под размер вопроса.' } },
      { icon: 'bolt', title: { en: 'Parallel, not sequential', ru: 'Параллельно, а не последовательно' }, text: { en: 'A 10-hour job finishes in about 20 minutes.', ru: 'Десятичасовая работа занимает около 20 минут.' } },
      { icon: 'shield', title: { en: 'Conflict detection', ru: 'Поиск противоречий' }, text: { en: 'Disagreements between sources are surfaced, not smoothed over.', ru: 'Расхождения между источниками показываются, а не сглаживаются.' } },
      { icon: 'table', title: { en: 'One merged matrix', ru: 'Единая матрица' }, text: { en: 'Every slice lands in the same comparison table.', ru: 'Каждый срез попадает в одну сравнительную таблицу.' } },
    ],
    useCases: [
      { en: 'Landscape mapping of a whole market segment', ru: 'Карта целого сегмента рынка' },
      { en: 'Multi-region compliance and pricing checks', ru: 'Проверка комплаенса и цен по нескольким регионам' },
      { en: 'Large literature or patent sweeps', ru: 'Массовые обзоры литературы и патентов' },
      { en: 'Auditing hundreds of pages or listings', ru: 'Аудит сотен страниц или объявлений' },
    ],
    related: ['deep-research', 'automations', 'browser-operator'],
    minPlan: 'pro',
    metric: { value: '40', label: { en: 'sub-agents running in parallel', ru: 'суб-агентов, работающих параллельно' } },
  },
  {
    slug: 'games',
    icon: 'gamepad',
    badge: 'new',
    title: { en: 'Game development', ru: 'Разработка игр' },
    tagline: {
      en: 'Playable HTML5 builds with art, sound, juice and a tuning pass.',
      ru: 'Играбельные HTML5-сборки с артом, звуком, «сочностью» и проходом по балансу.',
    },
    lead: {
      en: 'The agent writes the game loop, generates sprites and audio, wires input, adds the feel — screenshake, particles, easing — then plays the build itself to check that it is not broken or unfair.',
      ru: 'Агент пишет игровой цикл, генерирует спрайты и звук, подключает ввод, добавляет ощущения — тряску экрана, частицы, плавность — а затем сам проходит сборку, чтобы убедиться, что она не сломана и не нечестна.',
    },
    body: [
      {
        en: 'Everything runs in the browser: no engine install, no build farm. The result is a folder you can host anywhere, plus the source for further edits.',
        ru: 'Всё работает в браузере: без установки движка и билд-ферм. Результат — папка, которую можно захостить где угодно, плюс исходники для дальнейших правок.',
      },
      {
        en: 'Iterate by feel: "make the jump floatier", "double the spawn rate after 30 seconds", "add a combo multiplier".',
        ru: 'Итерируйте по ощущениям: «сделай прыжок более воздушным», «удвой частоту спавна после 30 секунд», «добавь множитель комбо».',
      },
    ],
    mock: 'game',
    highlights: [
      { icon: 'gamepad', title: { en: 'Instantly playable', ru: 'Сразу играбельно' }, text: { en: 'Runs in an iframe the moment the build finishes.', ru: 'Запускается во фрейме сразу после окончания сборки.' } },
      { icon: 'palette', title: { en: 'Generated art', ru: 'Сгенерированный арт' }, text: { en: 'Sprites, tilesets and UI in a single visual style.', ru: 'Спрайты, тайлсеты и UI в едином визуальном стиле.' } },
      { icon: 'bolt', title: { en: 'Game feel pass', ru: 'Проход по game feel' }, text: { en: 'Particles, shake, easing and audio feedback by default.', ru: 'Частицы, тряска, плавность и звуковой отклик по умолчанию.' } },
      { icon: 'gitBranch', title: { en: 'Balance tuning', ru: 'Настройка баланса' }, text: { en: 'Difficulty curves adjusted from actual playtests.', ru: 'Кривые сложности правятся по результатам реальных плейтестов.' } },
    ],
    useCases: [
      { en: 'Game jam entries and weekend experiments', ru: 'Участие в геймджемах и эксперименты на выходных' },
      { en: 'Playable demos for pitch decks', ru: 'Играбельные демо для питч-деков' },
      { en: 'Educational mini-games and quizzes', ru: 'Обучающие мини-игры и квизы' },
      { en: 'Marketing microgames for a campaign', ru: 'Маркетинговые микроигры для кампании' },
    ],
    related: ['video', 'design', 'webapp'],
    minPlan: 'pro',
    metric: { value: '9m 33s', label: { en: 'from prompt to a playable build', ru: 'от промпта до играбельной сборки' } },
  },
  {
    slug: 'video',
    icon: 'clapperboard',
    badge: 'beta',
    title: { en: 'Video & editor', ru: 'Видео и редактор' },
    tagline: {
      en: 'Generate shots, cut a timeline, caption it, export it.',
      ru: 'Генерация кадров, монтаж таймлайна, субтитры и экспорт.',
    },
    lead: {
      en: 'Upload raw footage or generate clips from text. The agent builds a timeline, trims silence, adds kinetic captions, lays in music, grades the colour and exports in the aspect ratio you need.',
      ru: 'Загрузите исходники или сгенерируйте клипы из текста. Агент собирает таймлайн, режет тишину, добавляет кинетические субтитры, кладёт музыку, красит цвет и экспортирует в нужном соотношении сторон.',
    },
    body: [
      {
        en: 'The timeline stays editable: request "cut it to 30 seconds, open on the product shot" and the agent re-cuts rather than re-rendering from scratch.',
        ru: 'Таймлайн остаётся редактируемым: попросите «сократи до 30 секунд, начни с кадра продукта» — агент перемонтирует, а не рендерит заново.',
      },
      {
        en: 'Captions are transcribed and timed, then styled to match the brand; SRT and burned-in variants are both exported.',
        ru: 'Субтитры расшифровываются и размечаются по времени, затем стилизуются под бренд; экспортируются и SRT, и вжжённый вариант.',
      },
    ],
    mock: 'video',
    highlights: [
      { icon: 'clapperboard', title: { en: 'Text to shot', ru: 'Текст в кадр' }, text: { en: 'Generate b-roll when you did not shoot it.', ru: 'Генерация b-roll, если вы его не сняли.' } },
      { icon: 'bolt', title: { en: 'Auto-cut', ru: 'Авто-монтаж' }, text: { en: 'Silence removal and beat-matched transitions.', ru: 'Удаление тишины и переходы в такт музыке.' } },
      { icon: 'fileText', title: { en: 'Captions & SRT', ru: 'Субтитры и SRT' }, text: { en: 'Transcribed, timed, brand-styled.', ru: 'Расшифровка, тайминг, стиль бренда.' } },
      { icon: 'globe', title: { en: 'Any aspect ratio', ru: 'Любое соотношение сторон' }, text: { en: '16:9, 9:16 and 1:1 from the same timeline.', ru: '16:9, 9:16 и 1:1 из одного таймлайна.' } },
    ],
    useCases: [
      { en: 'Launch teasers and social cutdowns', ru: 'Тизеры запуска и нарезки для соцсетей' },
      { en: 'Turning webinars into short clips', ru: 'Нарезка вебинаров на короткие клипы' },
      { en: 'Product demos with voiceover', ru: 'Продуктовые демо с озвучкой' },
      { en: 'Recaps of events and conferences', ru: 'Обзоры событий и конференций' },
    ],
    related: ['design', 'slides', 'games'],
    minPlan: 'pro',
    metric: { value: '30s', label: { en: 'teaser cut and captioned in one run', ru: 'тизер, смонтированный и с субтитрами за один запуск' } },
  },
  {
    slug: 'design',
    icon: 'palette',
    title: { en: 'Design & images', ru: 'Дизайн и изображения' },
    tagline: {
      en: 'Brand-consistent visuals, UI mockups and precise image edits from plain instructions.',
      ru: 'Визуалы в стиле бренда, UI-макеты и точечные правки изображений по обычным инструкциям.',
    },
    lead: {
      en: 'Upload a brand kit or let the agent infer one. It then produces imagery, icons, UI screens and marketing assets that all share the same palette, grid and type treatment.',
      ru: 'Загрузите бренд-кит или позвольте агенту вывести его самому. Дальше он делает изображения, иконки, экраны UI и маркетинговые материалы в единой палитре, сетке и типографике.',
    },
    body: [
      {
        en: 'Edits are surgical: "remove the person on the left, keep the lighting" runs as a targeted operation with the original preserved.',
        ru: 'Правки точечные: «убери человека слева, свет оставь» выполняется как целевая операция с сохранением оригинала.',
      },
      {
        en: 'Every asset exports in the sizes you need — OG images, app icons, social crops, print bleed — with a naming convention you set.',
        ru: 'Каждый ассет экспортируется в нужных размерах — OG-картинки, иконки приложения, кропы для соцсетей, печать с вылетами — по заданной схеме имён.',
      },
    ],
    mock: 'design',
    highlights: [
      { icon: 'palette', title: { en: 'Brand memory', ru: 'Память о бренде' }, text: { en: 'Palette and type persist across every run.', ru: 'Палитра и типографика сохраняются между запусками.' } },
      { icon: 'sparkles', title: { en: 'Batch variants', ru: 'Пакет вариантов' }, text: { en: 'Ten directions in one pass, pick and refine.', ru: 'Десять направлений за один проход — выбирайте и дорабатывайте.' } },
      { icon: 'fileText', title: { en: 'Export specs', ru: 'Спецификации экспорта' }, text: { en: 'SVG, PNG, WebP and PDF with correct sizing.', ru: 'SVG, PNG, WebP и PDF с корректными размерами.' } },
      { icon: 'gitBranch', title: { en: 'Layered sources', ru: 'Слоистые исходники' }, text: { en: 'Editable structure, not flattened bitmaps only.', ru: 'Редактируемая структура, а не только плоские битмапы.' } },
    ],
    useCases: [
      { en: 'Campaign creative in many formats at once', ru: 'Креативы кампании сразу во многих форматах' },
      { en: 'Icon sets and illustration systems', ru: 'Наборы иконок и системы иллюстраций' },
      { en: 'UI screens for a prototype', ru: 'Экраны UI для прототипа' },
      { en: 'Cleaning and retouching product photos', ru: 'Чистка и ретушь продуктовых фото' },
    ],
    related: ['webapp', 'video', 'slides'],
    minPlan: 'starter',
    metric: { value: '10', label: { en: 'design directions generated per pass', ru: 'направлений дизайна за один проход' } },
  },
  {
    slug: 'browser-operator',
    icon: 'compass',
    badge: 'beta',
    title: { en: 'Browser operator', ru: 'Браузер-оператор' },
    tagline: {
      en: 'A real browser session the agent drives: clicks, forms, logins, scraping.',
      ru: 'Настоящая браузерная сессия, которой управляет агент: клики, формы, логины, скрейпинг.',
    },
    lead: {
      en: 'When the work lives behind a login or inside a web app with no API, the agent operates the browser like a person does — navigating, filling forms, waiting for content, handling popups, and taking screenshots as evidence.',
      ru: 'Когда работа живёт за логином или в веб-приложении без API, агент управляет браузером как человек: навигация, заполнение форм, ожидание контента, обработка попапов и скриншоты как подтверждение.',
    },
    body: [
      {
        en: 'You can watch every action replayed step by step, and credentials stay in your session — the agent never stores them in the transcript.',
        ru: 'Каждое действие можно просмотреть по шагам, а учётные данные остаются в вашей сессии — в транскрипт агент их не пишет.',
      },
      {
        en: 'Combine with automations to run the same browser flow on a schedule: check a dashboard, export a report, file the result.',
        ru: 'В связке с автоматизациями тот же браузерный сценарий можно запускать по расписанию: проверить дашборд, выгрузить отчёт, разложить результат.',
      },
    ],
    mock: 'browser',
    highlights: [
      { icon: 'compass', title: { en: 'Session reuse', ru: 'Переиспользование сессии' }, text: { en: 'Log in once, reuse the session across runs.', ru: 'Залогиньтесь один раз и используйте сессию в разных запусках.' } },
      { icon: 'shield', title: { en: 'Secrets stay local', ru: 'Секреты остаются локально' }, text: { en: 'Credentials are masked in logs and artifacts.', ru: 'Учётные данные маскируются в логах и артефактах.' } },
      { icon: 'fileText', title: { en: 'Evidence trail', ru: 'Цепочка доказательств' }, text: { en: 'Screenshots and DOM snapshots per action.', ru: 'Скриншоты и снапшоты DOM на каждое действие.' } },
      { icon: 'bolt', title: { en: 'Retry logic', ru: 'Логика повторов' }, text: { en: 'Handles popups, captchas prompts and slow loads.', ru: 'Справляется с попапами, запросами капчи и медленной загрузкой.' } },
    ],
    useCases: [
      { en: 'Portals and legacy tools with no API', ru: 'Порталы и легаси-инструменты без API' },
      { en: 'Repetitive form filling and data entry', ru: 'Однообразное заполнение форм и ввод данных' },
      { en: 'Competitor price monitoring behind logins', ru: 'Мониторинг цен конкурентов за логином' },
      { en: 'Verifying that a deployed site actually works', ru: 'Проверка, что задеплоенный сайт действительно работает' },
    ],
    related: ['automations', 'deep-research', 'wide-research'],
    minPlan: 'starter',
    metric: { value: '100%', label: { en: 'of actions replayable from the log', ru: 'действий воспроизводятся из лога' } },
  },
  {
    slug: 'automations',
    icon: 'calendar',
    badge: 'beta',
    title: { en: 'Automations', ru: 'Автоматизации' },
    tagline: {
      en: 'Schedule any task and route the result where your team already reads.',
      ru: 'Запланируйте любую задачу и доставляйте результат туда, где команда уже читает.',
    },
    lead: {
      en: 'Turn any successful run into a recurring job: daily, weekly, monthly or on a webhook. The agent re-executes the whole flow with fresh data and delivers the output to email, Slack, Drive, Notion or your API endpoint.',
      ru: 'Превратите любой удачный запуск в повторяющуюся задачу: ежедневно, еженедельно, ежемесячно или по вебхуку. Агент заново выполняет весь поток на свежих данных и доставляет результат в почту, Slack, Drive, Notion или на ваш API-эндпоинт.',
    },
    body: [
      {
        en: 'Runs are diff-aware: if nothing meaningful changed, you get a one-line "no changes" instead of another full report.',
        ru: 'Запуски учитывают различия: если ничего значимого не изменилось, вы получите одну строку «без изменений» вместо ещё одного полного отчёта.',
      },
      {
        en: 'Every scheduled job has its own history, cost report and alerting threshold, so a runaway task cannot quietly burn credits.',
        ru: 'У каждой запланированной задачи своя история, отчёт по затратам и порог оповещений, поэтому вышедшая из-под контроля задача не сможет незаметно сжечь кредиты.',
      },
    ],
    mock: 'schedule',
    highlights: [
      { icon: 'calendar', title: { en: 'Cron or natural language', ru: 'Cron или обычный язык' }, text: { en: '"Every Monday 08:00 CET" is a valid schedule.', ru: '«Каждый понедельник 08:00 CET» — корректное расписание.' } },
      { icon: 'mail', title: { en: 'Delivery targets', ru: 'Каналы доставки' }, text: { en: 'Email, Slack, Drive, Notion, webhooks, S3.', ru: 'Почта, Slack, Drive, Notion, вебхуки, S3.' } },
      { icon: 'shield', title: { en: 'Budget guardrails', ru: 'Ограничение бюджета' }, text: { en: 'Per-run credit caps and alerts.', ru: 'Лимит кредитов на запуск и оповещения.' } },
      { icon: 'gitBranch', title: { en: 'Diff-aware delivery', ru: 'Доставка только изменений' }, text: { en: 'Silent when nothing changed.', ru: 'Молчит, если изменений нет.' } },
    ],
    useCases: [
      { en: 'Morning market and competitor briefs', ru: 'Утренние сводки по рынку и конкурентам' },
      { en: 'Weekly board metrics from several sources', ru: 'Еженедельные метрики для совета из нескольких источников' },
      { en: 'Invoice, receipt and expense processing', ru: 'Обработка счетов, чеков и расходов' },
      { en: 'Uptime and content checks on your properties', ru: 'Проверка доступности и контента на ваших ресурсах' },
    ],
    related: ['browser-operator', 'deep-research', 'slides'],
    minPlan: 'starter',
    metric: { value: '∞', label: { en: 'scheduled runs on Max and Team', ru: 'запусков по расписанию на Max и Team' } },
  },
]

export const featureBySlug = (slug?: string) => featurePages.find((f) => f.slug === slug)
