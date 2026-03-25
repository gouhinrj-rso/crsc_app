// Document types that can be requested for upload via AI chat
export type ChatDocumentType = 'va_decision_letter' | 'dd214' | 'medical_records'

// Source pattern for upload request markers.
const UPLOAD_REQUEST_PATTERN =
  /\[UPLOAD_REQUEST:(va_decision_letter|dd214|medical_records)\]/

// Re-exported as a non-global regex for simple boolean checks (no lastIndex side-effects).
export const UPLOAD_REQUEST_REGEX = UPLOAD_REQUEST_PATTERN

// Returns true if the message content contains at least one upload request marker.
export function hasUploadRequest(content: string): boolean {
  return UPLOAD_REQUEST_PATTERN.test(content)
}

// Parse message content to extract upload requests and clean content.
// Returns the message text with upload request markers removed, plus
// the list of document types that were requested.
export function parseMessageContent(content: string): {
  cleanContent: string
  uploadRequests: ChatDocumentType[]
} {
  const uploadRequests: ChatDocumentType[] = []
  const regex = new RegExp(UPLOAD_REQUEST_REGEX.source, 'g')
  let match

  while ((match = regex.exec(content)) !== null) {
    uploadRequests.push(match[1] as ChatDocumentType)
  }

  const cleanContent = content.replace(regex, '').trim()

  return { cleanContent, uploadRequests }
}
