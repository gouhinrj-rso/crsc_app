import { useState, useEffect, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { createUserProfile, createAuditLog, getUserProfile } from '@/lib/api'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: string | null
  isAdmin: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
    isAdmin: false,
  })

  // Function to check admin status (non-blocking)
  const checkAdminStatus = useCallback(async (userId: string) => {
    try {
      const result = await getUserProfile(userId)
      if (result.data) {
        setState((prev) => ({
          ...prev,
          isAdmin: result.data?.is_admin ?? false,
        }))
      }
    } catch (err) {
      console.error('Failed to check admin status:', err)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!isMounted) return

        setState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
          error: error?.message ?? null,
        }))

        // Check admin status in background (non-blocking)
        if (session?.user) {
          checkAdminStatus(session.user.id)
        }
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to get session:', err)
        setState((prev) => ({
          ...prev,
          loading: false,
          error: 'Failed to initialize authentication',
        }))
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return

        setState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          loading: false,
        }))

        // Handle events in background (non-blocking)
        if (event === 'SIGNED_IN' && session?.user) {
          createUserProfile(session.user.id, session.user.email!).catch(console.error)
          createAuditLog(session.user.id, 'sign_in', 'auth').catch(console.error)
          checkAdminStatus(session.user.id)
        }

        if (event === 'SIGNED_OUT') {
          createAuditLog(null, 'sign_out', 'auth').catch(console.error)
          setState((prev) => ({
            ...prev,
            isAdmin: false,
          }))
        }
      }
    )

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [checkAdminStatus])

  const signUp = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    setState((prev) => ({ ...prev, loading: false }))
    return { success: true, user: data.user }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    setState((prev) => ({ ...prev, loading: false }))
    return { success: true, user: data.user }
  }, [])

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const { error } = await supabase.auth.signOut()

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    setState((prev) => ({ ...prev, loading: false, user: null, session: null }))
    return { success: true }
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    setState((prev) => ({ ...prev, loading: false }))
    return { success: true }
  }, [])

  const updatePassword = useCallback(async (newPassword: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setState((prev) => ({ ...prev, loading: false, error: error.message }))
      return { success: false, error: error.message }
    }

    setState((prev) => ({ ...prev, loading: false }))
    return { success: true }
  }, [])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  // MFA - Enroll TOTP
  const enrollMfa = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'CRSC Authenticator',
      })
      if (error) return { success: false, error: error.message }
      return {
        success: true,
        data: {
          id: data.id,
          qrCode: data.totp.qr_code,
          secret: data.totp.secret,
          uri: data.totp.uri,
        },
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'MFA enrollment failed' }
    }
  }, [])

  // MFA - Verify TOTP during enrollment
  const verifyMfa = useCallback(async (factorId: string, code: string) => {
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      })
      if (challengeError) return { success: false, error: challengeError.message }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code,
      })
      if (verifyError) return { success: false, error: verifyError.message }

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'MFA verification failed' }
    }
  }, [])

  // MFA - Unenroll
  const unenrollMfa = useCallback(async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) return { success: false, error: error.message }
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'MFA unenrollment failed' }
    }
  }, [])

  // MFA - List factors
  const listMfaFactors = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) return { success: false, error: error.message, factors: [] }
      return { success: true, factors: data.totp || [] }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to list MFA factors', factors: [] }
    }
  }, [])

  return {
    ...state,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    clearError,
    enrollMfa,
    verifyMfa,
    unenrollMfa,
    listMfaFactors,
    isAuthenticated: !!state.user,
  }
}
