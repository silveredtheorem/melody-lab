import { useEffect, useRef, useState } from 'react'
import { useAppShell } from '../components/AppShellContext'
import { useToast } from '../components/ToastProvider'
import { ApiError, apiChangePassword, apiUpdateProfile } from '../lib/api'
import { useAuthStore } from '../stores/auth.store'
import './SettingsPage.css'

// ─── Shared micro-components ──────────────────────

function Spinner() {
  return <span className="settings-spinner" aria-hidden="true" />
}

function EyeIcon({ off }: { off?: boolean }) {
  return off ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

// ─── Toggle switch ────────────────────────────────

function ToggleSwitch({ id, checked, onChange }: { id: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="toggle-switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="toggle-input"
        checked={checked}
        onChange={onChange}
      />
      <span className="toggle-track" aria-hidden="true">
        <span className="toggle-knob" />
      </span>
      <span className="sr-only">{checked ? 'on' : 'off'}</span>
    </label>
  )
}

// ─── Password field ───────────────────────────────

function PwField({
  id, label, value, onChange, show, onToggleShow, autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow: () => void
  autoComplete?: string
}) {
  return (
    <div className="settings-field">
      <label className="settings-label" htmlFor={id}>{label}</label>
      <div className="settings-input-wrap">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          className="settings-input has-toggle"
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="settings-eye-btn"
          onClick={onToggleShow}
          aria-label={show ? 'hide password' : 'show password'}
          tabIndex={-1}
        >
          <EyeIcon off={show} />
        </button>
      </div>
    </div>
  )
}

// ─── Profile section ──────────────────────────────

function ProfileSection() {
  const { toast } = useToast()
  const { user, setAuth, accessToken } = useAuthStore()
  const [name, setName] = useState(user?.name ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    try {
      const updated = await apiUpdateProfile(name.trim())
      if (accessToken) setAuth(accessToken, updated)
      toast.success('profile updated')
    } catch {
      toast.error('failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const changed = name.trim() !== (user?.name ?? '')

  return (
    <section className="settings-section" aria-labelledby="profile-heading">
      <h2 className="settings-section-heading" id="profile-heading">profile</h2>

      <div className="settings-fields">
        <div className="settings-field">
          <label className="settings-label" htmlFor="profile-name">display name</label>
          <input
            id="profile-name"
            type="text"
            className="settings-input"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="your name"
            autoComplete="name"
          />
        </div>
      </div>

      <div className="settings-actions">
        <button
          type="button"
          className="settings-btn-save"
          onClick={handleSave}
          disabled={saving || !name.trim() || !changed}
        >
          {saving ? <Spinner /> : 'save profile'}
        </button>
      </div>
    </section>
  )
}

// ─── Account section ──────────────────────────────

function AccountSection() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [show, setShow] = useState({ current: false, new: false, confirm: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!currentPw) { setError('enter your current password'); return }
    if (newPw.length < 8) { setError('new password must be at least 8 characters'); return }
    if (newPw !== confirmPw) { setError("passwords don't match"); return }
    setError('')
    setSaving(true)
    try {
      await apiChangePassword(currentPw, newPw)
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      toast.success('password updated')
    } catch (err) {
      if (err instanceof ApiError && err.body?.error === 'WRONG_PASSWORD') {
        setError('current password is incorrect')
      } else {
        setError('failed to update password')
      }
    } finally {
      setSaving(false)
    }
  }

  const anyFilled = currentPw || newPw || confirmPw

  return (
    <section className="settings-section" aria-labelledby="account-heading">
      <h2 className="settings-section-heading" id="account-heading">account</h2>

      <div className="settings-fields">
        <div className="settings-field">
          <label className="settings-label" htmlFor="account-email">email</label>
          <input
            id="account-email"
            type="email"
            className="settings-input"
            value={user?.email ?? ''}
            disabled
            readOnly
          />
          <p className="settings-field-hint">can't change this yet</p>
        </div>
      </div>

      <div className="settings-divider-subtle" />
      <p className="settings-subsection-label">change password</p>

      <div className="settings-fields">
        <PwField
          id="current-pw"
          label="current password"
          value={currentPw}
          onChange={setCurrentPw}
          show={show.current}
          onToggleShow={() => setShow(s => ({ ...s, current: !s.current }))}
          autoComplete="current-password"
        />
        <PwField
          id="new-pw"
          label="new password"
          value={newPw}
          onChange={v => { setNewPw(v); setError('') }}
          show={show.new}
          onToggleShow={() => setShow(s => ({ ...s, new: !s.new }))}
          autoComplete="new-password"
        />
        <PwField
          id="confirm-pw"
          label="confirm new password"
          value={confirmPw}
          onChange={v => { setConfirmPw(v); setError('') }}
          show={show.confirm}
          onToggleShow={() => setShow(s => ({ ...s, confirm: !s.confirm }))}
          autoComplete="new-password"
        />
      </div>

      {error && <p className="settings-error-text" role="alert">{error}</p>}

      <div className="settings-actions">
        <button
          type="button"
          className="settings-btn-save"
          onClick={handleSave}
          disabled={saving || !anyFilled}
        >
          {saving ? <Spinner /> : 'update password'}
        </button>
      </div>
    </section>
  )
}

// ─── Notifications section ────────────────────────

interface NotifPrefs {
  mrOpened: boolean
  commentAdded: boolean
  mrMerged: boolean
  collaboratorJoined: boolean
}

const NOTIF_ROWS: Array<{ key: keyof NotifPrefs; label: string; desc: string }> = [
  { key: 'mrOpened',           label: 'merge request opened',   desc: 'when someone opens a new merge request on your project' },
  { key: 'commentAdded',       label: 'comment on your commit', desc: 'when someone adds a comment to one of your commits' },
  { key: 'mrMerged',           label: 'merge request merged',   desc: 'when a merge request you created or were mentioned in is merged' },
  { key: 'collaboratorJoined', label: 'new collaborator',       desc: 'when someone accepts an invite to one of your projects' },
]

function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotifPrefs>({
    mrOpened: true,
    commentAdded: true,
    mrMerged: true,
    collaboratorJoined: false,
  })
  const [flashSaved, setFlashSaved] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(flashTimer.current), [])

  function handleToggle(key: keyof NotifPrefs) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
    clearTimeout(flashTimer.current)
    setFlashSaved(true)
    flashTimer.current = setTimeout(() => setFlashSaved(false), 2000)
  }

  return (
    <section className="settings-section" aria-labelledby="notif-heading">
      <h2 className="settings-section-heading" id="notif-heading">notifications</h2>
      <p className="settings-section-desc">we'll email you when…</p>

      <ul className="notif-list" role="list">
        {NOTIF_ROWS.map(row => (
          <li key={row.key} className="notif-row">
            <div className="notif-text">
              <span className="notif-label">{row.label}</span>
              <span className="notif-desc">{row.desc}</span>
            </div>
            <ToggleSwitch
              id={`notif-${row.key}`}
              checked={prefs[row.key]}
              onChange={() => handleToggle(row.key)}
            />
          </li>
        ))}
      </ul>

      <p
        className={`notif-saved-note${flashSaved ? ' is-visible' : ''}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {flashSaved ? 'preferences saved' : ''}
      </p>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────

export function SettingsPage() {
  const { setBreadcrumb } = useAppShell()

  useEffect(() => {
    setBreadcrumb('settings')
    return () => setBreadcrumb(null)
  }, [setBreadcrumb])

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1 className="settings-page-title">settings</h1>

        <ProfileSection />
        <AccountSection />
        <NotificationsSection />
      </div>
    </div>
  )
}
