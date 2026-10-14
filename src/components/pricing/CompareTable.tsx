import { useState } from 'react'
import { Fragment } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { compareGroups, plans } from '@/data/pricing'
import { cn } from '@/lib/cn'

function Value({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={15} className="mx-auto text-accent" strokeWidth={2.6} />
  if (value === false) return <X size={13} className="mx-auto text-faint/60" strokeWidth={2.4} />
  return <span className="font-mono text-[12.5px] text-fg">{value}</span>
}

export function CompareTable() {
  const { t, l } = useI18n()
  const [open, setOpen] = useState<number[]>([0, 1])

  const toggle = (i: number) =>
    setOpen((current) => (current.includes(i) ? current.filter((x) => x !== i) : [...current, i]))

  const visiblePlans = plans

  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface/50">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="bg-bg-elev/60">
              <th className="sticky left-0 z-10 bg-bg-elev/95 px-5 py-4 text-[12px] font-bold uppercase tracking-[0.12em] text-faint backdrop-blur">
                {t('pricing.compareCta')}
              </th>
              {visiblePlans.map((plan) => (
                <th
                  key={plan.id}
                  className={cn(
                    'px-4 py-4 text-center text-[13px] font-bold tracking-[-0.01em]',
                    plan.highlight ? 'text-accent' : 'text-fg',
                  )}
                >
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {compareGroups.map((group, gi) => {
              const isOpen = open.includes(gi)
              return (
                <Fragment key={group.title.en}>
                  <tr>
                    <td colSpan={visiblePlans.length + 1} className="p-0">
                      <button
                        type="button"
                        onClick={() => toggle(gi)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-4 border-t border-line px-5 py-3.5 text-left transition-colors hover:bg-surface-2/60"
                      >
                        <span className="text-[12px] font-bold uppercase tracking-[0.12em] text-muted">
                          {l(group.title)}
                        </span>
                        <ChevronDown size={15} className={cn('text-faint transition-transform', isOpen && 'rotate-180')} />
                      </button>
                    </td>
                  </tr>
                  {isOpen
                    ? group.rows.map((row) => (
                        <tr key={row.label.en} className="group">
                          <td className="border-t border-line px-5 py-3 text-[13.5px] text-muted transition-colors group-hover:text-fg">
                            {l(row.label)}
                          </td>
                          {visiblePlans.map((plan) => (
                            <td
                              key={plan.id}
                              className={cn(
                                'border-t border-line px-4 py-3 text-center',
                                plan.highlight && 'bg-accent/[0.04]',
                              )}
                            >
                              <Value value={row.values[plan.id] ?? false} />
                            </td>
                          ))}
                        </tr>
                      ))
                    : null}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
