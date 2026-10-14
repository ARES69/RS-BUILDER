import type { IconName, L } from './types'

export type Capability = {
  slug: string
  icon: IconName
  title: L
  description: L
  badge?: 'new' | 'beta'
  span?: boolean
}

export const capabilities: Capability[] = [
  {
    slug: 'webapp',
    icon: 'globe',
    title: { en: 'Websites & web apps', ru: 'Сайты и веб-приложения' },
    description: {
      en: 'From a one-line brief to a responsive, deployed site with real components, forms and routing.',
      ru: 'От одной строчки брифа до адаптивного сайта в проде: настоящие компоненты, формы, роутинг.',
    },
    span: true,
  },
  {
    slug: 'slides',
    icon: 'presentation',
    title: { en: 'Slides that look designed', ru: 'Слайды, которые выглядят дизайнерскими' },
    description: {
      en: 'Narrative first, then layout — exported as a real .pptx plus a web deck.',
      ru: 'Сначала нарратив, потом вёрстка — экспорт в настоящий .pptx плюс веб-дек.',
    },
  },
  {
    slug: 'deep-research',
    icon: 'microscope',
    title: { en: 'Deep research', ru: 'Глубокое исследование' },
    description: {
      en: 'Dozens of sources read, cross-checked and cited — delivered as a structured report.',
      ru: 'Десятки источников прочитаны, сверены и процитированы — на выходе структурированный отчёт.',
    },
  },
  {
    slug: 'wide-research',
    icon: 'network',
    title: { en: 'Wide Research', ru: 'Wide Research' },
    description: {
      en: 'Parallel sub-agents run live search + fetch per slice, then merge into one sourced report.',
      ru: 'Параллельные суб-агенты гоняют живой поиск и fetch по срезам и сводят всё в один отчёт с источниками.',
    },
    badge: 'new',
  },
  {
    slug: 'games',
    icon: 'gamepad',
    title: { en: 'Playable games', ru: 'Играбельные игры' },
    description: {
      en: 'Canvas or WebGL builds you can play in the browser, with art, sound and level logic.',
      ru: 'Сборки на Canvas или WebGL, в которые можно играть в браузере: арт, звук, логика уровней.',
    },
    badge: 'new',
  },
  {
    slug: 'video',
    icon: 'clapperboard',
    badge: 'beta',
    title: { en: 'Video & editing', ru: 'Видео и монтаж' },
    description: {
      en: 'Real SRT captions and an HTML5 motion deck cut from your scenes. Frame generation is on the roadmap.',
      ru: 'Настоящие SRT-субтитры и HTML5-моушен-дек, смонтированные из ваших сцен. Генерация кадров — в роадмапе.',
    },
  },
  {
    slug: 'design',
    icon: 'palette',
    title: { en: 'Design & images', ru: 'Дизайн и изображения' },
    description: {
      en: 'Brand-consistent visuals, UI mockups and image edits from plain instructions.',
      ru: 'Визуалы в стиле бренда, UI-макеты и правки изображений по обычным инструкциям.',
    },
  },
  {
    slug: 'browser-operator',
    icon: 'compass',
    badge: 'beta',
    title: { en: 'Browser operator', ru: 'Браузер-оператор' },
    description: {
      en: 'A real cookie-jar HTTP session: GET/POST flows, forms and logins without JS. Full JS browser is on the roadmap.',
      ru: 'Настоящая HTTP-сессия с cookie-jar: GET/POST-сценарии, формы и логины без JS. Полноценный JS-браузер — в роадмапе.',
    },
  },
  {
    slug: 'automations',
    icon: 'calendar',
    span: true,
    badge: 'beta',
    title: { en: 'Automations', ru: 'Автоматизации' },
    description: {
      en: 'Real cron runs on the deployment with delivery to Slack/webhook. In-UI scheduler is on the roadmap.',
      ru: 'Настоящие cron-запуски на деплое с доставкой в Slack/вебхук. Планировщик в UI — в роадмапе.',
    },
  },
]

export type WorkflowStep = {
  index: string
  icon: IconName
  title: L
  description: L
  detail: L
}

