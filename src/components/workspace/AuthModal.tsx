import { useState } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '@/i18n'
import { logIn, signUp, type SessionUser } from '@/lib/auth'

export function AuthModal({ open, onClose, onAuthed }: { open: boolean; onClose: () => void; onAuthed: (u: SessionUser) => void }) {
  const { t } = useI18n()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const submit = async () => {
    setBusy(true)
    setError(null)
    const result = mode === 'login' ? await logIn(email, password) : await signUp(email, password)
    setBusy(false)
    if (result.user) {
      onAuthed(result.user)
      onClose()
    } else {
      const key =
        result.error === 'network' ? 'app.authNetwork'
        : result.error === 'invalid email' ? 'app.authErrEmail'
        : result.error === 'password must be at least 8 characters' ? 'app.authErrPass'
        : result.error === 'email already registered' ? 'app.authErrExists'
        : result.error === 'wrong email or password' ? 'app.authErrCreds'
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
        <button
          onClick={submit}
          disabled={busy || !email || password.length < 8}
          className="w-full rounded-full bg-accent px-4 py-2 text-[12.5px] font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {mode === 'login' ? t('app.authSubmitLogin') : t('app.authSubmitSignup')}
        </button>
        <p className="mt-3 text-[10.5px] leading-snug text-faint">{t('app.authNote')}</p>
      </div>
    </div>
  )
}
