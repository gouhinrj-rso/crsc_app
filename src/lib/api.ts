import { supabase } from './supabase'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']

// Generic API response type
interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Call db-proxy edge function for all database operations
async function callDbProxy<T>(
  operation: string,
  userId: string,
  data?: Record<string, unknown>,
  id?: string
): Promise<ApiResponse<T>> {
  const { data: response, error } = await supabase.functions.invoke<{ data: T; error: string | null }>('db-proxy', {
    body: { operation, table: operation.split('_').slice(1).join('_'), userId, data, id },
  })

  if (error) {
    return { data: null, error: error.message }
  }
  if (response?.error) {
    return { data: null, error: response.error }
  }
  return { data: response?.data ?? null, error: null }
}

// User API
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) {
    return { data: null, error: error.message }
  }
  return { data: user, error: null }
}

export async function getUserProfile(userId: string): Promise<ApiResponse<Tables['users']['Row']>> {
  return callDbProxy<Tables['users']['Row']>('get_user', userId)
}

export async function createUserProfile(userId: string, email: string): Promise<ApiResponse<Tables['users']['Row']>> {
  return callDbProxy<Tables['users']['Row']>('create_user', userId, { email })
}

export async function updateUserProfile(userId: string, updates: Tables['users']['Update']): Promise<ApiResponse<Tables['users']['Row']>> {
  return callDbProxy<Tables['users']['Row']>('update_user', userId, updates as Record<string, unknown>)
}

// Personal Information API
export async function getPersonalInfo(userId: string): Promise<ApiResponse<Tables['personal_information']['Row']>> {
  return callDbProxy<Tables['personal_information']['Row']>('get_personal_info', userId)
}

export async function upsertPersonalInfo(
  userId: string,
  info: Omit<Tables['personal_information']['Insert'], 'user_id'>
): Promise<ApiResponse<Tables['personal_information']['Row']>> {
  return callDbProxy<Tables['personal_information']['Row']>('upsert_personal_info', userId, info as Record<string, unknown>)
}

// Military Service API
export async function getMilitaryService(userId: string): Promise<ApiResponse<Tables['military_service']['Row']>> {
  return callDbProxy<Tables['military_service']['Row']>('get_military_service', userId)
}

export async function upsertMilitaryService(
  userId: string,
  info: Omit<Tables['military_service']['Insert'], 'user_id'>
): Promise<ApiResponse<Tables['military_service']['Row']>> {
  return callDbProxy<Tables['military_service']['Row']>('upsert_military_service', userId, info as Record<string, unknown>)
}

// VA Disability Info API
export async function getVADisabilityInfo(userId: string): Promise<ApiResponse<Tables['va_disability_info']['Row']>> {
  return callDbProxy<Tables['va_disability_info']['Row']>('get_va_disability_info', userId)
}

export async function upsertVADisabilityInfo(
  userId: string,
  info: Omit<Tables['va_disability_info']['Insert'], 'user_id'>
): Promise<ApiResponse<Tables['va_disability_info']['Row']>> {
  return callDbProxy<Tables['va_disability_info']['Row']>('upsert_va_disability_info', userId, info as Record<string, unknown>)
}

// Disability Claims API
export async function getDisabilityClaims(userId: string): Promise<ApiResponse<Tables['disability_claims']['Row'][]>> {
  const result = await callDbProxy<Tables['disability_claims']['Row'][]>('get_disability_claims', userId)
  return { data: result.data || [], error: result.error }
}

export async function createDisabilityClaim(
  userId: string,
  claim: Omit<Tables['disability_claims']['Insert'], 'user_id'>
): Promise<ApiResponse<Tables['disability_claims']['Row']>> {
  return callDbProxy<Tables['disability_claims']['Row']>('create_disability_claim', userId, claim as Record<string, unknown>)
}

export async function updateDisabilityClaim(
  claimId: string,
  updates: Tables['disability_claims']['Update'],
  userId?: string
): Promise<ApiResponse<Tables['disability_claims']['Row']>> {
  // Note: userId is needed for the proxy but we get it from context
  return callDbProxy<Tables['disability_claims']['Row']>('update_disability_claim', userId || '', updates as Record<string, unknown>, claimId)
}

