import { app } from 'electron'
import { getDb } from '../db/database'
import fs from 'fs'
import path from 'path'

export function getStorageBasePath(): string {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('storage_path') as
    | { value: string }
    | undefined
  return row?.value || path.join(app.getPath('userData'), 'documents')
}

export function ensureStorageDir(): string {
  const basePath = getStorageBasePath()
  fs.mkdirSync(basePath, { recursive: true })
  return basePath
}

export function saveBufferToStorage(buffer: Buffer, fileName: string): string {
  const dir = ensureStorageDir()
  const timestamp = Date.now()
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storedName = `${timestamp}_${safeName}`
  const filePath = path.join(dir, storedName)
  fs.writeFileSync(filePath, buffer)
  return filePath
}

export function deleteFromStorage(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath)
  }
}