export const workflowSteps: WorkflowStep[] = [
  {
    index: '01',
    icon: 'sparkles',
    title: { en: 'State the outcome', ru: 'Сформулируйте результат' },
    description: {
      en: 'One paragraph in plain language. Attach files, links or a brand kit if you have them.',
      ru: 'Один абзац обычным языком. Приложите файлы, ссылки или бренд-кит, если они есть.',
    },
    detail: { en: 'No templates, no prompt engineering.', ru: 'Без шаблонов и промпт-инжиниринга.' },
  },
  {
    index: '02',
    icon: 'fileText',
    title: { en: 'Review the plan', ru: 'Посмотрите план' },
    description: {
      en: 'The agent decomposes the goal into a visible todo list you can edit, reorder or extend mid-run.',
      ru: 'Агент раскладывает цель на видимый список задач — его можно править и дополнять прямо во время выполнения.',
    },
    detail: { en: 'Steer it while it works.', ru: 'Управляйте процессом на лету.' },
  },
  {
    index: '03',
    icon: 'bolt',
    title: { en: 'Watch it execute', ru: 'Следите за выполнением' },
    description: {
      en: 'A sandboxed workspace runs the browser, shell, editor and design tools — streamed live.',
      ru: 'В изолированном воркспейсе работают браузер, шелл, редактор и дизайн-инструменты — всё в прямом эфире.',
    },
    detail: { en: 'Every action is logged.', ru: 'Каждое действие логируется.' },
  },
  {
    index: '04',
    icon: 'shield',
    title: { en: 'Take the deliverable', ru: 'Заберите артефакт' },
    description: {
      en: 'Files, deploy link, sources and a diff of what changed — versioned per run.',
      ru: 'Файлы, ссылка на деплой, источники и диф изменений — с версиями по каждому запуску.',
    },
    detail: { en: 'Ship it or iterate again.', ru: 'Релизьте или итерируйте дальше.' },
  },
]

export type ShowcaseItem = {
  slug: string
  kind: 'site' | 'slides' | 'report' | 'game' | 'video'
  title: L
  prompt: L
  runtime: string
  credits: number
  artifacts: L[]
  accent: string
}

