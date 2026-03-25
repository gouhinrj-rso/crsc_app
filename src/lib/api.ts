/**
 * Stub API module.
 *
 * All cloud (Supabase) calls have been removed. These stubs keep the
 * existing UI pages compiling. They will be replaced with local SQLite
 * calls in a later task.
 */

import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']

// Generic API response type
interface ApiResponse<T> {
  data: T | null
  error: string | null
}

// ---------------------------------------------------------------------------
// Extracted-document types (used by ChatDropzone)
// ---------------------------------------------------------------------------

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

export type ExtractedDocumentData =
  | ExtractedVADecisionLetter
  | ExtractedCodeSheet
  | ExtractedDD214

// ---------------------------------------------------------------------------
// Stub helpers
// ---------------------------------------------------------------------------

function stubOk<T>(data: T): ApiResponse<T> {
  return { data, error: null }
}

function stubNull<T>(): ApiResponse<T> {
  return { data: null, error: null }
}

// ---------------------------------------------------------------------------
// Personal information
// ---------------------------------------------------------------------------

export async function getPersonalInfo(
  _userId: string,
): Promise<ApiResponse<Tables['personal_information']['Row']>> {
  return stubNull()
}

export async function upsertPersonalInfo(
  _userId: string,
  data: Omit<Tables['personal_information']['Insert'], 'user_id'>,
): Promise<ApiResponse<Tables['personal_information']['Row']>> {
  return stubOk(data as unknown as Tables['personal_information']['Row'])
}

// ---------------------------------------------------------------------------
// Military service
// ---------------------------------------------------------------------------

export async function getMilitaryService(
  _userId: string,
): Promise<ApiResponse<Tables['military_service']['Row']>> {
  return stubNull()
}

export async function upsertMilitaryService(
  _userId: string,
  data: Omit<Tables['military_service']['Insert'], 'user_id'>,
): Promise<ApiResponse<Tables['military_service']['Row']>> {
  return stubOk(data as unknown as Tables['military_service']['Row'])
}

// ---------------------------------------------------------------------------
// VA disability info
// ---------------------------------------------------------------------------

export async function getVADisabilityInfo(
  _userId: string,
): Promise<ApiResponse<Tables['va_disability_info']['Row']>> {
  return stubNull()
}

export async function upsertVADisabilityInfo(
  _userId: string,
  data: Omit<Tables['va_disability_info']['Insert'], 'user_id'>,
): Promise<ApiResponse<Tables['va_disability_info']['Row']>> {
  return stubOk(data as unknown as Tables['va_disability_info']['Row'])
}

// ---------------------------------------------------------------------------
// Disability claims
// ---------------------------------------------------------------------------

export async function getDisabilityClaims(
  _userId: string,
): Promise<ApiResponse<Tables['disability_claims']['Row'][]>> {
  return stubOk([])
}

export async function createDisabilityClaim(
  _userId: string,
  data: Omit<Tables['disability_claims']['Insert'], 'user_id'>,
): Promise<ApiResponse<Tables['disability_claims']['Row']>> {
  return stubOk({ ...data, id: crypto.randomUUID() } as unknown as Tables['disability_claims']['Row'])
}

export async function updateDisabilityClaim(
  _claimId: string,
  data: Tables['disability_claims']['Update'],
): Promise<ApiResponse<Tables['disability_claims']['Row']>> {
  return stubOk(data as unknown as Tables['disability_claims']['Row'])
}

export async function deleteDisabilityClaim(
  _claimId: string,
  _userId?: string,
): Promise<ApiResponse<null>> {
  return stubNull()
}

// ---------------------------------------------------------------------------
// Secondary conditions
// ---------------------------------------------------------------------------

export async function getSecondaryConditions(
  _claimId: string,
): Promise<ApiResponse<Tables['secondary_conditions']['Row'][]>> {
  return stubOk([])
}

export async function createSecondaryCondition(
  _claimId: string,
  data: Omit<Tables['secondary_conditions']['Insert'], 'primary_claim_id'>,
): Promise<ApiResponse<Tables['secondary_conditions']['Row']>> {
  return stubOk({ ...data, id: crypto.randomUUID() } as unknown as Tables['secondary_conditions']['Row'])
}

export async function deleteSecondaryCondition(
  _conditionId: string,
): Promise<ApiResponse<null>> {
  return stubNull()
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export async function getDocuments(
  _userId: string,
): Promise<ApiResponse<Tables['documents']['Row'][]>> {
  return stubOk([])
}

export async function createDocument(
  _userId: string,
  data: Omit<Tables['documents']['Insert'], 'user_id'>,
): Promise<ApiResponse<Tables['documents']['Row']>> {
  return stubOk({ ...data, id: crypto.randomUUID() } as unknown as Tables['documents']['Row'])
}

export async function uploadDocument(
  _userId: string,
  _file: File,
  _documentType: string,
): Promise<ApiResponse<Tables['documents']['Row']>> {
  return stubNull()
}

export async function deleteDocument(
  _docId: string,
  _userId?: string,
): Promise<ApiResponse<null>> {
  return stubNull()
}

// ---------------------------------------------------------------------------
// Chat history
// ---------------------------------------------------------------------------

export async function getChatHistory(
  _userId: string,
): Promise<ApiResponse<Tables['chat_history']['Row'][]>> {
  return stubOk([])
}

export async function clearChatHistory(
  _userId: string,
): Promise<ApiResponse<null>> {
  return stubNull()
}

// ---------------------------------------------------------------------------
// Chat messaging (streaming)
// ---------------------------------------------------------------------------

export async function sendChatMessageStream(
  _userId: string,
  _message: string,
  _conversationHistory: Array<{ role: string; content: string }>,
  _onChunk: (text: string) => void,
  onComplete: () => void,
  _onError: (error: string) => void,
): Promise<void> {
  // Stub: immediately complete
  onComplete()
}

export async function sendChatMessage(
  _userId: string,
  _message: string,
  _conversationHistory: Array<{ role: string; content: string }>,
): Promise<ApiResponse<{ reply: string }>> {
  return stubOk({ reply: '' })
}

// ---------------------------------------------------------------------------
// Packet status
// ---------------------------------------------------------------------------

export async function getPacketStatus(
  _userId: string,
): Promise<ApiResponse<Tables['packet_status']['Row'][]>> {
  return stubOk([])
}

export async function updatePacketStep(
  _userId: string,
  _stepName: string,
  _status: string,
): Promise<ApiResponse<Tables['packet_status']['Row']>> {
  return stubNull() as ApiResponse<Tables['packet_status']['Row']>
}

export async function resetPacketStatus(
  _userId: string,
): Promise<ApiResponse<null>> {
  return stubNull()
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

export async function generatePDF(
  _userId: string,
  _documentType: string,
): Promise<ApiResponse<{ pdf: string }>> {
  return { data: null, error: 'PDF generation not yet implemented for local mode' }
}

// ---------------------------------------------------------------------------
// Document extraction
// ---------------------------------------------------------------------------

export async function extractDocumentData(
  _userId: string,
  _documentType: string,
  _file: File,
): Promise<{ success: boolean; data?: ExtractedDocumentData; error?: string }> {
  return { success: false, error: 'Document extraction not yet implemented for local mode' }
}
