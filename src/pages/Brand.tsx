import { useState } from 'react'
import { Check, Copy, Download } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useCopy } from '@/lib/hooks'
import { cn } from '@/lib/cn'
import { LogoMark } from '@/components/Logo'
import { Reveal } from '@/lib/motion'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { CTASection } from '@/components/home/CTASection'

const palette = [
  { name: 'Ink', hex: '#07070a', role: 'Canvas (dark)', text: '#f4f4f1' },
  { name: 'Paper', hex: '#f6f5f1', role: 'Canvas (light)', text: '#101014' },
  { name: 'Signal', hex: '#c8f751', role: 'Primary accent', text: '#0b0b0f' },
  { name: 'Signal deep', hex: '#a9e01c', role: 'Accent on light', text: '#0b0b0f' },
  { name: 'Volt', hex: '#8b7bff', role: 'Secondary accent', text: '#0b0b0f' },
  { name: 'Aqua', hex: '#35e0d6', role: 'Data / tertiary', text: '#0b0b0f' },
  { name: 'Graphite', hex: '#17171f', role: 'Surface (dark)', text: '#f4f4f1' },
  { name: 'Fog', hex: '#9c9ca8', role: 'Muted text (dark)', text: '#0b0b0f' },
]

const dos = {
  en: [
    'Keep the clear space around the mark equal to the height of the block.',
    'Use Signal on dark surfaces and Signal deep on light surfaces.',
    'Pair the wordmark in uppercase with tight -0.02em tracking.',
    'Use the mark alone below 24px.',
  ],
  ru: [
    'Охранное поле знака равно высоте блока.',
    'Signal — на тёмных поверхностях, Signal deep — на светлых.',
    'Вордмарк — в верхнем регистре с трекингом -0.02em.',
    'Ниже 24px используйте знак отдельно.',
  ],
}

const donts = {
  en: [
    "Don't rotate, skew or stretch the mark.",
    "Don't recolour the block to anything outside the palette.",
    "Don't put the wordmark on a busy photograph without a scrim.",
    "Don't add outlines, drop shadows or bevels.",
  ],
  ru: [
    'Не поворачивайте, не наклоняйте и не растягивайте знак.',
    'Не перекрашивайте блок в цвета вне палитры.',
    'Не ставьте вордмарк на пёстрое фото без подложки.',
    'Не добавляйте обводки, тени и объём.',
  ],
}

