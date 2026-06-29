import { useEffect } from 'react'
import { apiGetMe, apiRefresh } from './api'
import { useAuthStore } from '../stores/auth.store'

/**
 * Runs once on app mount to restore the session from the httpOnly refresh-token
 * cookie. On success it populates the store with a fresh access token + user.
 * On failure it clears the store so ProtectedRoute redirects to /auth.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setAuth, clearAuth } = useAuthStore()

  useEffect(() => {
    let cancelled = false
    apiRefresh()
      .then(async (token) => {
        if (cancelled) return
        if (!token) { clearAuth(); return }
        const me = await apiGetMe()
        if (!cancelled) setAuth(token, me)
      })
      .catch(() => { if (!cancelled) clearAuth() })
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>
}
