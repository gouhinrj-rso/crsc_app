import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { User, Session } from '@supabase/supabase-js'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  isAdmin: boolean
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User | null }>
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User | null }>
  signOut: () => Promise<{ success: boolean; error?: string }>
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>
  clearError: () => void
  enrollMfa: () => Promise<{ success: boolean; error?: string; data?: { id: string; qrCode: string; secret: string; uri: string } }>
  verifyMfa: (factorId: string, code: string) => Promise<{ success: boolean; error?: string }>
  unenrollMfa: (factorId: string) => Promise<{ success: boolean; error?: string }>
  listMfaFactors: () => Promise<{ success: boolean; error?: string; factors: Array<{ id: string; friendly_name?: string; factor_type: string; status: string }> }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}
