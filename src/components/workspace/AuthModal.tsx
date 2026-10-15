import { useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { logIn, resetPassword, signUp, type SessionUser } from '@/lib/auth'

export function AuthModal({ open, onClose, onAuthed }: { open: boolean; onClose: () => void; onAuthed: (u: SessionUser) => void }) {
  const { t } = useI18n()
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [codes, setCodes] = useState<string[] | null>(null)
  const [code, setCode] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const submit = async () => {
    setBusy(true)
    setError(null)
    const result: { user?: SessionUser; recoveryCodes?: string[]; ok?: boolean; error?: string } =
      mode === 'login' ? await logIn(email, password)
      : mode === 'signup' ? await signUp(email, password)
      : await resetPassword(email, code, password)
    if (mode === 'reset') {
      setBusy(false)
      if (result.ok) {
        setMode('login')
        setError(null)
      } else {
        const key = result.error === 'rate limited' ? 'app.authRateLimited' : result.error === 'invalid email or recovery code' ? 'app.authErrCode' : 'app.authErrUnknown'
        setError(t(key))
      }
      return
    }
    setBusy(false)
    if (result.user) {
      if (mode === 'signup' && result.recoveryCodes?.length) {
        setCodes(result.recoveryCodes)
        onAuthed(result.user)
        return
      }
      onAuthed(result.user)
      onClose()
    } else {
      const key =
        result.error === 'network' ? 'app.authNetwork'
        : result.error === 'invalid email' ? 'app.authErrEmail'
        : result.error === 'password must be at least 8 characters' ? 'app.authErrPass'
        : result.error === 'email already registered' ? 'app.authErrExists'
        : result.error === 'wrong email or password' ? 'app.authErrCreds'
        : result.error === 'rate limited' ? 'app.authRateLimited'
        : result.error === 'invalid email or recovery code' ? 'app.authErrCode'
        : 'app.authErrUnknown'
      setError(t(key))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-bg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-fg">{mode === 'login' ? t('app.signIn') : t('app.signUp')}</h2>
          <button className="rounded-lg border border-line p-1.5 text-muted hover:text-fg" onClick={onClose} aria-label="close">
            <X size={14} />
          </button>
        </div>
        {codes ? (
          <div>
            <p className="mb-2 text-[12px] font-semibold text-fg">{t('app.authCodesTitle')}</p>
            <div className="mb-2 flex flex-col gap-1 rounded-xl border border-line bg-surface/60 p-3 font-mono text-[12px] text-cyan">
              {codes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <p className="mb-3 text-[10.5px] leading-snug text-faint">{t('app.authCodesHint')}</p>
            <button
              onClick={() => {
                setCodes(null)
                onClose()
              }}
              className="w-full rounded-full bg-accent px-4 py-2 text-[12.5px] font-semibold text-black hover:opacity-90"
            >
              {t('app.authCodesSaved')}
            </button>
          </div>
        ) : (
        <>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null) }}
              className={
                'rounded-xl border px-3 py-2 text-[12px] font-semibold transition-colors ' +
                (mode === m ? 'border-accent/60 bg-accent/10 text-fg' : 'border-line bg-surface/50 text-muted hover:text-fg')
              }
            >
              {m === 'login' ? t('app.signIn') : t('app.signUp')}
            </button>
          ))}
        </div>
        <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('app.authEmail')}</label>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[12.5px] text-fg outline-none focus:border-accent"
        />
        <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('app.authPassword')}</label>
        <input
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !busy && submit()}
          className="mb-3 w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-[12.5px] text-fg outline-none focus:border-accent"
        />
        {error && <p className="mb-2 text-[11.5px] text-red-400">{error}</p>}
        {mode === 'reset' && (
          <>
            <label className="mb-1 block text-[11.5px] font-semibold text-muted">{t('app.authCode')}</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="abcd-ef01-2345"
              className="mb-3 w-full rounded-lg border border-line bg-surface px-2.5 py-2 font-mono text-[12.5px] text-fg outline-none focus:border-accent"
            />
          </>
        )}
        <button
          onClick={submit}
          disabled={busy || !email || password.length < 8 || (mode === 'reset' && !code)}
          className="w-full rounded-full bg-accent px-4 py-2 text-[12.5px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {mode === 'login' ? t('app.authSubmitLogin') : mode === 'signup' ? t('app.authSubmitSignup') : t('app.authSubmitReset')}
        </button>
        <button
          type="button"
          className="mt-2 w-full text-left text-[11px] text-cyan hover:underline"
          onClick={() => {
            setMode(mode === 'reset' ? 'login' : 'reset')
            setError(null)
          }}
        >
          {mode === 'reset' ? t('app.authBackToLogin') : t('app.authForgot')}
        </button>
        <p className="mt-3 text-[10.5px] leading-snug text-faint">{t('app.authNote')}</p>
        </>
        )}
      </div>
    </div>
  )
}
