import { ipcMain } from 'electron'
import { getDb } from '../db/database'
import { saveBufferToStorage, deleteFromStorage } from '../services/storage'
import Anthropic from '@anthropic-ai/sdk'
import crypto from 'crypto'

function getApiKey(): string {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('api_key') as
    | { value: string }
    | undefined
  if (!row?.value)
    throw new Error('No API key configured. Please set your Anthropic API key in Settings.')
  return row.value
}

export function registerDocumentHandlers(): void {
  // documents:upload — decode base64, save file, insert DB row, return document row
  ipcMain.handle(
    'documents:upload',
    (
      _event,
      fileBase64: string,
      fileName: string,
      mimeType: string,
      documentType: string
    ) => {
      const buffer = Buffer.from(fileBase64, 'base64')
      const filePath = saveBufferToStorage(buffer, fileName)
      const id = crypto.randomUUID()
      const db = getDb()

      db.prepare(
        `INSERT INTO documents (id, document_type, file_name, file_path, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(id, documentType, fileName, filePath, buffer.length, mimeType)

      return db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
    }
  )

  // documents:list — return all document rows ordered by uploaded_at DESC
  ipcMain.handle('documents:list', () => {
    const db = getDb()
    return db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC').all()
  })

  // documents:delete — remove file from storage and delete DB row
  ipcMain.handle('documents:delete', (_event, docId: string) => {
    const db = getDb()
    const row = db.prepare('SELECT file_path FROM documents WHERE id = ?').get(docId) as
      | { file_path: string | null }
      | undefined

    if (row?.file_path) {
      deleteFromStorage(row.file_path)
    }

    db.prepare('DELETE FROM documents WHERE id = ?').run(docId)
  })

  // documents:extract — use Claude Vision API for OCR text extraction
  ipcMain.handle(
    'documents:extract',
    async (_event, fileBase64: string, mimeType: string) => {
      const apiKey = getApiKey()
      const client = new Anthropic({ apiKey })

      const extractionPrompt =
        'Extract all text content from this document. Preserve the structure and formatting as much as possible.'

      let content: Anthropic.MessageCreateParams['messages'][0]['content']

      if (mimeType === 'application/pdf') {
        // Use document type for PDFs
        content = [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: fileBase64,
            },
          },
          {
            type: 'text',
            text: extractionPrompt,
          },
        ]
      } else {
        // Use image type for images
        const mediaType = mimeType.startsWith('image/') ? mimeType : 'image/png'
        content = [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType as
                | 'image/jpeg'
                | 'image/png'
                | 'image/gif'
                | 'image/webp',
              data: fileBase64,
            },
          },
          {
            type: 'text',
            text: extractionPrompt,
          },
        ]
      }

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      })

      const textContent = response.content.find((c) => c.type === 'text')
      return textContent?.text || ''
    }
  )
}
