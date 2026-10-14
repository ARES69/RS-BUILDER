import type { Locale } from '@/i18n'

/** A string that exists in every supported locale. */
export type L = Record<Locale, string>

export const pick = (value: L, locale: Locale): string => value[locale] ?? value.en

export type IconName =
  | 'globe'
  | 'presentation'
  | 'microscope'
  | 'network'
  | 'gamepad'
  | 'clapperboard'
  | 'palette'
  | 'compass'
  | 'calendar'
  | 'table'
  | 'fileText'
  | 'gitBranch'
  | 'bolt'
  | 'shield'
  | 'mail'
  | 'sparkles'
