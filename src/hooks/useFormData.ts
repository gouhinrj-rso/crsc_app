import { useState, useEffect, useCallback } from 'react'
import {
  getPersonalInfo,
  upsertPersonalInfo,
  getMilitaryService,
  upsertMilitaryService,
  getVADisabilityInfo,
  upsertVADisabilityInfo,
  getDisabilityClaims,
  createDisabilityClaim,
  updateDisabilityClaim,
  deleteDisabilityClaim,
  getDocuments,
  createDocument,
  uploadDocument,
  deleteDocument,
  getPacketStatus,
  updatePacketStep,
  resetPacketStatus,
} from '@/lib/api'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']

interface FormDataState {
  personalInfo: Tables['personal_information']['Row'] | null
  militaryService: Tables['military_service']['Row'] | null
  vaDisabilityInfo: Tables['va_disability_info']['Row'] | null
  disabilityClaims: Tables['disability_claims']['Row'][]
  documents: Tables['documents']['Row'][]
  packetStatus: Tables['packet_status']['Row'][]
  loading: boolean
  error: string | null
}

export function useFormData(userId: string | undefined) {
  const [state, setState] = useState<FormDataState>({
    personalInfo: null,
    militaryService: null,
    vaDisabilityInfo: null,
    disabilityClaims: [],
    documents: [],
    packetStatus: [],
    loading: true,
    error: null,
  })

  const loadAllData = useCallback(async () => {
    if (!userId) {
      setState((prev) => ({ ...prev, loading: false }))
      return
    }

    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const [
        personalInfoResult,
        militaryServiceResult,
        vaDisabilityResult,
        claimsResult,
        documentsResult,
        statusResult,
      ] = await Promise.all([
        getPersonalInfo(userId),
        getMilitaryService(userId),
        getVADisabilityInfo(userId),
        getDisabilityClaims(userId),
        getDocuments(userId),
        getPacketStatus(userId),
      ])

      setState({
        personalInfo: personalInfoResult.data,
        militaryService: militaryServiceResult.data,
        vaDisabilityInfo: vaDisabilityResult.data,
        disabilityClaims: claimsResult.data || [],
        documents: documentsResult.data || [],
        packetStatus: statusResult.data || [],
        loading: false,
        error: null,
      })
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load data',
      }))
    }
  }, [userId])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Personal Info
  const savePersonalInfo = useCallback(
    async (data: Omit<Tables['personal_information']['Insert'], 'user_id'>) => {
      if (!userId) return { success: false, error: 'Not authenticated' }

      const result = await upsertPersonalInfo(userId, data)
      if (result.error) {
        return { success: false, error: result.error }
      }

      setState((prev) => ({ ...prev, personalInfo: result.data }))
      return { success: true, data: result.data }
    },
    [userId]
  )

  // Military Service
  const saveMilitaryService = useCallback(
    async (data: Omit<Tables['military_service']['Insert'], 'user_id'>) => {
      if (!userId) return { success: false, error: 'Not authenticated' }

      const result = await upsertMilitaryService(userId, data)
      if (result.error) {
        return { success: false, error: result.error }
      }

      setState((prev) => ({ ...prev, militaryService: result.data }))
      return { success: true, data: result.data }
    },
    [userId]
  )

  // VA Disability Info
  const saveVADisabilityInfo = useCallback(
    async (data: Omit<Tables['va_disability_info']['Insert'], 'user_id'>) => {
      if (!userId) return { success: false, error: 'Not authenticated' }

      const result = await upsertVADisabilityInfo(userId, data)
      if (result.error) {
        return { success: false, error: result.error }
      }

      setState((prev) => ({ ...prev, vaDisabilityInfo: result.data }))
      return { success: true, data: result.data }
    },
    [userId]
  )

  // Disability Claims
  const addDisabilityClaim = useCallback(
    async (data: Omit<Tables['disability_claims']['Insert'], 'user_id'>) => {
      if (!userId) return { success: false, error: 'Not authenticated' }

      const result = await createDisabilityClaim(userId, data)
      if (result.error) {
        return { success: false, error: result.error }
      }

      setState((prev) => ({
        ...prev,
        disabilityClaims: [...prev.disabilityClaims, result.data!],
      }))
      return { success: true, data: result.data }
    },
    [userId]
  )

  const editDisabilityClaim = useCallback(
    async (claimId: string, data: Tables['disability_claims']['Update']) => {
      const result = await updateDisabilityClaim(claimId, data)
      if (result.error) {
        return { success: false, error: result.error }
      }

      setState((prev) => ({
        ...prev,
        disabilityClaims: prev.disabilityClaims.map((claim) =>
          claim.id === claimId ? result.data! : claim
        ),
      }))
      return { success: true, data: result.data }
    },
    []
  )

  const removeDisabilityClaim = useCallback(async (claimId: string) => {
    const result = await deleteDisabilityClaim(claimId)
    if (result.error) {
      return { success: false, error: result.error }
    }

    setState((prev) => ({
      ...prev,
      disabilityClaims: prev.disabilityClaims.filter((claim) => claim.id !== claimId),
    }))
    return { success: true }
  }, [])

  // Documents
  const addDocument = useCallback(
    async (data: Omit<Tables['documents']['Insert'], 'user_id'>) => {
      if (!userId) return { success: false, error: 'Not authenticated' }

      const result = await createDocument(userId, data)
      if (result.error) {
        return { success: false, error: result.error }
      }

      setState((prev) => ({
        ...prev,
        documents: [result.data!, ...prev.documents],
      }))
      return { success: true, data: result.data }
    },
    [userId]
  )

  // Upload document with file data to Supabase Storage
  const uploadAndAddDocument = useCallback(
    async (file: File, documentType: string) => {
      if (!userId) return { success: false, error: 'Not authenticated' }

      const result = await uploadDocument(userId, file, documentType)
      if (result.error) {
        return { success: false, error: result.error }
      }

      setState((prev) => ({
        ...prev,
        documents: [result.data!, ...prev.documents],
      }))
      return { success: true, data: result.data }
    },
    [userId]
  )

  const removeDocument = useCallback(async (docId: string) => {
    const result = await deleteDocument(docId)
    if (result.error) {
      return { success: false, error: result.error }
    }

    setState((prev) => ({
      ...prev,
      documents: prev.documents.filter((doc) => doc.id !== docId),
    }))
    return { success: true }
  }, [])

  // Packet Status
  const setStepStatus = useCallback(
    async (stepName: string, status: string) => {
      if (!userId) return { success: false, error: 'Not authenticated' }

      const result = await updatePacketStep(userId, stepName, status)
      if (result.error) {
        return { success: false, error: result.error }
      }

      setState((prev) => {
        const existingIndex = prev.packetStatus.findIndex(
          (s) => s.step_name === stepName
        )
        if (existingIndex >= 0) {
          const newStatus = [...prev.packetStatus]
          newStatus[existingIndex] = result.data!
          return { ...prev, packetStatus: newStatus }
        }
        return { ...prev, packetStatus: [...prev.packetStatus, result.data!] }
      })
      return { success: true, data: result.data }
    },
    [userId]
  )

  // Reset all progress (packet status)
  const resetProgress = useCallback(async () => {
    if (!userId) return { success: false, error: 'Not authenticated' }

    const result = await resetPacketStatus(userId)
    if (result.error) {
      return { success: false, error: result.error }
    }

    setState((prev) => ({ ...prev, packetStatus: [] }))
    return { success: true }
  }, [userId])

  // Calculate progress
  const calculateProgress = useCallback(() => {
    const steps = [
      'eligibility',
      'personal_info',
      'military_service',
      'va_disability',
      'disability_claims',
      'documents',
      'review',
      'payment',
    ]

    const completedSteps = state.packetStatus.filter(
      (s) => s.step_status === 'completed'
    ).length

    return {
      completedSteps,
      totalSteps: steps.length,
      percentage: Math.round((completedSteps / steps.length) * 100),
    }
  }, [state.packetStatus])

  // Check if section is complete
  const isSectionComplete = useCallback(
    (section: string): boolean => {
      switch (section) {
        case 'personal_info':
          return !!(
            state.personalInfo?.first_name &&
            state.personalInfo?.last_name &&
            state.personalInfo?.email &&
            state.personalInfo?.ssn_encrypted
          )
        case 'military_service':
          return !!(
            state.militaryService?.branch &&
            state.militaryService?.retired_rank &&
            state.militaryService?.retirement_date
          )
        case 'va_disability':
          return !!(
            state.vaDisabilityInfo?.va_file_number &&
            state.vaDisabilityInfo?.current_va_rating
          )
        case 'disability_claims':
          return state.disabilityClaims.length > 0
        case 'documents':
          return state.documents.some((d) => d.document_type === 'dd214')
        default:
          return false
      }
    },
    [state]
  )

  return {
    ...state,
    loadAllData,
    savePersonalInfo,
    saveMilitaryService,
    saveVADisabilityInfo,
    addDisabilityClaim,
    editDisabilityClaim,
    removeDisabilityClaim,
    addDocument,
    uploadAndAddDocument,
    removeDocument,
    setStepStatus,
    resetProgress,
    calculateProgress,
    isSectionComplete,
  }
}
