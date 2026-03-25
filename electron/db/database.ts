import BetterSqlite3 from 'better-sqlite3'
import type { Database } from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'

let db: Database | null = null

export function initDb(): void {
  if (db) return

  const dbPath = path.join(app.getPath('userData'), 'crsc.db')
  db = new BetterSqlite3(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
}

export function getDb(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.')
  }
  return db
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
