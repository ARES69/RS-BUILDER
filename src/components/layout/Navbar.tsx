import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowUpRight, ChevronDown, Menu, X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useLockBodyScroll, useScrolled } from '@/lib/hooks'
import { cn } from '@/lib/cn'
import { scrollToNode } from '@/lib/dom'
import { featurePages } from '@/data/features'
import { Logo } from '@/components/Logo'
import { ButtonLink } from '@/components/ui/Button'
import { LanguageSwitcher } from './LanguageSwitcher'
import { ThemeToggle } from './ThemeToggle'

export function Navbar() {
  const { t, l } = useI18n()
  const scrolled = useScrolled(8)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  useLockBodyScroll(mobileOpen)

  useEffect(() => {
    setMobileOpen(false)
    setMenuOpen(false)
  }, [location.pathname, location.hash])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const go = (href: string) => {
    if (href.startsWith('/#')) {
      const id = href.slice(2)
      if (location.pathname !== '/') {
        navigate(`/#${id}`)
      } else {
        scrollToNode(document.getElementById(id))
      }
      return
    }
    navigate(href)
  }

  const links: { label: string; href: string }[] = [
    { label: t('nav.product'), href: '/#capabilities' },
    { label: t('nav.features'), href: '/features/webapp' },
    { label: t('nav.workspace'), href: '/app' },
    { label: t('nav.pricing'), href: '/pricing' },
    { label: t('nav.blogLink'), href: '/blog' },
    { label: t('nav.brand'), href: '/brand' },
  ]

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 transition-all duration-300',
          scrolled ? 'border-b border-line bg-bg/80 backdrop-blur-xl' : 'border-b border-transparent',
        )}
      >
        <div className="shell flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link to="/" aria-label="RS-BUILDER" className="shrink-0 transition-opacity hover:opacity-80">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 lg:flex">
              {links.map((link, i) =>
                i === 1 ? (
                  <div key={link.href} className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      aria-expanded={menuOpen}
                      className={cn(
                        'inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13.5px] font-medium transition-colors',
                        menuOpen ? 'bg-surface-2 text-fg' : 'text-muted hover:text-fg',
                      )}
                    >
                      {link.label}
                      <ChevronDown size={14} className={cn('transition-transform', menuOpen && 'rotate-180')} />
                    </button>
                    {menuOpen ? (
                      <div className="animate-pop absolute left-1/2 top-12 z-50 w-[560px] -translate-x-1/2 rounded-2xl border border-line bg-bg-elev p-3 shadow-[0_40px_90px_-40px_rgba(0,0,0,0.75)]">
                        <div className="grid grid-cols-2 gap-1">
                          {featurePages.map((f) => (
                            <Link
                              key={f.slug}
                              to={`/features/${f.slug}`}
                              className="group flex items-start gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-2"
                            >
                              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-accent">
                                <ArrowUpRight size={14} />
                              </span>
                              <span className="min-w-0">
                                <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-fg">
                                  {l(f.title)}
                                  {f.badge === 'new' ? (
                                    <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                                      {t('common.new')}
                                    </span>
                                  ) : null}
                                </span>
                                <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug text-muted">
                                  {l(f.tagline)}
                                </span>
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => go(link.href)}
                    className="rounded-full px-3 py-2 text-[13.5px] font-medium text-muted transition-colors hover:text-fg"
                  >
                    {link.label}
                  </button>
                ),
              )}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <LanguageSwitcher compact />
              <ThemeToggle />
            </div>
            <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
              {t('common.signIn')}
            </ButtonLink>
            <ButtonLink href="/signup" variant="primary" size="sm" className="hidden sm:inline-flex">
              {t('common.signUp')}
            </ButtonLink>
            <ButtonLink href="/app" variant="primary" size="sm" className="sm:hidden">
              {t('common.getStarted')}
            </ButtonLink>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label={t('common.menu')}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg lg:hidden"
            >
              <Menu size={17} />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="animate-rise absolute inset-x-0 top-0 max-h-[92vh] overflow-y-auto rounded-b-3xl border-b border-line bg-bg-elev pb-8">
            <div className="shell flex h-16 items-center justify-between">
              <Logo />
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  aria-label={t('common.close')}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-fg"
                >
                  <X size={17} />
                </button>
              </div>
            </div>
            <div className="shell flex flex-col gap-1 pt-2">
              {links.map((link) => (
                <button
                  key={link.href}
                  type="button"
                  onClick={() => go(link.href)}
                  className="rounded-xl px-3 py-3 text-left text-[15px] font-semibold text-fg transition-colors hover:bg-surface-2"
                >
                  {link.label}
                </button>
              ))}
              <div className="mt-3 border-t border-line pt-3">
                <span className="eyebrow px-3">{t('nav.features')}</span>
                <div className="mt-2 grid gap-1">
                  {featurePages.map((f) => (
                    <Link
                      key={f.slug}
                      to={`/features/${f.slug}`}
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-[13.5px] text-muted transition-colors hover:bg-surface-2 hover:text-fg"
                    >
                      {l(f.title)}
                      <ArrowUpRight size={13} />
                    </Link>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 px-1">
                <ButtonLink href="/signup" variant="primary" size="lg" full>
                  {t('common.signUp')}
                </ButtonLink>
                <ButtonLink href="/login" variant="secondary" size="lg" full>
                  {t('common.signIn')}
                </ButtonLink>
                <div className="mt-1 flex justify-center">
                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
