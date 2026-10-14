import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Check, Github, Linkedin, Twitter, Youtube } from 'lucide-react'
import { useI18n } from '@/i18n'
import { footerColumns, SITE } from '@/data/site'
import { LogoMark } from '@/components/Logo'
import { scrollToNode } from '@/lib/dom'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'

const socials = [
  { icon: Twitter, href: SITE.social.x, label: 'X' },
  { icon: Github, href: SITE.social.github, label: 'GitHub' },
  { icon: Linkedin, href: SITE.social.linkedin, label: 'LinkedIn' },
  { icon: Youtube, href: SITE.social.youtube, label: 'YouTube' },
]

export function Footer() {
  const { t, l } = useI18n()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setSent(true)
    setEmail('')
    window.setTimeout(() => setSent(false), 4000)
  }

  const go = (href: string) => {
    if (!href.startsWith('/#')) return
    const id = href.slice(2)
    scrollToNode(document.getElementById(id))
  }

  return (
    <footer className="relative overflow-hidden border-t border-line bg-bg-elev">
      <div className="grid-bg mask-fade-b pointer-events-none absolute inset-x-0 top-0 h-64 opacity-60" />
      <div className="shell relative">
        <div className="grid gap-12 py-14 lg:grid-cols-[1.15fr_2fr]">
          <div className="flex flex-col gap-6">
            <Link to="/" className="flex items-center gap-2.5 text-fg">
              <LogoMark className="h-8 w-8" />
              <span className="text-[16px] font-extrabold uppercase tracking-[-0.02em]">
                RS<span className="text-faint">-</span>BUILDER
              </span>
            </Link>
            <p className="max-w-xs text-[14.5px] leading-relaxed text-muted">{t('footer.tagline')}</p>

            <form onSubmit={onSubmit} className="max-w-sm">
              <label htmlFor="newsletter" className="eyebrow block">
                {t('footer.newsletter')}
              </label>
              <p className="mt-1.5 text-[12.5px] text-faint">{t('footer.newsletterHint')}</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  id="newsletter"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('footer.emailPlaceholder')}
                  className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-[13.5px] text-fg outline-none transition-colors placeholder:text-faint focus:border-accent/60"
                />
                <button
                  type="submit"
                  aria-label={t('footer.subscribe')}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink transition-colors hover:bg-accent-strong"
                >
                  {sent ? <Check size={17} /> : <ArrowRight size={17} />}
                </button>
              </div>
              {sent ? <p className="mt-2 text-[12.5px] text-accent">{t('footer.subscribed')}</p> : null}
            </form>

            <div className="flex items-center gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={s.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  <s.icon size={15} strokeWidth={1.9} />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {footerColumns.map((column) => (
              <div key={column.label.en}>
                <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-fg">{l(column.label)}</h3>
                <ul className="mt-4 space-y-2.5">
                  {column.items.map((item) => (
                    <li key={item.label.en}>
                      {item.href.startsWith('/#') ? (
                        <button
                          type="button"
                          onClick={() => go(item.href)}
                          className="text-left text-[13.5px] text-muted transition-colors hover:text-fg"
                        >
                          {l(item.label)}
                        </button>
                      ) : (
                        <Link
                          to={item.href}
                          className="inline-flex items-center gap-1.5 text-[13.5px] text-muted transition-colors hover:text-fg"
                        >
                          {l(item.label)}
                          {item.badge === 'new' ? (
                            <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                              {t('common.new')}
                            </span>
                          ) : null}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="relative select-none overflow-hidden">
          <p className="h-display pointer-events-none whitespace-nowrap text-center text-[clamp(2.6rem,13vw,11rem)] leading-none text-fg/[0.055]">
            RS-BUILDER
          </p>
        </div>

        <div className="flex flex-col gap-4 border-t border-line py-6 text-[12.5px] text-faint md:flex-row md:items-center md:justify-between">
          <p>{t('footer.rights', { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/#terms" className="transition-colors hover:text-fg">{t('footer.terms')}</Link>
            <Link to="/#privacy" className="transition-colors hover:text-fg">{t('footer.privacy')}</Link>
            <a href={`mailto:${SITE.support}`} className="transition-colors hover:text-fg">{t('footer.status')}</a>
            <div className="flex items-center gap-2">
              <LanguageSwitcher compact />
              <ThemeToggle className="h-8 w-8" />
            </div>
          </div>
        </div>
        <p className="pb-8 text-[11.5px] leading-relaxed text-faint/70">{t('footer.legalNote')}</p>
      </div>
    </footer>
  )
}
