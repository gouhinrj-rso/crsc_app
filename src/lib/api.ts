import { supabase } from './supabase'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']

// Generic API response type
interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// Helper for consistent error handling
function handleError(error: { message: string } | null): string | null {
  return error?.message ?? null
}

// ==================== User API ====================

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return { data: null, error: error.message }
  return { data: user, error: null }
}

export async function getUserProfile(userId: string): Promise<ApiResponse<Tables['users']['Row']>> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error: handleError(error) }
}

export async function createUserProfile(userId: string, email: string): Promise<ApiResponse<Tables['users']['Row']>> {
  const { data, error } = await supabase
    .from('users')
    .upsert({ id: userId, email }, { onConflict: 'id' })
    .select()
    .single()
  return { data, error: handleError(error) }
}

export async function updateUserProfile(userId: string, updates: Tables['users']['Update']): Promise<ApiResponse<Tables['users']['Row']>> {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  return { data, error: handleError(error) }
}

// ==================== Personal Information API ====================

export async function getPersonalInfo(userId: string): Promise<ApiResponse<Tables['personal_information']['Row']>> {
  const { data, error } = await supabase
    .from('personal_information')
    .select('*')
    .eq('user_id', userId)
    .single()
  return { data, error: handleError(error) }
}

export async function upsertPersonalInfo(
  userId: string,
  info: Omit<Tables['personal_information']['Insert'], 'user_id'>
): Promise<ApiResponse<Tables['personal_information']['Row']>> {
  const { data, error } = await supabase
    .from('personal_information')
    .upsert({ ...info, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single()
  return { data, error: handleError(error) }
}

// ==================== Military Service API ====================

export async function getMilitaryService(userId: string): Promise<ApiResponse<Tables['military_service']['Row']>> {
  const { data, error } = await supabase
    .from('military_service')
    .select('*')
    .eq('user_id', userId)
    .single()
  return { data, error: handleError(error) }
}

export async function upsertMilitaryService(
  userId: string,
  info: Omit<Tables['military_service']['Insert'], 'user_id'>
): Promise<ApiResponse<Tables['military_service']['Row']>> {
  const { data, error } = await supabase
    .from('military_service')
    .upsert({ ...info, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single()
  return { data, error: handleError(error) }
}

// ==================== VA Disability Info API ====================

export async function getVADisabilityInfo(userId: string): Promise<ApiResponse<Tables['va_disability_info']['Row']>> {
  const { data, error } = await supabase
    .from('va_disability_info')
    .select('*')
    .eq('user_id', userId)
    .single()
  return { data, error: handleError(error) }
}

export async function upsertVADisabilityInfo(
  userId: string,
  info: Omit<Tables['va_disability_info']['Insert'], 'user_id'>
): Promise<ApiResponse<Tables['va_disability_info']['Row']>> {
  const { data, error } = await supabase
    .from('va_disability_info')
    .upsert({ ...info, user_id: userId, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    .select()
    .single()
  return { data, error: handleError(error) }
}

// ==================== Disability Claims API ====================

export async function getDisabilityClaims(userId: string): Promise<ApiResponse<Tables['disability_claims']['Row'][]>> {
  const { data, error } = await supabase
    .from('disability_claims')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return { data: data || [], error: handleError(error) }
}

export async function createDisabilityClaim(
  userId: string,
  claim: Omit<Tables['disability_claims']['Insert'], 'user_id'>
): Promise<ApiResponse<Tables['disability_claims']['Row']>> {
  const { data, error } = await supabase
    .from('disability_claims')
    .insert({ ...claim, user_id: userId })
    .select()
    .single()
  return { data, error: handleError(error) }
}

export async function updateDisabilityClaim(
  claimId: string,
  updates: Tables['disability_claims']['Update'],
): Promise<ApiResponse<Tables['disability_claims']['Row']>> {
  const { data, error } = await supabase
    .from('disability_claims')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', claimId)
    .select()
    .single()
  return { data, error: handleError(error) }
}

export async function deleteDisabilityClaim(claimId: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('disability_claims')
    .delete()
    .eq('id', claimId)
  return { data: null, error: handleError(error) }
}

// ==================== Secondary Conditions API ====================

export async function getSecondaryConditions(claimId: string): Promise<ApiResponse<Tables['secondary_conditions']['Row'][]>> {
  const { data, error } = await supabase
    .from('secondary_conditions')
    .select('*')
    .eq('primary_claim_id', claimId)
    .order('created_at', { ascending: true })
  return { data: data || [], error: handleError(error) }
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
  return { data, error: handleError(error) }
}

export async function deleteSecondaryCondition(conditionId: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('secondary_conditions')
    .delete()
    .eq('id', conditionId)
  return { data: null, error: handleError(error) }
}

// ==================== Documents API ====================

export async function getDocuments(userId: string): Promise<ApiResponse<Tables['documents']['Row'][]>> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', userId)
    .order('uploaded_at', { ascending: false })
  return { data: data || [], error: handleError(error) }
}

export async function createDocument(
  userId: string,
  doc: Omit<Tables['documents']['Insert'], 'user_id'>
): Promise<ApiResponse<Tables['documents']['Row']>> {
  const { data, error } = await supabase
    .from('documents')
    .insert({ ...doc, user_id: userId })
    .select()
    .single()
  return { data, error: handleError(error) }
}

// Upload document to Supabase Storage and create DB record
export async function uploadDocument(
  userId: string,
  file: File,
  documentType: string
): Promise<ApiResponse<Tables['documents']['Row']>> {
  const filePath = `${userId}/${documentType}/${Date.now()}_${file.name}`

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return { data: null, error: uploadError.message }
  }

  // Create DB record
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      document_type: documentType,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: file.type,
    })
    .select()
    .single()

  return { data, error: handleError(error) }
}

export async function deleteDocument(docId: string): Promise<ApiResponse<null>> {
  // Get file path before deleting
  const { data: doc } = await supabase
    .from('documents')
    .select('file_path')
    .eq('id', docId)
    .single()

  // Delete from storage if path exists
  if (doc?.file_path) {
    await supabase.storage.from('documents').remove([doc.file_path])
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', docId)
  return { data: null, error: handleError(error) }
}

// ==================== Chat History API ====================

export async function getChatHistory(userId: string): Promise<ApiResponse<Tables['chat_history']['Row'][]>> {
  const { data, error } = await supabase
    .from('chat_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return { data: data || [], error: handleError(error) }
}

export async function addChatMessage(
  userId: string,
  message: string,
  role: 'user' | 'assistant'
): Promise<ApiResponse<Tables['chat_history']['Row']>> {
  const { data, error } = await supabase
    .from('chat_history')
    .insert({ user_id: userId, message, role })
    .select()
    .single()
  return { data, error: handleError(error) }
}

export async function clearChatHistory(userId: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('chat_history')
    .delete()
    .eq('user_id', userId)
  return { data: null, error: handleError(error) }
}

// ==================== Packet Status API ====================

export async function getPacketStatus(userId: string): Promise<ApiResponse<Tables['packet_status']['Row'][]>> {
  const { data, error } = await supabase
    .from('packet_status')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return { data: data || [], error: handleError(error) }
}

export async function updatePacketStep(
  userId: string,
  stepName: string,
  status: string
): Promise<ApiResponse<Tables['packet_status']['Row']>> {
  const completedAt = status === 'completed' ? new Date().toISOString() : null
  const { data, error } = await supabase
    .from('packet_status')
    .upsert(
      { user_id: userId, step_name: stepName, step_status: status, completed_at: completedAt, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,step_name' }
    )
    .select()
    .single()
  return { data, error: handleError(error) }
}

export async function resetPacketStatus(userId: string): Promise<ApiResponse<null>> {
  const { error } = await supabase
    .from('packet_status')
    .delete()
    .eq('user_id', userId)
  return { data: null, error: handleError(error) }
}

// ==================== Payments API ====================

export async function getPayments(userId: string): Promise<ApiResponse<Tables['payments']['Row'][]>> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return { data: data || [], error: handleError(error) }
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
  return { data, error: handleError(error) }
}

export async function getPaymentStatus(userId: string): Promise<ApiResponse<Tables['payments']['Row']>> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .limit(1)
    .single()
  return { data, error: handleError(error) }
}

// ==================== Audit Log API ====================

export async function createAuditLog(
  userId: string | null,
  action: string,
  resourceType: string,
  resourceId?: string
): Promise<ApiResponse<Tables['audit_log']['Row']>> {
  if (!userId) return { data: null, error: null }
  const { data, error } = await supabase
    .from('audit_log')
    .insert({ user_id: userId, action, resource_type: resourceType, resource_id: resourceId || null })
    .select()
    .single()
  return { data, error: handleError(error) }
}

// ==================== Edge Function Calls ====================

export async function callEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<ApiResponse<T>> {
  const { data, error } = await supabase.functions.invoke<T>(functionName, { body })
  if (error) return { data: null, error: error.message }
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

    if (!response.ok) throw new Error('Failed to connect to chat service')

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

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
            if (parsed.text) onChunk(parsed.text)
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

// ==================== Document Extraction ====================

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
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i])
    }
    const fileBase64 = btoa(binary)

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

    if (result.error) return { success: false, error: result.error }
    if (!result.data?.success) return { success: false, error: result.data?.error || 'Extraction failed' }
    return { success: true, data: result.data.data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to extract document data',
    }
  }
}
