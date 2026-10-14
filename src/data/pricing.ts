import type { L } from './types'

export type Plan = {
  id: string
  name: string
  priceMonthly: number
  priceAnnual: number
  priceLabel?: L
  summary: L
  credits: number
  refreshCredits: number
  highlight?: boolean
  cta: 'signup' | 'contact'
  features: L[]
  limits: { label: L; value: string }[]
}

export const plans: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceMonthly: 0,
    priceAnnual: 0,
    summary: {
      en: 'Everything you need to see what the agent can actually do.',
      ru: 'Всё необходимое, чтобы понять, на что реально способен агент.',
    },
    credits: 1500,
    refreshCredits: 300,
    cta: 'signup',
    features: [
      { en: 'Full agent: browser, shell, files, design tools', ru: 'Полный агент: браузер, шелл, файлы, дизайн-инструменты' },
      { en: 'Websites, slides and documents', ru: 'Сайты, слайды и документы' },
      { en: 'Deep research with citations', ru: 'Глубокое исследование с цитатами' },
      { en: '3 concurrent tasks', ru: '3 параллельные задачи' },
      { en: '5 scheduled runs', ru: '5 запусков по расписанию' },
      { en: 'Community support', ru: 'Поддержка сообщества' },
    ],
    limits: [
      { label: { en: 'Concurrent tasks', ru: 'Параллельные задачи' }, value: '3' },
      { label: { en: 'Scheduled runs', ru: 'Запуски по расписанию' }, value: '5' },
      { label: { en: 'Wide Research sub-agents', ru: 'Суб-агенты Wide Research' }, value: '5' },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 39,
    priceAnnual: 32,
    highlight: true,
    summary: {
      en: 'For people who hand real work to the agent every day.',
      ru: 'Для тех, кто каждый день отдаёт агенту настоящую работу.',
    },
    credits: 8000,
    refreshCredits: 300,
    cta: 'signup',
    features: [
      { en: 'Everything in Starter', ru: 'Всё из тарифа Starter' },
      { en: 'Video generation and editing', ru: 'Генерация и монтаж видео' },
      { en: 'Game builds with asset pipelines', ru: 'Игровые сборки с пайплайном ассетов' },
      { en: 'Priority compute queue', ru: 'Приоритетная очередь вычислений' },
      { en: '20 concurrent tasks', ru: '20 параллельных задач' },
      { en: '50 scheduled runs', ru: '50 запусков по расписанию' },
      { en: 'Early access to beta features', ru: 'Ранний доступ к бета-функциям' },
    ],
    limits: [
      { label: { en: 'Concurrent tasks', ru: 'Параллельные задачи' }, value: '20' },
      { label: { en: 'Scheduled runs', ru: 'Запуски по расписанию' }, value: '50' },
      { label: { en: 'Wide Research sub-agents', ru: 'Суб-агенты Wide Research' }, value: '20' },
    ],
  },
  {
    id: 'max',
    name: 'Max',
    priceMonthly: 199,
    priceAnnual: 165,
    summary: {
      en: 'Sustained heavy use: research fleets, batch production, real pipelines.',
      ru: 'Постоянная тяжёлая нагрузка: флоты исследований, пакетное производство, живые пайплайны.',
    },
    credits: 40000,
    refreshCredits: 300,
    cta: 'signup',
    features: [
      { en: 'Everything in Pro', ru: 'Всё из тарифа Pro' },
      { en: 'Wide Research at full scale', ru: 'Wide Research на полной мощности' },
      { en: 'Batch runs over CSV and Drive sources', ru: 'Пакетные запуски по CSV и источникам в Drive' },
      { en: 'Long-context analysis with data exports', ru: 'Длинноконтекстный анализ с экспортом данных' },
      { en: '50 concurrent tasks', ru: '50 параллельных задач' },
      { en: 'Unlimited scheduled runs', ru: 'Безлимитные запуски по расписанию' },
      { en: 'Named support engineer', ru: 'Персональный инженер поддержки' },
    ],
    limits: [
      { label: { en: 'Concurrent tasks', ru: 'Параллельные задачи' }, value: '50' },
      { label: { en: 'Scheduled runs', ru: 'Запуски по расписанию' }, value: '∞' },
      { label: { en: 'Wide Research sub-agents', ru: 'Суб-агенты Wide Research' }, value: '40' },
    ],
  },
  {
    id: 'team',
    name: 'Team & Enterprise',
    priceMonthly: -1,
    priceAnnual: -1,
    priceLabel: { en: 'Custom', ru: 'Индивидуально' },
    summary: {
      en: 'Shared credits, governance and private deployment for organisations.',
      ru: 'Общие кредиты, управление доступом и приватное развёртывание для организаций.',
    },
    credits: 0,
    refreshCredits: 0,
    cta: 'contact',
    features: [
      { en: 'Everything in Max', ru: 'Всё из тарифа Max' },
      { en: 'Shared credit pool across seats', ru: 'Общий пул кредитов на всех участников' },
      { en: 'SSO/SAML, SCIM and audit logs', ru: 'SSO/SAML, SCIM и журнал аудита' },
      { en: 'Role-based access to workspaces', ru: 'Ролевой доступ к воркспейсам' },
      { en: 'VPC or on-prem deployment', ru: 'Развёртывание в VPC или on-premise' },
      { en: '99.9% uptime SLA and DPA', ru: 'SLA 99.9% и DPA' },
    ],
    limits: [
      { label: { en: 'Concurrent tasks', ru: 'Параллельные задачи' }, value: 'Custom' },
      { label: { en: 'Scheduled runs', ru: 'Запуски по расписанию' }, value: '∞' },
      { label: { en: 'Wide Research sub-agents', ru: 'Суб-агенты Wide Research' }, value: '100+' },
    ],
  },
]

