import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Github, Mail } from 'lucide-react'
import { useI18n } from '@/i18n'
import { Logo } from '@/components/Logo'
import { Mockup } from '@/components/ui/Mockups'
import { ThemeToggle } from '@/components/layout/ThemeToggle'
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'
import { cn } from '@/lib/cn'

export default function Auth({ mode }: { mode: 'login' | 'signup' }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const signup = mode === 'signup'
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const next: Record<string, string> = {}
    if (signup && form.name.trim().length < 2) next.name = t('auth.nameRequired')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = t('auth.emailRequired')
    if (form.password.length < 8) next.password = t('auth.passwordRequired')
    setErrors(next)
    if (Object.keys(next).length) return
    setBusy(true)
    window.setTimeout(() => navigate('/app'), 650)
  }

  const field = (
    id: 'name' | 'email' | 'password',
    label: string,
    type: string,
    autoComplete: string,
    placeholder?: string,
  ) => (
    <label htmlFor={id} className="block">
      <span className="text-[12.5px] font-semibold text-muted">{label}</span>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={form[id]}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
        className={cn(
          'mt-1.5 h-11 w-full rounded-xl border bg-surface px-3.5 text-[14px] text-fg outline-none transition-colors placeholder:text-faint',
          errors[id] ? 'border-danger/60' : 'border-line focus:border-accent/55',
        )}
      />
      {errors[id] ? <span className="mt-1 block text-[11.5px] text-danger">{errors[id]}</span> : null}
    </label>
  )

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative flex flex-col justify-center px-5 py-12 sm:px-10">
        <div className="absolute right-5 top-5 flex items-center gap-2">
          <LanguageSwitcher compact />
          <ThemeToggle className="h-8 w-8" />
        </div>

        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="inline-flex transition-opacity hover:opacity-80">
            <Logo />
          </Link>

          <h1 className="h-display mt-8 text-[clamp(1.7rem,4vw,2.3rem)] text-fg">
            {signup ? t('auth.signUpTitle') : t('auth.signInTitle')}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-muted">
            {signup ? t('auth.signUpSubtitle') : t('auth.signInSubtitle')}
          </p>

          <form onSubmit={submit} className="mt-7 flex flex-col gap-4" noValidate>
            {signup ? field('name', t('auth.name'), 'text', 'name', 'Ada Lovelace') : null}
            {field('email', t('auth.email'), 'email', 'email', 'you@company.com')}
            {field('password', t('auth.password'), 'password', signup ? 'new-password' : 'current-password', '••••••••')}

            <button
              type="submit"
              disabled={busy}
              className="mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent text-[14.5px] font-bold text-accent-ink transition-all hover:bg-accent-strong disabled:opacity-60"
            >
              {busy ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-ink/30 border-t-accent-ink" />
              ) : (
                <Mail size={16} />
              )}
              {signup ? t('auth.signUpCta') : t('auth.signInCta')}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[11.5px] uppercase tracking-[0.12em] text-faint">{t('auth.or')}</span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {['Google', 'GitHub'].map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => navigate('/app')}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface text-[13.5px] font-semibold text-fg transition-colors hover:border-line-strong hover:bg-surface-2"
              >
                {provider === 'GitHub' ? <Github size={15} /> : <span className="text-[15px] font-bold">G</span>}
                {provider}
              </button>
            ))}
          </div>

          {!signup ? (
            <Link
              to="/signup"
              className="mt-5 block text-center text-[12.5px] text-muted transition-colors hover:text-accent"
            >
              {t('auth.forgot')}
            </Link>
          ) : null}

          <p className="mt-6 text-center text-[13px] text-muted">
            {signup ? t('auth.haveAccount') : t('auth.noAccount')}{' '}
            <Link to={signup ? '/login' : '/signup'} className="font-semibold text-accent hover:underline">
              {signup ? t('auth.signInCta') : t('auth.signUpCta')}
            </Link>
          </p>

          <p className="mt-8 rounded-xl border border-line bg-surface/50 p-3 text-center text-[11.5px] leading-snug text-faint">
            {t('auth.demoNote')}
          </p>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-faint/70">{t('auth.terms')}</p>
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-l border-line bg-bg-elev lg:block">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-50" />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 50% at 70% 20%, color-mix(in srgb, var(--accent) 14%, transparent), transparent 70%)',
          }}
        />
        <div className="relative flex h-full flex-col justify-center gap-6 p-12">
          <p className="max-w-md text-[clamp(1.3rem,2.4vw,1.9rem)] font-extrabold leading-snug tracking-[-0.03em] text-fg">
            {t('common.tagline')}
          </p>
          <div className="max-w-lg">
            <Mockup kind="fleet" />
          </div>
          <div className="max-w-lg">
            <Mockup kind="site" animate={false} />
          </div>
        </div>
      </div>
    </div>
  )
}