export const showcase: ShowcaseItem[] = [
  {
    slug: 'landing',
    kind: 'site',
    title: { en: 'Coffee subscription landing', ru: 'Лендинг кофейной подписки' },
    prompt: {
      en: 'Build a landing page for a single-origin coffee subscription: hero, plan picker, FAQ, checkout stub. Warm palette, editorial type.',
      ru: 'Собери лендинг для подписки на моносортный кофе: герой, выбор тарифа, FAQ, заглушка чекаута. Тёплая палитра, журнальная типографика.',
    },
    runtime: '4m 12s',
    credits: 320,
    artifacts: [
      { en: 'Deployed site + source', ru: 'Сайт в проде + исходники' },
      { en: 'Design tokens JSON', ru: 'JSON с дизайн-токенами' },
      { en: 'Lighthouse report 98/100', ru: 'Отчёт Lighthouse 98/100' },
    ],
    accent: '#c8f751',
  },
  {
    slug: 'deck',
    kind: 'slides',
    title: { en: 'Seed round deck, 14 slides', ru: 'Дек на seed-раунд, 14 слайдов' },
    prompt: {
      en: 'Turn our metrics CSV into a seed deck: problem, market, traction chart, team, ask. Keep it under 14 slides.',
      ru: 'Преврати наш CSV с метриками в seed-дек: проблема, рынок, график тракции, команда, запрос. Уложись в 14 слайдов.',
    },
    runtime: '6m 48s',
    credits: 540,
    artifacts: [
      { en: 'Real .pptx (OOXML) + web deck', ru: 'Настоящий .pptx (OOXML) + веб-дек' },
      { en: 'Speaker notes per slide', ru: 'Заметки спикера к каждому слайду' },
      { en: 'Traction chart source data', ru: 'Данные для графика тракции' },
    ],
    accent: '#8b7bff',
  },
  {
    slug: 'research',
    kind: 'report',
    title: { en: 'EU AI tooling market scan', ru: 'Сканирование рынка ИИ-инструментов ЕС' },
    prompt: {
      en: 'Wide Research: map 40 AI coding tools sold in the EU, pricing, compliance posture, and where the gaps are.',
      ru: 'Wide Research: составь карту из 40 ИИ-инструментов для кодинга в ЕС — цены, комплаенс, где пустые ниши.',
    },
    runtime: '21m 05s',
    credits: 1840,
    artifacts: [
      { en: 'Sourced report (live search + fetch)', ru: 'Отчёт с источниками (живой поиск + fetch)' },
      { en: 'Merged source matrix', ru: 'Сведённая матрица источников' },
      { en: 'Gap analysis memo', ru: 'Мемо о свободных нишах' },
    ],
    accent: '#35e0d6',
  },
  {
    slug: 'game',
    kind: 'game',
    title: { en: 'Browser arcade game', ru: 'Аркада в браузере' },
    prompt: {
      en: 'Make a one-button arcade game with juice: screen shake, particles, combo scoring, local leaderboard.',
      ru: 'Сделай аркаду на одну кнопку с «сочностью»: тряска экрана, частицы, комбо-очки, локальный лидерборд.',
    },
    runtime: '9m 33s',
    credits: 760,
    artifacts: [
      { en: 'Playable HTML5 build', ru: 'Играбельная HTML5-сборка' },
      { en: 'Sprite sheet + audio', ru: 'Спрайт-шит и звук' },
      { en: 'Tuning notes for balance', ru: 'Заметки по балансу' },
    ],
    accent: '#ffb454',
  },
  {
    slug: 'video',
    kind: 'video',
    title: { en: 'Product launch teaser', ru: 'Тизер запуска продукта' },
    prompt: {
      en: 'Cut a 30-second vertical teaser from our raw footage, add kinetic captions and an end card.',
      ru: 'Смонтируй 30-секундный вертикальный тизер из наших исходников, добавь кинетические субтитры и эндинг.',
    },
    runtime: '12m 20s',
    credits: 1120,
    artifacts: [
      { en: 'HTML5 motion deck (vertical)', ru: 'HTML5-моушен-дек (вертикальный)' },
      { en: 'Real .srt captions', ru: 'Настоящие субтитры .srt' },
      { en: 'Thumbnail variants', ru: 'Варианты обложек' },
    ],
    accent: '#ff7a90',
  },
]

export type Stat = { value: string; label: L; suffix?: string }

export const stats: Stat[] = [
  { value: '2.4M', label: { en: 'tasks delivered', ru: 'задач выполнено' } },
  { value: '38s', label: { en: 'median time to first plan', ru: 'медиана до первого плана' } },
  { value: '120+', label: { en: 'output formats', ru: 'форматов на выходе' } },
  { value: '4.8/5', label: { en: 'average run rating', ru: 'средняя оценка запуска' } },
]

export type Testimonial = { quote: L; name: string; role: L; company: string; initials: string }

