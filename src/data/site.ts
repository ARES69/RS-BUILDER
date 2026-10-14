import type { L } from './types'

export const SITE = {
  name: 'RS-BUILDER',
  domain: 'rs-builder.app',
  email: 'hello@rs-builder.app',
  support: 'support@rs-builder.app',
  press: 'press@rs-builder.app',
  careers: 'jobs@rs-builder.app',
  social: {
    x: 'https://x.com/',
    github: 'https://github.com/',
    linkedin: 'https://linkedin.com/',
    youtube: 'https://youtube.com/',
    telegram: 'https://telegram.org/',
  },
}

export type NavItem = { label: L; href: string; badge?: 'new' | 'beta' }
export type NavGroup = { label: L; items: NavItem[] }

export const primaryNav: NavItem[] = [
  { label: { en: 'Product', ru: 'Продукт' }, href: '/#capabilities' },
  { label: { en: 'Features', ru: 'Возможности' }, href: '/features/webapp' },
  { label: { en: 'Workspace', ru: 'Воркспейс' }, href: '/app', badge: 'new' },
  { label: { en: 'Pricing', ru: 'Тарифы' }, href: '/pricing' },
  { label: { en: 'Brand kit', ru: 'Бренд-кит' }, href: '/brand' },
]

export const footerColumns: NavGroup[] = [
  {
    label: { en: 'Product', ru: 'Продукт' },
    items: [
      { label: { en: 'Web apps & sites', ru: 'Сайты и веб-приложения' }, href: '/features/webapp' },
      { label: { en: 'AI slides', ru: 'Слайды' }, href: '/features/slides' },
      { label: { en: 'Deep research', ru: 'Глубокое исследование' }, href: '/features/deep-research' },
      { label: { en: 'Wide Research', ru: 'Wide Research' }, href: '/features/wide-research' },
      { label: { en: 'Game development', ru: 'Разработка игр' }, href: '/features/games' },
      { label: { en: 'Video & editor', ru: 'Видео и редактор' }, href: '/features/video' },
      { label: { en: 'Design & images', ru: 'Дизайн и изображения' }, href: '/features/design' },
      { label: { en: 'Browser operator', ru: 'Браузер-оператор' }, href: '/features/browser-operator' },
      { label: { en: 'Automations', ru: 'Автоматизации' }, href: '/features/automations' },
      { label: { en: 'Pricing', ru: 'Тарифы' }, href: '/pricing' },
    ],
  },
  {
    label: { en: 'Resources', ru: 'Ресурсы' },
    items: [
      { label: { en: 'Workspace demo', ru: 'Демо воркспейса' }, href: '/app', badge: 'new' },
      { label: { en: 'Blog', ru: 'Блог' }, href: '/blog' },
      { label: { en: 'Documentation', ru: 'Документация' }, href: '/features/webapp' },
      { label: { en: 'Changelog', ru: 'Обновления' }, href: '/legal#changelog' },
      { label: { en: 'Brand kit', ru: 'Бренд-кит' }, href: '/brand' },
      { label: { en: 'Help center', ru: 'Центр помощи' }, href: '/#faq' },
      { label: { en: 'Trust center', ru: 'Центр доверия' }, href: '/#security' },
      { label: { en: 'API', ru: 'API' }, href: '/features/automations' },
    ],
  },
  {
    label: { en: 'Company', ru: 'Компания' },
    items: [
      { label: { en: 'About us', ru: 'О нас' }, href: '/#about' },
      { label: { en: 'Careers', ru: 'Вакансии' }, href: '/#careers' },
      { label: { en: 'For media', ru: 'Для прессы' }, href: '/brand' },
      { label: { en: 'Terms of service', ru: 'Условия сервиса' }, href: '/#terms' },
      { label: { en: 'Privacy policy', ru: 'Политика конфиденциальности' }, href: '/#privacy' },
    ],
  },
  {
    label: { en: 'Compare', ru: 'Сравнение' },
    items: [
      { label: { en: 'VS chat assistants', ru: 'Против чат-ассистентов' }, href: '/#compare' },
      { label: { en: 'VS website builders', ru: 'Против конструкторов сайтов' }, href: '/#compare' },
      { label: { en: 'VS code copilots', ru: 'Против код-копайлотов' }, href: '/#compare' },
      { label: { en: 'VS automation tools', ru: 'Против RPA' }, href: '/#compare' },
    ],
  },
]