export async function deleteDisabilityClaim(claimId: string, userId?: string): Promise<ApiResponse<null>> {
  await callDbProxy<{ success: boolean }>('delete_disability_claim', userId || '', undefined, claimId)
  return { data: null, error: null }
}

// Secondary Conditions API - these stay with Supabase for now as they're not PHI
export async function getSecondaryConditions(claimId: string): Promise<ApiResponse<Tables['secondary_conditions']['Row'][]>> {
  const { data, error } = await supabase
    .from('secondary_conditions')
    .select('*')
    .eq('primary_claim_id', claimId)
    .order('created_at', { ascending: true })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data || [], error: null }
}

export async function createSecondaryCondition(
  claimId: string,
  condition: Omit<Tables['secondary_conditions']['Insert'], 'primary_claim_id'>
): Promise<ApiResponse<Tables['secondary_conditions']['Row']>> {
  const { data, error } = await supabase
    .from('secondary_conditions')
    .insert({ ...condition, primary_claim_id: claimId })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

export async function deleteSecondaryCondition(conditionId: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('secondary_conditions')
    .delete()
    .eq('id', conditionId)

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: null, error: null }
}

// Documents API
export async function getDocuments(userId: string): Promise<ApiResponse<Tables['documents']['Row'][]>> {
  const result = await callDbProxy<Tables['documents']['Row'][]>('get_documents', userId)
  return { data: result.data || [], error: result.error }
}

export async function createDocument(
  userId: string,
  doc: Omit<Tables['documents']['Insert'], 'user_id'>
): Promise<ApiResponse<Tables['documents']['Row']>> {
  return callDbProxy<Tables['documents']['Row']>('create_document', userId, doc as Record<string, unknown>)
}

// Upload document with file data to GCS via edge function
export async function uploadDocument(
  userId: string,
  file: File,
  documentType: string
): Promise<ApiResponse<Tables['documents']['Row']>> {
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  const fileBase64 = btoa(binary)

  return callEdgeFunction<Tables['documents']['Row']>('upload-document', {
    userId,
    documentType,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type,
    fileBase64,
  })
}

export async function deleteDocument(docId: string, userId?: string): Promise<ApiResponse<null>> {
  await callDbProxy<{ success: boolean }>('delete_document', userId || '', undefined, docId)
  return { data: null, error: null }
}

// Chat History API
export async function getChatHistory(userId: string): Promise<ApiResponse<Tables['chat_history']['Row'][]>> {
  const result = await callDbProxy<Tables['chat_history']['Row'][]>('get_chat_history', userId)
  return { data: result.data || [], error: result.error }
}

export async function addChatMessage(
  userId: string,
  message: string,
  role: 'user' | 'assistant'
): Promise<ApiResponse<Tables['chat_history']['Row']>> {
  return callDbProxy<Tables['chat_history']['Row']>('add_chat_message', userId, { message, role })
}

export async function clearChatHistory(userId: string): Promise<ApiResponse<null>> {
  await callDbProxy<{ success: boolean }>('clear_chat_history', userId)
  return { data: null, error: null }
}

// Packet Status API
export async function getPacketStatus(userId: string): Promise<ApiResponse<Tables['packet_status']['Row'][]>> {
  const result = await callDbProxy<Tables['packet_status']['Row'][]>('get_packet_status', userId)
  return { data: result.data || [], error: result.error }
}

export async function updatePacketStep(
  userId: string,
  stepName: string,
  status: string
): Promise<ApiResponse<Tables['packet_status']['Row']>> {
  return callDbProxy<Tables['packet_status']['Row']>('upsert_packet_status', userId, { step_name: stepName, step_status: status })
}

export async function resetPacketStatus(userId: string): Promise<ApiResponse<null>> {
  await callDbProxy<{ success: boolean }>('reset_packet_status', userId)
  return { data: null, error: null }
}

// Veteran Verification API
export interface VerificationStatus {
  veteran_verified: boolean
  veteran_verified_at: string | null
  military_status: string | null
}

export async function getVerificationStatus(userId: string): Promise<ApiResponse<VerificationStatus>> {
  return callDbProxy<VerificationStatus>('get_verification_status', userId)
}

