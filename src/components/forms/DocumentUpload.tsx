import { useState, useCallback } from 'react'
import { DOCUMENT_TYPES, FILE_UPLOAD_LIMITS } from '@/lib/constants'
import { validateFileUpload } from '@/lib/validation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
} from 'lucide-react'
import type { Document } from '@/types/database'

interface DocumentUploadProps {
  documents: Document[]
  onUpload: (file: File, documentType: string) => Promise<{ success: boolean; error?: string }>
  onDelete: (documentId: string) => Promise<{ success: boolean; error?: string }>
  isLoading?: boolean
}

export default function DocumentUpload({
  documents,
  onUpload,
  onDelete,
  isLoading = false,
}: DocumentUploadProps) {
  const [selectedType, setSelectedType] = useState<string>('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null)

  const isDocumentTypeUploaded = (type: string) => {
    return documents.some((doc) => doc.document_type === type)
  }

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return
      if (!selectedType) {
        setUploadError('Please select a document type first')
        return
      }

      setUploadError(null)
      const file = files[0]

      // Validate file
      const validation = validateFileUpload(file)
      if (!validation.valid) {
        setUploadError(validation.error || 'Invalid file')
        return
      }

      setUploadingDoc(selectedType)
      const result = await onUpload(file, selectedType)
      setUploadingDoc(null)

      if (!result.success) {
        setUploadError(result.error || 'Failed to upload document')
      } else {
        setSelectedType('')
      }
    },
    [selectedType, onUpload]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  const handleDeleteDocument = async (docId: string) => {
    setDeletingDoc(docId)
    await onDelete(docId)
    setDeletingDoc(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
          <CardDescription>
            Upload supporting documents for your CRSC application. All files should be
            PDF or image format, maximum 10MB each.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {uploadError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <span>{type.label}</span>
                      {type.required && (
                        <Badge variant="secondary" className="text-xs">
                          Required
                        </Badge>
                      )}
                      {isDocumentTypeUploaded(type.value) && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary bg-primary/5'
                : selectedType
                ? 'border-muted-foreground/25 hover:border-primary/50'
                : 'border-muted-foreground/25 opacity-50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept={FILE_UPLOAD_LIMITS.allowedExtensions.join(',')}
              onChange={(e) => handleFileSelect(e.target.files)}
              disabled={!selectedType || isLoading || !!uploadingDoc}
            />
            <label
              htmlFor="file-upload"
              className={`cursor-pointer ${!selectedType ? 'pointer-events-none' : ''}`}
            >
              <div className="flex flex-col items-center gap-2">
                {uploadingDoc ? (
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                ) : (
                  <Upload className="h-10 w-10 text-muted-foreground" />
                )}
                <div>
                  <p className="font-medium">
                    {uploadingDoc
                      ? 'Uploading...'
                      : selectedType
                      ? 'Click to upload or drag and drop'
                      : 'Select a document type first'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, JPG, PNG, GIF, TIFF (max 10MB)
                  </p>
                </div>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Required Documents Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Required Documents</CardTitle>
          <CardDescription>
            These documents are required for your CRSC application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DOCUMENT_TYPES.filter((t) => t.required).map((type) => {
              const uploaded = isDocumentTypeUploaded(type.value)
              return (
                <div
                  key={type.value}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    uploaded ? 'bg-green-50 border-green-200' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {uploaded ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/25" />
                    )}
                    <span className={uploaded ? 'text-green-700' : ''}>
                      {type.label}
                    </span>
                  </div>
                  {uploaded && (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                      Uploaded
                    </Badge>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Uploaded Documents List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Documents</CardTitle>
            <CardDescription>
              {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documents.map((doc) => {
                const typeInfo = DOCUMENT_TYPES.find((t) => t.value === doc.document_type)
                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeInfo?.label || doc.document_type}
                          {doc.file_size && ` • ${formatFileSize(doc.file_size)}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteDocument(doc.id)}
                      disabled={deletingDoc === doc.id}
                    >
                      {deletingDoc === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optional Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Optional Supporting Documents</CardTitle>
          <CardDescription>
            These documents can strengthen your application but are not required
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-2">
            {DOCUMENT_TYPES.filter((t) => !t.required).map((type) => {
              const uploaded = isDocumentTypeUploaded(type.value)
              return (
                <div
                  key={type.value}
                  className={`flex items-center gap-2 p-2 rounded ${
                    uploaded ? 'text-green-700' : 'text-muted-foreground'
                  }`}
                >
                  {uploaded ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-muted-foreground/25" />
                  )}
                  <span className="text-sm">{type.label}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
