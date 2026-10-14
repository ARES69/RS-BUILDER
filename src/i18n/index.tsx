import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { en, type Dict } from './en'
import { ru } from './ru'

export type Locale = 'en' | 'ru'
export type Localized = { en: string; ru: string }

const dictionaries: Record<Locale, Dict> = { en, ru }
export const LOCALES: Locale[] = ['en', 'ru']
const STORAGE_KEY = 'rsb-locale'

type DictValue = string | { [key: string]: DictValue }

function resolve(dict: DictValue, path: string): string {
  const value = path.split('.').reduce<DictValue | undefined>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, DictValue>)[key]
    return undefined
  }, dict)
  return typeof value === 'string' ? value : path
}

type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (path: string, params?: Record<string, string | number>) => string
  l: (value: Localized) => string
  dict: Dict
}

const I18nContext = createContext<I18nValue | null>(null)

function detectLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'ru') return stored
  } catch {
    /* storage unavailable — fall through to browser detection */
  }
  const nav = window.navigator.language?.toLowerCase() ?? 'en'
  return nav.startsWith('ru') ? 'ru' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => setLocaleState(next), [])

  const t = useCallback(
    (path: string, params?: Record<string, string | number>) => {
      let out = resolve(dictionaries[locale] as unknown as DictValue, path)
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          out = out.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
        }
      }
      return out
    },
    [locale],
  )

  const l = useCallback((value: Localized) => value[locale] ?? value.en, [locale])

  const value = useMemo(
    () => ({ locale, setLocale, t, l, dict: dictionaries[locale] }),
    [locale, setLocale, t, l],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}
