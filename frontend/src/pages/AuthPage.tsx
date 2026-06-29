import { useState, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, apiLogin, apiRegister } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import './AuthPage.css'

type Mode = 'login' | 'signup' | 'forgot' | 'forgot-success'

interface Errors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
  form?: string
}

// ─── Validation ──────────────────────────────────────

function emailErr(v: string): string | undefined {
  if (!v.trim()) return 'email is required'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'check your email format'
}

function validateLogin(email: string, password: string): Errors {
  const e: Errors = {}
  const ee = emailErr(email)
  if (ee) e.email = ee
  if (!password) e.password = 'password is required'
  return e
}

function validateSignup(
  name: string,
  email: string,
  password: string,
  confirm: string,
): Errors {
  const e: Errors = {}
  if (!name.trim()) e.name = 'what should we call you?'
  const ee = emailErr(email)
  if (ee) e.email = ee
  if (!password) e.password = 'password is required'
  else if (password.length < 8) e.password = 'at least 8 characters'
  if (!confirm) e.confirmPassword = 'please confirm your password'
  else if (password !== confirm) e.confirmPassword = "passwords don't match"
  return e
}

// ─── Icons ───────────────────────────────────────────

function LogoMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="0"     y="8" width="3" height="12" rx="1.5" fill="currentColor" fillOpacity="0.45" />
      <rect x="4.25"  y="4" width="3" height="16" rx="1.5" fill="currentColor" fillOpacity="0.70" />
      <rect x="8.5"   y="0" width="3" height="20" rx="1.5" fill="currentColor" />
      <rect x="12.75" y="3" width="3" height="17" rx="1.5" fill="currentColor" fillOpacity="0.70" />
      <rect x="17"    y="8" width="3" height="12" rx="1.5" fill="currentColor" fillOpacity="0.45" />
    </svg>
  )
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ─── Wave Background ─────────────────────────────────

function WaveBg() {
  return (
    <div className="wave-bg" aria-hidden="true">
      <svg
        viewBox="0 0 2880 800"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="wave-svg"
      >
        <path
          d="M0 400 C360 340 1080 460 1440 400 C1800 340 2520 460 2880 400"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          opacity="0.06"
        />
        <path
          d="M0 200 C480 155 960 245 1440 200 C1920 155 2400 245 2880 200"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.04"
        />
        <path
          d="M0 630 C360 605 1080 655 1440 630 C1800 605 2520 655 2880 630"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.03"
        />
      </svg>
    </div>
  )
}

// ─── Field ────────────────────────────────────────────

interface FieldProps {
  id: string
  label: string
  type?: string
  value: string
  onChange: (v: string) => void
  error?: string
  placeholder?: string
  disabled?: boolean
  autoComplete?: string
  showToggle?: boolean
  showValue?: boolean
  onToggleShow?: () => void
}

function Field({
  id, label, type = 'text', value, onChange, error,
  placeholder, disabled, autoComplete,
  showToggle, showValue, onToggleShow,
}: FieldProps) {
  const errorId = `${id}-error`
  const inputType = showToggle ? (showValue ? 'text' : 'password') : type

  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">{label}</label>
      <div className="auth-input-wrap">
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className={[
            'auth-input',
            showToggle ? 'has-toggle' : '',
            error ? 'has-error' : '',
          ].filter(Boolean).join(' ')}
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? 'true' : undefined}
        />
        {showToggle && (
          <button
            type="button"
            className="auth-eye-btn"
            onClick={onToggleShow}
            aria-label={showValue ? 'hide password' : 'show password'}
            tabIndex={-1}
          >
            <EyeIcon open={!!showValue} />
          </button>
        )}
      </div>
      {error && (
        <span id={errorId} className="auth-error-text" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

// ─── Login ────────────────────────────────────────────

interface LoginProps {
  email: string; onEmail: (v: string) => void
  password: string; onPassword: (v: string) => void
  showPw: boolean; onTogglePw: () => void
  errors: Errors; loading: boolean
  onSubmit: (e: React.FormEvent) => void
  onForgot: () => void; onSignup: () => void
  emailId: string; passwordId: string
}

function LoginForm({
  email, onEmail, password, onPassword,
  showPw, onTogglePw, errors, loading,
  onSubmit, onForgot, onSignup,
  emailId, passwordId,
}: LoginProps) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <h1 className="auth-heading">welcome back</h1>
      <div className="auth-fields">
        <Field
          id={emailId} label="email address" type="email"
          value={email} onChange={onEmail} error={errors.email}
          placeholder="you@band.com" disabled={loading} autoComplete="email"
        />
        <Field
          id={passwordId} label="password"
          value={password} onChange={onPassword} error={errors.password}
          placeholder="••••••••" disabled={loading} autoComplete="current-password"
          showToggle showValue={showPw} onToggleShow={onTogglePw}
        />
      </div>
      {errors.form && <p className="auth-form-error" role="alert">{errors.form}</p>}
      <button type="submit" className="auth-btn-primary" disabled={loading}>
        {loading
          ? <><span className="auth-spinner" /><span className="sr-only">signing in…</span></>
          : 'sign in'}
      </button>
      <div className="auth-links">
        <button type="button" className="auth-link" onClick={onForgot} disabled={loading}>
          forgot password?
        </button>
        <span className="auth-link-dot" aria-hidden="true" />
        <button type="button" className="auth-link is-accent" onClick={onSignup} disabled={loading}>
          create account
        </button>
      </div>
    </form>
  )
}

