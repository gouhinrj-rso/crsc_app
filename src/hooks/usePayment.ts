import { useState, useCallback } from 'react'
import { createPayment, getPayments } from '@/lib/api'
import { PAYMENT_AMOUNT } from '@/lib/constants'

interface PaymentState {
  loading: boolean
  error: string | null
  paymentComplete: boolean
}

export function usePayment(userId: string | undefined) {
  const [state, setState] = useState<PaymentState>({
    loading: false,
    error: null,
    paymentComplete: false,
  })

  const checkPaymentStatus = useCallback(async () => {
    if (!userId) return

    setState((prev) => ({ ...prev, loading: true }))

    try {
      const paymentsResult = await getPayments(userId)
      const completedPayment = paymentsResult.data?.find(
        (p) => p.status === 'completed'
      )

      setState((prev) => ({
        ...prev,
        loading: false,
        paymentComplete: !!completedPayment,
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to check payment status',
      }))
    }
  }, [userId])

  const handlePaymentSuccess = useCallback(async () => {
    if (!userId) return

    setState((prev) => ({ ...prev, loading: true }))

    try {
      await createPayment(userId, {
        amount: PAYMENT_AMOUNT,
        status: 'completed',
        paid_at: new Date().toISOString(),
      })

      setState((prev) => ({
        ...prev,
        loading: false,
        paymentComplete: true,
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Payment recording failed',
      }))
    }
  }, [userId])

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }))
  }, [])

  return {
    ...state,
    checkPaymentStatus,
    handlePaymentSuccess,
    clearError,
    amount: PAYMENT_AMOUNT,
  }
}
