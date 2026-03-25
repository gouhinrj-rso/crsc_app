import { useState, useEffect, useCallback } from 'react'
import type {
  PersonalInformation,
  MilitaryService,
  VaDisabilityInfo,
  DisabilityClaim,
  Document,
  PacketStatus,
} from '@/types/database'

interface FormDataState {
  personalInfo: PersonalInformation | null
  militaryService: MilitaryService | null
  vaDisabilityInfo: VaDisabilityInfo | null
  disabilityClaims: DisabilityClaim[]
  documents: Document[]
  packetStatus: PacketStatus[]
  loading: boolean
  error: string | null
}

export function useFormData() {
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
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const [
        personalInfo,
        militaryService,
        vaDisabilityInfo,
        disabilityClaims,
        documents,
        packetStatus,
      ] = await Promise.all([
        window.electronAPI.formData.getPersonalInfo(),
        window.electronAPI.formData.getMilitaryService(),
        window.electronAPI.formData.getVaDisabilityInfo(),
        window.electronAPI.formData.getDisabilityClaims(),
        window.electronAPI.formData.getDocuments(),
        window.electronAPI.formData.getPacketStatus(),
      ])

      setState({
        personalInfo,
        militaryService,
        vaDisabilityInfo,
        disabilityClaims: disabilityClaims || [],
        documents: documents || [],
        packetStatus: packetStatus || [],
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
  }, [])

  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Personal Info
  const savePersonalInfo = useCallback(
    async (data: Partial<PersonalInformation>) => {
      try {
        const result = await window.electronAPI.formData.savePersonalInfo(data)
        setState((prev) => ({ ...prev, personalInfo: result }))
        return { success: true, data: result }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to save personal info'
        return { success: false, error }
      }
    },
    []
  )

  // Military Service
  const saveMilitaryService = useCallback(
    async (data: Partial<MilitaryService>) => {
      try {
        const result = await window.electronAPI.formData.saveMilitaryService(data)
        setState((prev) => ({ ...prev, militaryService: result }))
        return { success: true, data: result }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to save military service'
        return { success: false, error }
      }
    },
    []
  )

  // VA Disability Info
  const saveVADisabilityInfo = useCallback(
    async (data: Partial<VaDisabilityInfo>) => {
      try {
        const result = await window.electronAPI.formData.saveVaDisabilityInfo(data)
        setState((prev) => ({ ...prev, vaDisabilityInfo: result }))
        return { success: true, data: result }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to save VA disability info'
        return { success: false, error }
      }
    },
    []
  )

  // Disability Claims
  const addDisabilityClaim = useCallback(
    async (data: Partial<DisabilityClaim>) => {
      try {
        const result = await window.electronAPI.formData.createDisabilityClaim(data)
        setState((prev) => ({
          ...prev,
          disabilityClaims: [...prev.disabilityClaims, result],
        }))
        return { success: true, data: result }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to add disability claim'
        return { success: false, error }
      }
    },
    []
  )

  const editDisabilityClaim = useCallback(
    async (claimId: string, data: Partial<DisabilityClaim>) => {
      try {
        const result = await window.electronAPI.formData.updateDisabilityClaim(claimId, data)
        setState((prev) => ({
          ...prev,
          disabilityClaims: prev.disabilityClaims.map((claim) =>
            claim.id === claimId ? result : claim
          ),
        }))
        return { success: true, data: result }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to update disability claim'
        return { success: false, error }
      }
    },
    []
  )

  const removeDisabilityClaim = useCallback(async (claimId: string) => {
    try {
      await window.electronAPI.formData.deleteDisabilityClaim(claimId)
      setState((prev) => ({
        ...prev,
        disabilityClaims: prev.disabilityClaims.filter((claim) => claim.id !== claimId),
      }))
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete disability claim'
      return { success: false, error }
    }
  }, [])

  // Documents
  const addDocument = useCallback(
    async (data: Partial<Document>) => {
      try {
        const result = await window.electronAPI.formData.createDocument(data)
        setState((prev) => ({
          ...prev,
          documents: [result, ...prev.documents],
        }))
        return { success: true, data: result }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to add document'
        return { success: false, error }
      }
    },
    []
  )

  const removeDocument = useCallback(async (docId: string) => {
    try {
      await window.electronAPI.formData.deleteDocument(docId)
      setState((prev) => ({
        ...prev,
        documents: prev.documents.filter((doc) => doc.id !== docId),
      }))
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to delete document'
      return { success: false, error }
    }
  }, [])

  // Packet Status
  const setStepStatus = useCallback(
    async (stepName: string, status: string) => {
      try {
        const result = await window.electronAPI.formData.updatePacketStep(stepName, status)
        setState((prev) => {
          const existingIndex = prev.packetStatus.findIndex(
            (s) => s.step_name === stepName
          )
          if (existingIndex >= 0) {
            const newStatus = [...prev.packetStatus]
            newStatus[existingIndex] = result
            return { ...prev, packetStatus: newStatus }
          }
          return { ...prev, packetStatus: [...prev.packetStatus, result] }
        })
        return { success: true, data: result }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to update packet step'
        return { success: false, error }
      }
    },
    []
  )

  const resetProgress = useCallback(async () => {
    try {
      await window.electronAPI.formData.resetPacketStatus()
      setState((prev) => ({ ...prev, packetStatus: [] }))
      return { success: true }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to reset progress'
      return { success: false, error }
    }
  }, [])

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
    removeDocument,
    setStepStatus,
    resetProgress,
    calculateProgress,
    isSectionComplete,
  }
}