// ─── Signup ───────────────────────────────────────────

interface SignupProps {
  name: string; onName: (v: string) => void
  email: string; onEmail: (v: string) => void
  password: string; onPassword: (v: string) => void
  confirm: string; onConfirm: (v: string) => void
  showPw: boolean; onTogglePw: () => void
  showConfirm: boolean; onToggleConfirm: () => void
  errors: Errors; loading: boolean
  onSubmit: (e: React.FormEvent) => void
  onLogin: () => void
  nameId: string; emailId: string; passwordId: string; confirmId: string
}

function SignupForm({
  name, onName, email, onEmail,
  password, onPassword, confirm, onConfirm,
  showPw, onTogglePw, showConfirm, onToggleConfirm,
  errors, loading, onSubmit, onLogin,
  nameId, emailId, passwordId, confirmId,
}: SignupProps) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <h1 className="auth-heading">join the band</h1>
      <div className="auth-fields">
        <Field
          id={nameId} label="your name"
          value={name} onChange={onName} error={errors.name}
          placeholder="alex" disabled={loading} autoComplete="name"
        />
        <Field
          id={emailId} label="email address" type="email"
          value={email} onChange={onEmail} error={errors.email}
          placeholder="you@band.com" disabled={loading} autoComplete="email"
        />
        <Field
          id={passwordId} label="password"
          value={password} onChange={onPassword} error={errors.password}
          placeholder="at least 8 characters" disabled={loading} autoComplete="new-password"
          showToggle showValue={showPw} onToggleShow={onTogglePw}
        />
        <Field
          id={confirmId} label="confirm password"
          value={confirm} onChange={onConfirm} error={errors.confirmPassword}
          placeholder="••••••••" disabled={loading} autoComplete="new-password"
          showToggle showValue={showConfirm} onToggleShow={onToggleConfirm}
        />
      </div>
      {errors.form && <p className="auth-form-error" role="alert">{errors.form}</p>}
      <button type="submit" className="auth-btn-primary" disabled={loading}>
        {loading
          ? <><span className="auth-spinner" /><span className="sr-only">creating account…</span></>
          : 'create account'}
      </button>
      <div className="auth-links">
        <span className="auth-link-text">already have one?</span>
        <button type="button" className="auth-link is-accent" onClick={onLogin} disabled={loading}>
          sign in
        </button>
      </div>
    </form>
  )
}

// ─── Forgot Password ──────────────────────────────────

interface ForgotProps {
  email: string; onEmail: (v: string) => void
  errors: Errors; loading: boolean
  onSubmit: (e: React.FormEvent) => void
  onBack: () => void
  emailId: string
}

function ForgotForm({ email, onEmail, errors, loading, onSubmit, onBack, emailId }: ForgotProps) {
  return (
    <form className="auth-form" onSubmit={onSubmit} noValidate>
      <h1 className="auth-heading">reset your password</h1>
      <div className="auth-fields">
        <Field
          id={emailId} label="email address" type="email"
          value={email} onChange={onEmail} error={errors.email}
          placeholder="you@band.com" disabled={loading} autoComplete="email"
        />
      </div>
      {errors.form && <p className="auth-form-error" role="alert">{errors.form}</p>}
      <button type="submit" className="auth-btn-primary" disabled={loading}>
        {loading
          ? <><span className="auth-spinner" /><span className="sr-only">sending…</span></>
          : 'send reset link'}
      </button>
      <button type="button" className="auth-back" onClick={onBack} disabled={loading}>
        <ArrowLeftIcon />
        back to sign in
      </button>
    </form>
  )
}

