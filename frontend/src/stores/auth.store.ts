import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
}

interface AuthState {
  accessToken: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (token: string, user: User) => void
  clearAuth: () => void
  setLoading: (v: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: true,
      setAuth: (token, user) =>
        set({ accessToken: token, user, isAuthenticated: true, isLoading: false }),
      clearAuth: () =>
        set({ accessToken: null, user: null, isAuthenticated: false, isLoading: false }),
      setLoading: (v) => set({ isLoading: v }),
    }),
    {
      name: 'melody-lab-auth',
      // only persist auth data — isLoading always starts fresh as true
      partialize: (s) => ({
        accessToken: s.accessToken,
        user: s.user,
        isAuthenticated: s.isAuthenticated,
      }),
    },
  ),
)
