import { describe, it, expect } from 'vitest'
import { parseMessageContent, hasUploadRequest } from '../chat-utils'

describe('parseMessageContent', () => {
  it('returns content unchanged when there are no upload request markers', () => {
    const content = 'Hello! How can I help you with your CRSC claim?'
    const { cleanContent, uploadRequests } = parseMessageContent(content)
    expect(cleanContent).toBe(content)
    expect(uploadRequests).toEqual([])
  })

  it('strips a single va_decision_letter marker and records the request', () => {
    const content =
      'Please upload your VA rating decision letter.\n[UPLOAD_REQUEST:va_decision_letter]'
    const { cleanContent, uploadRequests } = parseMessageContent(content)
    expect(cleanContent).toBe('Please upload your VA rating decision letter.')
    expect(uploadRequests).toEqual(['va_decision_letter'])
  })

  it('strips a single dd214 marker and records the request', () => {
    const content =
      'I need your DD214 to continue.\n[UPLOAD_REQUEST:dd214]'
    const { cleanContent, uploadRequests } = parseMessageContent(content)
    expect(cleanContent).toBe('I need your DD214 to continue.')
    expect(uploadRequests).toEqual(['dd214'])
  })

  it('strips a single medical_records marker and records the request', () => {
    const content =
      'Please upload your medical records.\n[UPLOAD_REQUEST:medical_records]'
    const { cleanContent, uploadRequests } = parseMessageContent(content)
    expect(cleanContent).toBe('Please upload your medical records.')
    expect(uploadRequests).toEqual(['medical_records'])
  })

  it('handles multiple upload request markers in one message', () => {
    const content =
      'Please upload both documents.\n[UPLOAD_REQUEST:va_decision_letter]\n[UPLOAD_REQUEST:dd214]'
    const { cleanContent, uploadRequests } = parseMessageContent(content)
    expect(cleanContent).toBe('Please upload both documents.')
    expect(uploadRequests).toEqual(['va_decision_letter', 'dd214'])
  })

  it('removes all occurrences of the same marker type', () => {
    const content =
      'Upload here:\n[UPLOAD_REQUEST:dd214]\nAnd also here:\n[UPLOAD_REQUEST:dd214]'
    const { cleanContent, uploadRequests } = parseMessageContent(content)
    expect(cleanContent).toBe('Upload here:\n\nAnd also here:')
    expect(uploadRequests).toEqual(['dd214', 'dd214'])
  })

  it('does NOT match the unsupported va_code_sheet type', () => {
    const content =
      'Upload your code sheet.\n[UPLOAD_REQUEST:va_code_sheet]'
    const { cleanContent, uploadRequests } = parseMessageContent(content)
    // Marker is unrecognised – content stays as-is and no request is recorded
    expect(cleanContent).toBe(content)
    expect(uploadRequests).toEqual([])
  })

  it('preserves content before and after a marker', () => {
    const content =
      'Before.[UPLOAD_REQUEST:dd214]After.'
    const { cleanContent, uploadRequests } = parseMessageContent(content)
    expect(cleanContent).toBe('Before.After.')
    expect(uploadRequests).toEqual(['dd214'])
  })

  it('handles an empty string without error', () => {
    const { cleanContent, uploadRequests } = parseMessageContent('')
    expect(cleanContent).toBe('')
    expect(uploadRequests).toEqual([])
  })

  it('trims leading/trailing whitespace from cleaned content', () => {
    const content = '  [UPLOAD_REQUEST:dd214]  '
    const { cleanContent, uploadRequests } = parseMessageContent(content)
    expect(cleanContent).toBe('')
    expect(uploadRequests).toEqual(['dd214'])
  })

  it('is idempotent when called multiple times with the same input', () => {
    const content = 'Upload your VA letter.\n[UPLOAD_REQUEST:va_decision_letter]'
    const first = parseMessageContent(content)
    const second = parseMessageContent(content)
    expect(first).toEqual(second)
  })
})

describe('hasUploadRequest', () => {
  it('returns true when content contains a supported upload marker', () => {
    expect(hasUploadRequest('Please upload.\n[UPLOAD_REQUEST:va_decision_letter]')).toBe(true)
    expect(hasUploadRequest('[UPLOAD_REQUEST:dd214]')).toBe(true)
    expect(hasUploadRequest('[UPLOAD_REQUEST:medical_records]')).toBe(true)
  })

  it('returns false when content has no upload markers', () => {
    expect(hasUploadRequest('No uploads needed here.')).toBe(false)
    expect(hasUploadRequest('')).toBe(false)
  })

  it('returns false for the unsupported va_code_sheet marker', () => {
    expect(hasUploadRequest('[UPLOAD_REQUEST:va_code_sheet]')).toBe(false)
  })

  it('does not have stateful side-effects when called repeatedly', () => {
    const content = 'Upload this.\n[UPLOAD_REQUEST:dd214]'
    expect(hasUploadRequest(content)).toBe(true)
    expect(hasUploadRequest(content)).toBe(true)
    expect(hasUploadRequest(content)).toBe(true)
  })
})