// ─── Forgot Success ───────────────────────────────────

function ForgotSuccess({ email, onBack }: { email: string; onBack: () => void }) {
  return (
    <div className="auth-success">
      <div className="auth-success-icon">
        <CheckIcon />
      </div>
      <p className="auth-success-title">check your email</p>
      <p className="auth-success-body">
        we sent a reset link to{' '}
        <span className="auth-success-email">{email}</span>
      </p>
      <button type="button" className="auth-back" onClick={onBack}>
        <ArrowLeftIcon />
        back to sign in
      </button>
    </div>
  )
}

// ─── AuthPage ─────────────────────────────────────────

export function AuthPage() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [forgotEmail, setForgotEmail] = useState('')
  const [successEmail, setSuccessEmail] = useState('')

  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const nameId      = useId()
  const emailId     = useId()
  const passwordId  = useId()
  const confirmId   = useId()
  const forgotId    = useId()

  function clearErr(field: keyof Errors) {
    setErrors(prev => {
      if (!prev[field]) return prev
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function go(next: Mode) {
    setErrors({})
    setShowPw(false)
    setShowConfirm(false)
    setMode(next)
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateLogin(email, password)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setErrors({})
    try {
      const data = await apiLogin(email, password)
      setAuth(data.accessToken, data.user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 401
        ? 'wrong email or password'
        : 'something went wrong — try again'
      setErrors({ form: msg })
    } finally {
      setLoading(false)
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    const errs = validateSignup(name, email, password, confirm)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    setErrors({})
    try {
      const data = await apiRegister(email, password, name)
      setAuth(data.accessToken, data.user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err instanceof ApiError && err.status === 409
        ? "that email's already taken"
        : 'something went wrong — try again'
      setErrors({ form: msg })
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    const ee = emailErr(forgotEmail)
    if (ee) { setErrors({ email: ee }); return }
    setLoading(true)
    setErrors({})
    try {
      // TODO: call POST /auth/forgot-password
      await new Promise(r => setTimeout(r, 1000))
      setSuccessEmail(forgotEmail)
      setMode('forgot-success')
    } catch {
      setErrors({ form: "couldn't send the reset link — try again" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-root">
      <WaveBg />

      <div className="auth-center">
        <header className="auth-header">
          <div className="auth-logo">
            <LogoMark />
            <span className="auth-wordmark">melody lab</span>
          </div>
          <p className="auth-tagline">version control for music.</p>
        </header>

        <main className="auth-form-container">
          <div className="auth-form-panel" key={mode}>
            {mode === 'login' && (
              <LoginForm
                email={email} onEmail={v => { setEmail(v); clearErr('email') }}
                password={password} onPassword={v => { setPassword(v); clearErr('password') }}
                showPw={showPw} onTogglePw={() => setShowPw(s => !s)}
                errors={errors} loading={loading}
                onSubmit={handleLogin}
                onForgot={() => go('forgot')}
                onSignup={() => go('signup')}
                emailId={emailId} passwordId={passwordId}
              />
            )}

            {mode === 'signup' && (
              <SignupForm
                name={name} onName={v => { setName(v); clearErr('name') }}
                email={email} onEmail={v => { setEmail(v); clearErr('email') }}
                password={password} onPassword={v => { setPassword(v); clearErr('password') }}
                confirm={confirm} onConfirm={v => { setConfirm(v); clearErr('confirmPassword') }}
                showPw={showPw} onTogglePw={() => setShowPw(s => !s)}
                showConfirm={showConfirm} onToggleConfirm={() => setShowConfirm(s => !s)}
                errors={errors} loading={loading}
                onSubmit={handleSignup}
                onLogin={() => go('login')}
                nameId={nameId} emailId={emailId}
                passwordId={passwordId} confirmId={confirmId}
              />
            )}

            {mode === 'forgot' && (
              <ForgotForm
                email={forgotEmail}
                onEmail={v => { setForgotEmail(v); clearErr('email') }}
                errors={errors} loading={loading}
                onSubmit={handleForgot}
                onBack={() => go('login')}
                emailId={forgotId}
              />
            )}

            {mode === 'forgot-success' && (
              <ForgotSuccess
                email={successEmail}
                onBack={() => go('login')}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
