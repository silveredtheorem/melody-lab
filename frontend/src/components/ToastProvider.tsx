import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import './ToastProvider.css'

// ─── Types ────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  exiting: boolean
}

interface ToastAPI {
  success: (message: string) => void
  error:   (message: string) => void
  info:    (message: string) => void
}

interface ToastContextValue {
  toast: ToastAPI
}

// ─── Context ──────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// ─── Duration per type ────────────────────────────

const DURATION: Record<ToastType, number> = {
  success: 4000,
  info:    4000,
  error:   7000,
}

const EXIT_MS   = 280
const MAX_TOASTS = 5

// ─── Icons ────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9" x2="9" y2="15"/>
      <line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <SuccessIcon />,
  error:   <ErrorIcon />,
  info:    <InfoIcon />,
}

// ─── Toast item component ─────────────────────────

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  return (
    <div
      className={`toast-item toast-item-${item.type}${item.exiting ? ' is-exiting' : ''}`}
    >
      <span className={`toast-icon toast-icon-${item.type}`}>{ICONS[item.type]}</span>
      <span className="toast-message">{item.message}</span>
      <button
        type="button"
        className="toast-dismiss"
        onClick={onDismiss}
        aria-label="dismiss notification"
      >
        ✕
      </button>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    // Clear auto-dismiss timer
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    // Trigger exit animation
    setToasts(ts => ts.map(t => t.id === id ? { ...t, exiting: true } : t))
    // Remove from DOM after animation
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), EXIT_MS)
  }, [])

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = nextId.current++
    setToasts(ts => {
      const next = [...ts, { id, message, type, exiting: false }]
      if (next.length > MAX_TOASTS) {
        // Evict the oldest: clear its timer and drop it immediately
        const [oldest, ...rest] = next
        clearTimeout(timers.current.get(oldest.id))
        timers.current.delete(oldest.id)
        return rest
      }
      return next
    })
    const timer = setTimeout(() => dismiss(id), DURATION[type])
    timers.current.set(id, timer)
  }, [dismiss])

  const toast = useMemo<ToastAPI>(() => ({
    success: (msg) => addToast(msg, 'success'),
    error:   (msg) => addToast(msg, 'error'),
    info:    (msg) => addToast(msg, 'info'),
  }), [addToast])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 && (
        <div
          className="toast-container"
          role="region"
          aria-label="notifications"
          aria-live="polite"
          aria-atomic="false"
        >
          {toasts.map(item => (
            <Toast key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
