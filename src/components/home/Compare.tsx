import { Check, Minus, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { compareMatrix } from '@/data/home'
import { cn } from '@/lib/cn'
import { Reveal } from '@/lib/motion'
import { SectionHeading } from '@/components/ui/SectionHeading'

function Cell({ value }: { value: boolean | 'partial' }) {
  if (value === true)
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-accent">
        <Check size={13} strokeWidth={3} />
      </span>
    )
  if (value === 'partial')
    return (
      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-3 text-muted">
        <Minus size={13} strokeWidth={3} />
      </span>
    )
  return (
    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-surface-2 text-faint">
      <X size={12} strokeWidth={2.6} />
    </span>
  )
}

export function Compare() {
  const { l } = useI18n()
  return (
    <section id="compare" className="scroll-mt-24 border-y border-line bg-bg-elev py-20 sm:py-24">
      <div className="shell">
        <SectionHeading eyebrow="RS-BUILDER vs." title={l({ en: 'Not another chat window', ru: 'Это не ещё одно окно чата' })} />
        <Reveal className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[680px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="w-[38%] pb-4 text-[12px] font-bold uppercase tracking-[0.12em] text-faint">
                  {l({ en: 'Capability', ru: 'Возможность' })}
                </th>
                {compareMatrix.columns.map((col) => (
                  <th
                    key={col.id}
                    className={cn(
                      'pb-4 text-center text-[13px] font-bold tracking-[-0.01em]',
                      col.id === 'rsb' ? 'text-accent' : 'text-muted',
                    )}
                  >
                    {l(col.label)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {compareMatrix.rows.map((row) => (
                <tr key={row.label.en}>
                  <td className="border-t border-line py-3.5 pr-4 text-[13.5px] text-fg">{l(row.label)}</td>
                  {compareMatrix.columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn(
                        'border-t border-line py-3.5 text-center',
                        col.id === 'rsb' && 'bg-accent/[0.045]',
                      )}
                    >
                      <Cell value={row.values[col.id as keyof typeof row.values]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  )
}
