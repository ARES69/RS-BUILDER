import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'
type Resolved = 'dark' | 'light'

const STORAGE_KEY = 'rsb-theme'
const ThemeContext = createContext<{
  mode: ThemeMode
  resolved: Resolved
  setMode: (mode: ThemeMode) => void
  toggle: () => void
} | null>(null)

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true
}

function readInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light' || stored === 'system') return stored
  } catch {
    /* ignore */
  }
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readInitialMode)
  const [systemDark, setSystemDark] = useState<boolean>(systemPrefersDark)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const onChange = (event: MediaQueryListEvent) => setSystemDark(event.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolved: Resolved = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#07070a' : '#f6f5f1')
  }, [resolved])

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  const setMode = useCallback((next: ThemeMode) => setModeState(next), [])
  const toggle = useCallback(
    () => setModeState((current) => ((current === 'system' ? (systemDark ? 'dark' : 'light') : current) === 'dark' ? 'light' : 'dark')),
    [systemDark],
  )

  const value = useMemo(() => ({ mode, resolved, setMode, toggle }), [mode, resolved, setMode, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