export const testimonials: Testimonial[] = [
  {
    quote: {
      en: 'We replaced a three-tool chain — research, deck design, revisions — with one prompt. The deck landed with our board the same afternoon.',
      ru: 'Мы заменили цепочку из трёх инструментов — исследование, дизайн дека, правки — одним промптом. Дек ушёл совету в тот же день.',
    },
    name: 'Marta Kovac',
    role: { en: 'Head of Strategy', ru: 'Руководитель стратегии' },
    company: 'Northwind Labs',
    initials: 'MK',
  },
  {
    quote: {
      en: 'The plan view is the part I did not expect to love. I can see what the agent intends to do and correct it before it wastes twenty minutes.',
      ru: 'Просмотр плана — то, чего я не ожидал полюбить. Видно, что агент собирается делать, и можно поправить до того, как он потратит двадцать минут.',
    },
    name: 'Dmitri Sokolov',
    role: { en: 'Staff Engineer', ru: 'Ведущий инженер' },
    company: 'Ferrite Systems',
    initials: 'DS',
  },
  {
    quote: {
      en: 'Forty competitors mapped with pricing and citations in under half an hour. My analyst now reviews the work instead of doing it.',
      ru: 'Сорок конкурентов с ценами и ссылками — меньше чем за полчаса. Теперь мой аналитик проверяет работу, а не делает её.',
    },
    name: 'Aisha Bello',
    role: { en: 'VP Marketing', ru: 'Вице-президент по маркетингу' },
    company: 'Corvid',
    initials: 'AB',
  },
  {
    quote: {
      en: 'It shipped an internal dashboard on Friday that our vendor quoted six weeks for. It is not perfect, and it is already in production.',
      ru: 'В пятницу он выкатил внутреннюю дашборд-панель, за которую вендор просил шесть недель. Не идеально — и уже в проде.',
    },
    name: 'Tom Reiners',
    role: { en: 'COO', ru: 'Операционный директор' },
    company: 'Halcyon Freight',
    initials: 'TR',
  },
  {
    quote: {
      en: 'Scheduled runs are quietly the best feature. Monday morning the market brief is already in Slack, formatted the way our team reads.',
      ru: 'Запуски по расписанию — незаметно лучшая фича. В понедельник утром рыночный свод уже в Slack, в формате, который читает команда.',
    },
    name: 'Lena Fischer',
    role: { en: 'Founder', ru: 'Основатель' },
    company: 'Studio Otter',
    initials: 'LF',
  },
  {
    quote: {
      en: 'Our designers use it for first drafts and never show those drafts to anyone. That is exactly how it should work.',
      ru: 'Наши дизайнеры делают в нём черновики и никому их не показывают. Именно так и должно работать.',
    },
    name: 'Kenji Arata',
    role: { en: 'Design Director', ru: 'Арт-директор' },
    company: 'Paperplane',
    initials: 'KA',
  },
]

export const integrations = [
  'Slack',
  'Notion',
  'Google Drive',
  'GitHub',
  'Figma',
  'Linear',
  'Gmail',
  'Airtable',
  'Zapier',
  'Jira',
  'Discord',
  'Telegram',
  'S3',
  'Postgres',
]

export const securityBadges: { label: L; detail: L }[] = [
  { label: { en: 'SOC 2 Type II', ru: 'SOC 2 Type II' }, detail: { en: 'Controls audited annually', ru: 'Контроли проходят ежегодный аудит' } },
  { label: { en: 'GDPR ready', ru: 'GDPR-готовность' }, detail: { en: 'EU data residency option', ru: 'Опция хранения данных в ЕС' } },
  { label: { en: 'SSO / SAML', ru: 'SSO / SAML' }, detail: { en: 'Okta, Entra ID, Google', ru: 'Okta, Entra ID, Google' } },
  { label: { en: 'Zero training on your data', ru: 'Данные не идут в обучение' }, detail: { en: 'Contractual guarantee', ru: 'Закреплено в договоре' } },
]

export type HeroChip = { id: string; icon: IconName; label: L; prompt: L; badge?: 'new' }