function svgDataUri(svg: string) {
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="256" height="256"><g fill="none" stroke="#0b0b0f" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round"><path d="M10.4 24.2V8.4h5.3a4.1 4.1 0 0 1 0 8.2h-5.3"/><path d="M15.6 16.6 21.4 24.2"/></g><rect x="20.6" y="6.4" width="5" height="5" rx="1.6" fill="#c8f751"/></svg>`

export default function Brand() {
  const { t, l, locale } = useI18n()
  const { copied, copy } = useCopy()
  const [downloaded, setDownloaded] = useState(false)

  const downloadPack = () => {
    const files = [markSvg]
    const blob = new Blob([files.join('\n')], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'rs-builder-mark.svg'
    a.click()
    URL.revokeObjectURL(url)
    setDownloaded(true)
    window.setTimeout(() => setDownloaded(false), 2500)
  }

  return (
    <>
      <section className="relative overflow-hidden pb-14 pt-14">
        <div className="grid-bg mask-fade-b pointer-events-none absolute inset-0 -z-10 opacity-60" />
        <div className="shell">
          <SectionHeading
            align="left"
            eyebrow={t('brand.eyebrow')}
            title={t('brand.title')}
            subtitle={t('brand.subtitle')}
            aside={
              <button
                type="button"
                onClick={downloadPack}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-accent px-5 text-[13.5px] font-bold text-accent-ink transition-all hover:-translate-y-px hover:bg-accent-strong"
              >
                {downloaded ? <Check size={15} /> : <Download size={15} />}
                {t('brand.downloadAll')}
              </button>
            }
          />
        </div>
      </section>

      {/* Logo */}
      <section className="border-y border-line bg-bg-elev py-14">
        <div className="shell">
          <h2 className="eyebrow">{t('brand.logo')}</h2>
          <p className="mt-2 max-w-xl text-[13.5px] text-muted">{t('brand.logoNote')}</p>
          <Reveal className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-bg p-10">
              <LogoMark className="h-14 w-14 text-fg" />
              <span className="font-mono text-[11px] text-faint">mark · current</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-[#07070a] p-10">
              <LogoMark className="h-14 w-14 text-white" />
              <span className="font-mono text-[11px] text-white/40">mark · on ink</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-[#f6f5f1] p-10">
              <span className="flex items-center gap-2.5 text-[#101014]">
                <LogoMark className="h-9 w-9" />
                <span className="text-[17px] font-extrabold uppercase tracking-[-0.02em]">
                  RS<span className="text-[#101014]/45">-</span>BUILDER
                </span>
              </span>
              <span className="font-mono text-[11px] text-[#101014]/45">lockup · on paper</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-line bg-accent p-10">
              <LogoMark className="h-14 w-14 text-accent-ink" accent={false} />
              <span className="font-mono text-[11px] text-accent-ink/60">mark · reversed</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Color */}
      <section className="py-14">
        <div className="shell">
          <h2 className="eyebrow">{t('brand.colors')}</h2>
          <p className="mt-2 max-w-xl text-[13.5px] text-muted">{t('brand.colorsNote')}</p>
          <Reveal className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {palette.map((color) => {
              const id = 'color-' + color.hex
              return (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => copy(color.hex, id)}
                  className="group overflow-hidden rounded-2xl border border-line text-left transition-all hover:-translate-y-1 hover:border-line-strong"
                >
                  <span
                    className="flex h-24 items-end justify-between p-3"
                    style={{ background: color.hex, color: color.text }}
                  >
                    <span className="font-mono text-[11px] opacity-70">{color.hex.toUpperCase()}</span>
                    <span className="opacity-0 transition-opacity group-hover:opacity-70">
                      {copied === id ? <Check size={14} /> : <Copy size={14} />}
                    </span>
                  </span>
                  <span className="block bg-surface px-3 py-2.5">
                    <span className="block text-[13px] font-bold text-fg">{color.name}</span>
                    <span className="mt-0.5 block text-[11.5px] text-muted">{color.role}</span>
                  </span>
                </button>
              )
            })}
          </Reveal>
        </div>
      </section>

      {/* Typography */}
      <section className="border-y border-line bg-bg-elev py-14">
        <div className="shell">
          <h2 className="eyebrow">{t('brand.typography')}</h2>
          <p className="mt-2 max-w-xl text-[13.5px] text-muted">{t('brand.typeNote')}</p>
          <Reveal className="mt-6 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-line bg-surface/60 p-6">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Inter · 800 · -0.035em</span>
              <p className="h-display mt-3 text-[clamp(2rem,4vw,3rem)] text-fg">
                {locale === 'ru' ? 'Меньше структуры.' : 'Less structure,'}
              </p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                {locale === 'ru'
                  ? 'Inter используется для заголовков, интерфейса и основного текста. Шкала: 66 / 42 / 24 / 16 / 13 / 11.'
                  : 'Inter covers display, UI and body copy. Scale: 66 / 42 / 24 / 16 / 13 / 11.'}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-[#0a0a0f] p-6">
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/35">
                JetBrains Mono · 500
              </span>
              <pre className="mt-3 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-[#c8f751]">
{`$ rsb run "build a landing page"
› plan      5 steps · est 4m 12s
› browser   opened portal.supplier-eu.example
› editor    wrote index.html (14.2 KB)
› deploy    preview.rs-builder.app/ember-oak
✓ done      320 credits`}
              </pre>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Usage */}
      <section className="py-14">
        <div className="shell">
          <h2 className="eyebrow">{t('brand.usage')}</h2>
          <Reveal className="mt-6 grid gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-accent/30 bg-accent/[0.05] p-6">
              <h3 className="text-[15px] font-bold text-fg">{t('brand.doTitle')}</h3>
              <ul className="mt-4 space-y-2.5">
                {(locale === 'ru' ? dos.ru : dos.en).map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-muted">
                    <Check size={14} className="mt-0.5 shrink-0 text-accent" strokeWidth={3} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-line bg-surface/60 p-6">
              <h3 className="text-[15px] font-bold text-fg">{t('brand.dontTitle')}</h3>
              <ul className="mt-4 space-y-2.5">
                {(locale === 'ru' ? donts.ru : donts.en).map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-muted">
                    <span className="mt-0.5 shrink-0 text-danger">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal className="mt-3 grid gap-3 sm:grid-cols-3">
            <a
              href={svgDataUri(markSvg)}
              download="rs-builder-mark.svg"
              className={cn(
                'flex items-center justify-between rounded-2xl border border-line bg-surface/60 px-5 py-4 transition-colors hover:border-accent/40',
              )}
            >
              <span className="text-[13.5px] font-semibold text-fg">mark.svg</span>
              <Download size={15} className="text-muted" />
            </a>
            <a
              href={svgDataUri(markSvg.replace('#0b0b0f', '#ffffff'))}
              download="rs-builder-mark-white.svg"
              className="flex items-center justify-between rounded-2xl border border-line bg-surface/60 px-5 py-4 transition-colors hover:border-accent/40"
            >
              <span className="text-[13.5px] font-semibold text-fg">mark-white.svg</span>
              <Download size={15} className="text-muted" />
            </a>
            <a
              href={svgDataUri(markSvg.replace('#c8f751', '#0b0b0f'))}
              download="rs-builder-mark-mono.svg"
              className="flex items-center justify-between rounded-2xl border border-line bg-surface/60 px-5 py-4 transition-colors hover:border-accent/40"
            >
              <span className="text-[13.5px] font-semibold text-fg">mark-mono.svg</span>
              <Download size={15} className="text-muted" />
            </a>
          </Reveal>
          <p className="mt-3 font-mono text-[11px] text-faint">{l({ en: 'SVG · single path set · scales to any size', ru: 'SVG · один набор путей · масштабируется без потерь' })}</p>
        </div>
      </section>

      <CTASection />
    </>
  )
}