export type CompareRow = { label: L; values: Record<string, string | boolean> }

export const compareGroups: { title: L; rows: CompareRow[] }[] = [
  {
    title: { en: 'Usage', ru: 'Использование' },
    rows: [
      { label: { en: 'Credits per month', ru: 'Кредитов в месяц' }, values: { starter: '1,500', pro: '8,000', max: '40,000', team: 'Pooled' } },
      { label: { en: 'Daily refresh credits', ru: 'Refresh-кредиты в день' }, values: { starter: '300', pro: '300', max: '300', team: 'Custom' } },
      { label: { en: 'Concurrent tasks', ru: 'Параллельные задачи' }, values: { starter: '3', pro: '20', max: '50', team: 'Custom' } },
      { label: { en: 'Scheduled runs', ru: 'Запуски по расписанию' }, values: { starter: '5', pro: '50', max: true, team: true } },
    ],
  },
  {
    title: { en: 'Outputs', ru: 'Артефакты' },
    rows: [
      { label: { en: 'Websites & web apps', ru: 'Сайты и веб-приложения' }, values: { starter: true, pro: true, max: true, team: true } },
      { label: { en: 'Slides & documents', ru: 'Слайды и документы' }, values: { starter: true, pro: true, max: true, team: true } },
      { label: { en: 'Deep research with citations', ru: 'Глубокое исследование с цитатами' }, values: { starter: true, pro: true, max: true, team: true } },
      { label: { en: 'Wide Research (parallel sub-agents)', ru: 'Wide Research (параллельные суб-агенты)' }, values: { starter: '5', pro: '20', max: '40', team: '100+' } },
      { label: { en: 'Image & design generation', ru: 'Генерация изображений и дизайна' }, values: { starter: true, pro: true, max: true, team: true } },
      { label: { en: 'Video generation & editing', ru: 'Генерация и монтаж видео' }, values: { starter: false, pro: true, max: true, team: true } },
      { label: { en: 'Game builds', ru: 'Игровые сборки' }, values: { starter: false, pro: true, max: true, team: true } },
    ],
  },
  {
    title: { en: 'Workspace & control', ru: 'Воркспейс и контроль' },
    rows: [
      { label: { en: 'Live plan editing', ru: 'Правка плана на лету' }, values: { starter: true, pro: true, max: true, team: true } },
      { label: { en: 'Browser operator sessions', ru: 'Сессии браузер-оператора' }, values: { starter: true, pro: true, max: true, team: true } },
      { label: { en: 'Version history per run', ru: 'История версий по запускам' }, values: { starter: '7 days', pro: '90 days', max: true, team: true } },
      { label: { en: 'API access', ru: 'Доступ к API' }, values: { starter: false, pro: true, max: true, team: true } },
      { label: { en: 'Priority compute queue', ru: 'Приоритетная очередь' }, values: { starter: false, pro: true, max: true, team: true } },
    ],
  },
  {
    title: { en: 'Security & support', ru: 'Безопасность и поддержка' },
    rows: [
      { label: { en: 'SSO / SAML', ru: 'SSO / SAML' }, values: { starter: false, pro: false, max: false, team: true } },
      { label: { en: 'Audit logs', ru: 'Журнал аудита' }, values: { starter: false, pro: false, max: false, team: true } },
      { label: { en: 'VPC / on-prem deployment', ru: 'VPC / on-premise' }, values: { starter: false, pro: false, max: false, team: true } },
      { label: { en: 'Support', ru: 'Поддержка' }, values: { starter: 'Community', pro: 'Email · 24h', max: 'Named engineer', team: 'SLA 99.9%' } },
    ],
  },
]
