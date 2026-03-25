import { useState, useCallback } from 'react'
import { validateFileUpload } from '@/lib/validation'
import type { ExtractedDocumentData } from '@/types/documents'
import { Upload, Loader2, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Document type labels for display
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  va_decision_letter: 'VA Rating Decision Letter / Code Sheet',
  dd214: 'DD214',
  medical_records: 'Medical Records',
}

const MAX_FILES = 10

export type DocumentType = 'va_decision_letter' | 'dd214' | 'medical_records'

export type { ExtractedDocumentData } from '@/types/documents'

interface ChatDropzoneProps {
  documentType: DocumentType
  onExtractionComplete: (data: ExtractedDocumentData, documentType: DocumentType) => void
  onError: (error: string) => void
  disabled?: boolean
}

interface FileStatus {
  file: File
  status: 'pending' | 'uploading' | 'extracting' | 'success' | 'error'
  error?: string
  data?: ExtractedDocumentData
}

type DropzoneState = 'ready' | 'processing' | 'done'

export default function ChatDropzone({
  documentType,
  onExtractionComplete,
  onError,
  disabled = false,
}: ChatDropzoneProps) {
  const [state, setState] = useState<DropzoneState>('ready')
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<FileStatus[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const processFiles = useCallback(
    async (fileStatuses: FileStatus[]) => {
      setState('processing')
      const allExtractedData: ExtractedDocumentData[] = []

      for (let i = 0; i < fileStatuses.length; i++) {
        const fileStatus = fileStatuses[i]

        // Update status to uploading
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'uploading' } : f
        ))

        // Validate file
        const validation = validateFileUpload(fileStatus.file)
        if (!validation.valid) {
          setFiles(prev => prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', error: validation.error || 'Invalid file' } : f
          ))
          continue
        }

        // Check for very large files that may timeout during extraction
        const fileSizeMB = fileStatus.file.size / (1024 * 1024)
        if (fileSizeMB > 30) {
          setFiles(prev => prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', error: `File too large for AI extraction (${fileSizeMB.toFixed(1)}MB). Please use files under 30MB or upload directly to Documents section.` } : f
          ))
          continue
        }

        // Update status to extracting
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'extracting' } : f
        ))

        try {
          // Convert file to base64
          const arrayBuffer = await fileStatus.file.arrayBuffer()
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )

          // Upload the file
          await window.electronAPI.documents.upload(base64, fileStatus.file.name, fileStatus.file.type, documentType)

          // Extract data using IPC
          const extractedText = await window.electronAPI.documents.extract(base64, fileStatus.file.type)

          if (!extractedText) {
            setFiles(prev => prev.map((f, idx) =>
              idx === i ? { ...f, status: 'error', error: 'Extraction returned no data' } : f
            ))
            continue
          }

          // Parse extracted text as JSON
          let extractedData: ExtractedDocumentData
          try {
            extractedData = JSON.parse(extractedText)
          } catch {
            // If it's not JSON, wrap it as a simple object
            extractedData = { disabilities: [], combinedRating: undefined, decisionDate: undefined, vaFileNumber: undefined } as ExtractedDocumentData
          }

          setFiles(prev => prev.map((f, idx) =>
            idx === i ? { ...f, status: 'success', data: extractedData } : f
          ))
          allExtractedData.push(extractedData)
        } catch (err) {
          const error = err instanceof Error ? err.message : 'Failed to process document'
          setFiles(prev => prev.map((f, idx) =>
            idx === i ? { ...f, status: 'error', error } : f
          ))
        }
      }

      setState('done')

      // Merge all extracted data and send to parent
      if (allExtractedData.length > 0) {
        // Merge disabilities from all documents
        const mergedData = mergeExtractedData(allExtractedData, documentType)
        onExtractionComplete(mergedData, documentType)
      } else {
        onError('No data could be extracted from the uploaded documents')
      }
    },
    [documentType, onExtractionComplete, onError]
  )

  const handleFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      setErrorMessage(null)

      const filesArray = Array.from(newFiles).slice(0, MAX_FILES - files.length)

      if (filesArray.length === 0) {
        if (files.length >= MAX_FILES) {
          setErrorMessage(`Maximum ${MAX_FILES} files allowed`)
        }
        return
      }

      const newFileStatuses: FileStatus[] = filesArray.map(file => ({
        file,
        status: 'pending' as const,
      }))

      const allFiles = [...files, ...newFileStatuses]
      setFiles(allFiles)
    },
    [files]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && state === 'ready') {
      setIsDragging(true)
    }
  }, [disabled, state])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled || state !== 'ready') return

      const droppedFiles = e.dataTransfer.files
      if (droppedFiles && droppedFiles.length > 0) {
        handleFiles(droppedFiles)
      }
    },
    [disabled, state, handleFiles]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (selectedFiles && selectedFiles.length > 0) {
        handleFiles(selectedFiles)
      }
      // Reset input so same file can be selected again
      e.target.value = ''
    },
    [handleFiles]
  )

  const removeFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }, [])

  const startProcessing = useCallback(() => {
    if (files.length > 0 && state === 'ready') {
      processFiles(files)
    }
  }, [files, state, processFiles])

  const isProcessing = state === 'processing'
  const label = DOCUMENT_TYPE_LABELS[documentType] || documentType
  const canAddMore = files.length < MAX_FILES && state === 'ready'

  return (
    <div className="mt-3 mb-2">
      {/* Dropzone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-4 text-center transition-all
          ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
          ${isProcessing ? 'opacity-75 cursor-wait' : disabled || state === 'done' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-primary/50'}
          ${state === 'done' ? 'border-green-300 bg-green-50' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id={`chat-dropzone-${documentType}`}
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.gif,.tiff"
          onChange={handleInputChange}
          disabled={disabled || isProcessing || state === 'done' || !canAddMore}
          multiple
        />
        <label
          htmlFor={`chat-dropzone-${documentType}`}
          className={`flex flex-col items-center gap-2 ${disabled || isProcessing || state === 'done' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {state === 'done' ? (
            <>
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium text-sm text-green-700">Documents processed</p>
                <p className="text-xs text-muted-foreground">
                  {files.filter(f => f.status === 'success').length} of {files.length} files extracted successfully
                </p>
              </div>
            </>
          ) : isProcessing ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <div>
                <p className="font-medium text-sm">Processing documents...</p>
                <p className="text-xs text-muted-foreground">
                  {files.filter(f => f.status === 'success').length} of {files.length} complete
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-muted-foreground" />
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Upload {label}</p>
                <p className="text-xs text-muted-foreground">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF or images (max 30MB for AI extraction, up to {MAX_FILES} files)
                </p>
              </div>
            </>
          )}
        </label>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="mt-2 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((fileStatus, index) => (
            <div
              key={`${fileStatus.file.name}-${index}`}
              className={`flex items-center justify-between p-2 rounded-lg border text-sm ${
                fileStatus.status === 'success' ? 'bg-green-50 border-green-200' :
                fileStatus.status === 'error' ? 'bg-red-50 border-red-200' :
                fileStatus.status === 'uploading' || fileStatus.status === 'extracting' ? 'bg-blue-50 border-blue-200' :
                'bg-muted/30 border-muted'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {fileStatus.status === 'success' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : fileStatus.status === 'error' ? (
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                ) : fileStatus.status === 'uploading' || fileStatus.status === 'extracting' ? (
                  <Loader2 className="h-4 w-4 text-blue-500 animate-spin flex-shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{fileStatus.file.name}</p>
                  {fileStatus.status === 'extracting' && (
                    <p className="text-xs text-blue-600">Extracting...</p>
                  )}
                  {fileStatus.status === 'uploading' && (
                    <p className="text-xs text-blue-600">Uploading...</p>
                  )}
                  {fileStatus.error && (
                    <p className="text-xs text-red-600">{fileStatus.error}</p>
                  )}
                </div>
              </div>
              {state === 'ready' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Process button */}
      {files.length > 0 && state === 'ready' && (
        <div className="mt-3 flex gap-2">
          <Button
            onClick={startProcessing}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Extract from {files.length} {files.length === 1 ? 'document' : 'documents'}
          </Button>
          {canAddMore && (
            <Button
              variant="outline"
              onClick={() => document.getElementById(`chat-dropzone-${documentType}`)?.click()}
            >
              Add more
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Helper function to merge extracted data from multiple documents
function mergeExtractedData(dataArray: ExtractedDocumentData[], documentType: DocumentType): ExtractedDocumentData {
  if (documentType === 'va_decision_letter') {
    // Merge disabilities from all documents
    const allDisabilities: Array<{
      title?: string
      diagnosticCode?: string
      description?: string
      percentage: number
      effectiveDate?: string
      bodyPart?: string
    }> = []

    let combinedRating: number | undefined
    let decisionDate: string | undefined
    let vaFileNumber: string | undefined

    for (const data of dataArray) {
      if ('disabilities' in data && Array.isArray(data.disabilities)) {
        allDisabilities.push(...data.disabilities)
      }
      if ('combinedRating' in data && data.combinedRating !== undefined) {
        combinedRating = data.combinedRating
      }
      if ('decisionDate' in data && data.decisionDate !== undefined) {
        decisionDate = data.decisionDate
      }
      if ('vaFileNumber' in data && data.vaFileNumber !== undefined) {
        vaFileNumber = data.vaFileNumber
      }
    }

    // Remove duplicate disabilities based on title or diagnostic code
    const uniqueDisabilities = allDisabilities.filter((disability, index, self) => {
      const key = disability.diagnosticCode || disability.title || disability.description
      return index === self.findIndex(d =>
        (d.diagnosticCode || d.title || d.description) === key
      )
    })

    return {
      disabilities: uniqueDisabilities as Array<{
        title: string
        diagnosticCode?: string
        percentage: number
        effectiveDate?: string
        bodyPart?: string
      }>,
      combinedRating,
      decisionDate,
      vaFileNumber,
    }
  }

  // For DD214 and medical_records, just return the last one (there should typically only be one)
  return dataArray[dataArray.length - 1]
}