export async function initiateIdmeVerification(userId: string): Promise<ApiResponse<{ authorizationUrl: string }>> {
  return callEdgeFunction<{ authorizationUrl: string }>('idme-auth', { userId })
}

// Payments API - handled by edge function
export async function getPayments(userId: string): Promise<ApiResponse<Tables['payments']['Row'][]>> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data: data || [], error: null }
}

export async function createPayment(
  userId: string,
  payment: Omit<Tables['payments']['Insert'], 'user_id'>
): Promise<ApiResponse<Tables['payments']['Row']>> {
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...payment, user_id: userId })
    .select()
    .single()

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

// Audit Log API
export async function createAuditLog(
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId?: string
): Promise<ApiResponse<Tables['audit_log']['Row']>> {
  if (!userId) return { data: null, error: null }
  return callDbProxy<Tables['audit_log']['Row']>('create_audit_log', userId, {
    action,
    resource_type: resourceType,
    resource_id: resourceId || null,
  })
}

// Edge Function Calls
export async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<ApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body,
  })

  if (error) {
    return { data: null, error: error.message }
  }
  return { data, error: null }
}

// Chat with AI (non-streaming)
export async function sendChatMessage(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<ApiResponse<{ reply: string }>> {
  return callEdgeFunction<{ reply: string }>('chat-handler', {
    userId,
    message,
    conversationHistory,
  })
}

// Chat with AI (streaming)
export async function sendChatMessageStream(
  userId: string,
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession()

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-handler`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ userId, message, conversationHistory }),
      }
    )

    if (!response.ok) {
      throw new Error('Failed to connect to chat service')
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            onComplete()
            return
          }
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              onChunk(parsed.text)
            }
          } catch {
            // Ignore parse errors for incomplete JSON
          }
        }
      }
    }
    onComplete()
  } catch (error) {
    onError(error instanceof Error ? error.message : 'Unknown error')
  }
}

// Generate PDF
export async function generatePDF(
  userId: string,
  documentType: 'dd2860' | 'cover-letter' | 'package'
): Promise<ApiResponse<{ pdf: string }>> {
  return callEdgeFunction<{ pdf: string }>('generate-pdf', {
    userId,
    documentType,
  })
}

// Create Payment Intent
export async function createPaymentIntent(
  userId: string,
  amount: number
): Promise<ApiResponse<{ clientSecret: string }>> {
  return callEdgeFunction<{ clientSecret: string }>('payment-handler', {
    userId,
    amount,
  })
}

// Document Extraction Types
export interface ExtractedDisability {
  title: string
  diagnosticCode?: string
  percentage: number
  effectiveDate?: string
  bodyPart?: string
}

export interface ExtractedVADecisionLetter {
  disabilities: ExtractedDisability[]
  combinedRating?: number
  decisionDate?: string
  vaFileNumber?: string
}

export interface ExtractedCodeSheet {
  disabilities: Array<{
    diagnosticCode: string
    description: string
    percentage: number
  }>
  combinedRating?: number
}

export interface ExtractedDD214 {
  branch?: string
  entryDate?: string
  separationDate?: string
  rank?: string
  yearsOfService?: number
  characterOfService?: string
}

export type ExtractedDocumentData = ExtractedVADecisionLetter | ExtractedCodeSheet | ExtractedDD214

// Extract Document Data using Claude Vision
export async function extractDocumentData(
  userId: string,
  documentType: string,
  file: File
): Promise<{ success: boolean; data?: ExtractedDocumentData; error?: string }> {
  try {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i])
    }
    const fileBase64 = btoa(binary)

    // Call the extraction edge function
    const result = await callEdgeFunction<{
      success: boolean
      documentType: string
      data: ExtractedDocumentData
      error?: string
    }>('extract-document', {
      userId,
      documentType,
      fileBase64,
      mimeType: file.type,
    })

    if (result.error) {
      return { success: false, error: result.error }
    }

    if (!result.data?.success) {
      return { success: false, error: result.data?.error || 'Extraction failed' }
    }

    return { success: true, data: result.data.data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract document data',
    }
  }
}
