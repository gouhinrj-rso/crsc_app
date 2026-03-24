import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { SESSION_TIMEOUT_MINUTES } from '@/lib/constants'

const WARNING_BEFORE_TIMEOUT_MS = 2 * 60 * 1000 // Show warning 2 minutes before timeout
const TIMEOUT_MS = SESSION_TIMEOUT_MINUTES * 60 * 1000
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const

export function useSessionTimeout() {
  const { isAuthenticated, signOut } = useAuthContext()
  const navigate = useNavigate()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showWarning, setShowWarning] = useState(false)

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningRef.current) clearTimeout(warningRef.current)
    timeoutRef.current = null
    warningRef.current = null
  }, [])

  const handleTimeout = useCallback(async () => {
    clearTimers()
    setShowWarning(false)
    await signOut()
    navigate('/login', { state: { message: 'You have been signed out due to inactivity.' } })
  }, [clearTimers, signOut, navigate])

  const resetTimers = useCallback(() => {
    clearTimers()
    setShowWarning(false)

    if (!isAuthenticated) return

    warningRef.current = setTimeout(() => {
      setShowWarning(true)
    }, TIMEOUT_MS - WARNING_BEFORE_TIMEOUT_MS)

    timeoutRef.current = setTimeout(() => {
      handleTimeout()
    }, TIMEOUT_MS)
  }, [clearTimers, isAuthenticated, handleTimeout])

  const dismissWarning = useCallback(() => {
    resetTimers()
  }, [resetTimers])

  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers()
      setShowWarning(false)
      return
    }

    resetTimers()

    const handleActivity = () => {
      if (!showWarning) {
        resetTimers()
      }
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true })
    }

    return () => {
      clearTimers()
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity)
      }
    }
  }, [isAuthenticated, clearTimers, resetTimers, showWarning])

  return { showWarning, dismissWarning, remainingMinutes: 2 }
}
