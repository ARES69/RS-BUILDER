import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'
import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggle } = useTheme()
  const { t } = useI18n()
  const dark = resolved === 'dark'
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`${t('common.theme')}: ${dark ? t('common.dark') : t('common.light')}`}
      title={`${t('common.theme')}: ${dark ? t('common.dark') : t('common.light')}`}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-fg',
        className,
      )}
    >
      {dark ? <Sun size={15} strokeWidth={1.9} /> : <Moon size={15} strokeWidth={1.9} />}
    </button>
  )
}
