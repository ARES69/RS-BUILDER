import { useI18n } from '@/i18n'
import { cn } from '@/lib/cn'

export type Billing = 'monthly' | 'annual'

export function BillingToggle({ value, onChange }: { value: Billing; onChange: (next: Billing) => void }) {
  const { t } = useI18n()
  const options: { id: Billing; label: string }[] = [
    { id: 'monthly', label: t('common.monthly') },
    { id: 'annual', label: t('common.annually') },
  ]
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line bg-surface/70 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          aria-pressed={value === option.id}
          className={cn(
            'relative rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
            value === option.id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-fg',
          )}
        >
          {option.label}
        </button>
      ))}
      <span className="ml-1 mr-1 rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-accent">
        {t('common.saveBadge')}
      </span>
    </div>
  )
}
