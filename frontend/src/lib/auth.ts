import { createContext, useContext } from 'react'
import type { AuthUser } from './api'

export interface AuthContextType {
  user: AuthUser | null
  isLoading: boolean
  login(email: string, password: string): Promise<void>
  register(email: string, password: string, name: string): Promise<void>
  logout(): Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
