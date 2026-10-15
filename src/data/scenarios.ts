/**
 * Prompt presets for the workspace sampler. The simulated scenario engine is
 * GONE (see MEMORY §2): these are content suggestions only — every run goes to
 * the live backend and the real LLM orchestrator.
 */
import type { Localized } from '@/i18n'
import type { IconName } from './types'

export type PromptPreset = {
  id: string
  label: Localized
  prompt: Localized
  icon: IconName
  totalCredits: number
  runtime: string
}

export const PRESETS: PromptPreset[] = [
  {
    id: 'site',
    label: { en: 'Landing page', ru: 'Лендинг' },
    prompt: {
      en: 'Build a landing page for a single-origin coffee subscription: hero, three plans, how it works, FAQ, footer. Warm editorial palette, serif headings.',
      ru: 'Собери лендинг для подписки на моносортный кофе: герой, три тарифа, как это работает, FAQ, футер. Тёплая журнальная палитра, заголовки с засечками.',
    },
    icon: 'globe',
    totalCredits: 320,
    runtime: '4m 12s',
  },
  {
    id: 'deck',
    label: { en: 'Investor deck', ru: 'Инвест-дек' },
    prompt: {
      en: 'Turn our metrics into a seed deck: problem, product, traction, market, team, ask. At most seven slides, dark and technical style.',
      ru: 'Преврати наш CSV с метриками в seed-дек: проблема, продукт, тракция, рынок, команда, запрос. Максимум семь слайдов, тёмный и технический стиль.',
    },
    icon: 'presentation',
    totalCredits: 540,
    runtime: '6m 48s',
  },
  {
    id: 'research',
    label: { en: 'Market scan', ru: 'Сканирование рынка' },
    prompt: {
      en: 'Wide Research: map every AI coding tool sold in the EU — prices, features, teams and empty niches. Cite sources.',
      ru: 'Wide Research: составь карту всех ИИ-инструментов для кодинга, которые продаются в ЕС, — цены, фичи, команды и где пустые ниши. Со ссылками на источники.',
    },
    icon: 'microscope',
    totalCredits: 1840,
    runtime: '21m 05s',
  },
  {
    id: 'game',
    label: { en: 'Arcade game', ru: 'Аркада' },
    prompt: {
      en: 'Make a one-button arcade game with real juice: three screens, particles, combo score and a local leaderboard.',
      ru: 'Сделай аркаду на одну кнопку с настоящей «сочностью»: три экрана, частицы, комбо-очки и локальный лидерборд.',
    },
    icon: 'gamepad',
    totalCredits: 760,
    runtime: '9m 33s',
  },
]