export const heroChips: HeroChip[] = [
  {
    id: 'site',
    icon: 'globe',
    label: { en: 'Build a website', ru: 'Собрать сайт' },
    prompt: {
      en: 'Build a landing page for a single-origin coffee subscription: hero, three plans, how it works, FAQ, footer. Warm editorial palette, serif headings.',
      ru: 'Собери лендинг для подписки на моносортный кофе: герой, три тарифа, как это работает, FAQ, футер. Тёплая журнальная палитра, заголовки с засечками.',
    },
  },
  {
    id: 'deck',
    icon: 'presentation',
    label: { en: 'Create slides', ru: 'Сделать слайды' },
    prompt: {
      en: 'Turn our metrics CSV into a seed deck: problem, product, traction chart, market, team, the ask. Maximum seven slides, dark and technical.',
      ru: 'Преврати наш CSV с метриками в seed-дек: проблема, продукт, график тракции, рынок, команда, запрос. Максимум семь слайдов, тёмный и технический стиль.',
    },
  },
  {
    id: 'research',
    icon: 'microscope',
    label: { en: 'Deep research', ru: 'Исследование' },
    prompt: {
      en: 'Wide Research: map every AI coding tool sold into the EU — pricing, compliance posture, and where the gaps are.',
      ru: 'Wide Research: составь карту всех ИИ-инструментов для кодинга, которые продаются в ЕС, — цены, комплаенс и где пустые ниши.',
    },
  },
  {
    id: 'game',
    icon: 'gamepad',
    label: { en: 'Make a game', ru: 'Сделать игру' },
    badge: 'new',
    prompt: {
      en: 'Make a one-button arcade game with real juice: screen shake, particles, combo scoring and a local leaderboard.',
      ru: 'Сделай аркаду на одну кнопку с настоящей «сочностью»: тряска экрана, частицы, комбо-очки и локальный лидерборд.',
    },
  },
  {
    id: 'video',
    icon: 'clapperboard',
    label: { en: 'Edit a video', ru: 'Смонтировать видео' },
    badge: 'new',
    prompt: {
      en: 'Cut a 30-second vertical teaser from our raw footage, add kinetic captions and an end card.',
      ru: 'Смонтируй 30-секундный вертикальный тизер из наших исходников, добавь кинетические субтитры и эндинг.',
    },
  },
  {
    id: 'design',
    icon: 'palette',
    label: { en: 'Design assets', ru: 'Дизайн-ассеты' },
    prompt: {
      en: 'Generate a brand kit: three palette directions, an icon set and social crops in four sizes.',
      ru: 'Сгенерируй бренд-кит: три варианта палитры, набор иконок и кропы для соцсетей в четырёх размерах.',
    },
  },
  {
    id: 'automations',
    icon: 'calendar',
    label: { en: 'Schedule a report', ru: 'Отчёт по расписанию' },
    prompt: {
      en: 'Every Monday at 08:00, scan our five competitors and post a diff-only brief to Slack.',
      ru: 'Каждый понедельник в 08:00 проверяй пять наших конкурентов и публикуй в Slack только изменения.',
    },
  },
  {
    id: 'browser',
    icon: 'compass',
    label: { en: 'Work in a portal', ru: 'Поработать в портале' },
    prompt: {
      en: 'Log into the supplier portal, export last quarter invoices and reconcile them against our ledger CSV.',
      ru: 'Залогинься в портал поставщика, выгрузи счета за прошлый квартал и сверь их с нашим CSV-реестром.',
    },
  },
]

export const compareMatrix = {
  columns: [
    { id: 'rsb', label: { en: 'RS-BUILDER', ru: 'RS-BUILDER' } },
    { id: 'chat', label: { en: 'Chat assistants', ru: 'Чат-ассистенты' } },
    { id: 'builder', label: { en: 'Website builders', ru: 'Конструкторы сайтов' } },
    { id: 'copilot', label: { en: 'Code copilots', ru: 'Код-копайлоты' } },
  ],
  rows: [
    {
      label: { en: 'Executes the task instead of describing it', ru: 'Выполняет задачу, а не описывает её' },
      values: { rsb: true, chat: false, builder: false, copilot: 'partial' },
    },
    {
      label: { en: 'Real browser session with logins', ru: 'Настоящая браузерная сессия с логинами' },
      values: { rsb: true, chat: false, builder: false, copilot: false },
    },
    {
      label: { en: 'Editable source code as output', ru: 'Редактируемый исходный код на выходе' },
      values: { rsb: true, chat: 'partial', builder: false, copilot: true },
    },
    {
      label: { en: 'Non-code deliverables (decks, video, research)', ru: 'Не-код артефакты (деки, видео, исследования)' },
      values: { rsb: true, chat: 'partial', builder: false, copilot: false },
    },
    {
      label: { en: 'Parallel sub-agents for big questions', ru: 'Параллельные суб-агенты для больших вопросов' },
      values: { rsb: true, chat: false, builder: false, copilot: false },
    },
    {
      label: { en: 'Scheduled recurring runs', ru: 'Запуски по расписанию' },
      values: { rsb: true, chat: false, builder: false, copilot: false },
    },
    {
      label: { en: 'Visible plan you can edit mid-run', ru: 'Видимый план, который правится на лету' },
      values: { rsb: true, chat: false, builder: false, copilot: 'partial' },
    },
  ],
} as const
