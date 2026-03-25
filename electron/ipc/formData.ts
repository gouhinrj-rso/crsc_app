import { ipcMain, safeStorage } from 'electron'
import { getDb } from '../db/database'
import crypto from 'crypto'

interface Row {
  id: string
  [key: string]: unknown
}

function buildUpsertColumns(data: Record<string, unknown>, excludeKeys: string[] = []): {
  setClauses: string[]
  insertColumns: string[]
  insertPlaceholders: string[]
  params: Record<string, unknown>
} {
  const setClauses: string[] = []
  const insertColumns: string[] = []
  const insertPlaceholders: string[] = []
  const params: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (excludeKeys.includes(key)) continue
    setClauses.push(`${key} = @${key}`)
    insertColumns.push(key)
    insertPlaceholders.push(`@${key}`)
    params[key] = value
  }

  return { setClauses, insertColumns, insertPlaceholders, params }
}

function encryptSsn(ssn: string): string {
  const encrypted = safeStorage.encryptString(ssn)
  return encrypted.toString('base64')
}

function decryptSsn(encrypted: string): string {
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
}

export function registerFormDataHandlers(): void {
  const db = getDb()

  // ── personal_information (single-row) ──────────────────────────────

  ipcMain.handle('form:getPersonalInfo', () => {
    const row = db.prepare('SELECT * FROM personal_information LIMIT 1').get() as Row | undefined
    if (!row) return null
    if (row.ssn_encrypted && typeof row.ssn_encrypted === 'string') {
      try {
        row.ssn_encrypted = decryptSsn(row.ssn_encrypted)
      } catch {
        // If decryption fails, return null for SSN
        row.ssn_encrypted = null
      }
    }
    return row
  })

  ipcMain.handle('form:savePersonalInfo', (_event, data: Record<string, unknown>) => {
    // Encrypt SSN if present
    if (data.ssn_encrypted && typeof data.ssn_encrypted === 'string') {
      data.ssn_encrypted = encryptSsn(data.ssn_encrypted)
    }

    const existing = db.prepare('SELECT id FROM personal_information LIMIT 1').get() as { id: string } | undefined

    let id: string
    if (existing) {
      id = existing.id
      const { setClauses, params } = buildUpsertColumns(data, ['id', 'created_at'])
      if (setClauses.length > 0) {
        setClauses.push("updated_at = datetime('now')")
        params.id = id
        db.prepare(`UPDATE personal_information SET ${setClauses.join(', ')} WHERE id = @id`).run(params)
      }
    } else {
      id = crypto.randomUUID()
      const { insertColumns, insertPlaceholders, params } = buildUpsertColumns(data, ['id', 'created_at', 'updated_at'])
      insertColumns.unshift('id')
      insertPlaceholders.unshift('@id')
      params.id = id
      db.prepare(
        `INSERT INTO personal_information (${insertColumns.join(', ')}, created_at, updated_at) VALUES (${insertPlaceholders.join(', ')}, datetime('now'), datetime('now'))`
      ).run(params)
    }

    const row = db.prepare('SELECT * FROM personal_information WHERE id = ?').get(id) as Row
    // Decrypt SSN before returning
    if (row.ssn_encrypted && typeof row.ssn_encrypted === 'string') {
      try {
        row.ssn_encrypted = decryptSsn(row.ssn_encrypted)
      } catch {
        row.ssn_encrypted = null
      }
    }
    return row
  })

  // ── military_service (single-row) ──────────────────────────────────

  ipcMain.handle('form:getMilitaryService', () => {
    const row = db.prepare('SELECT * FROM military_service LIMIT 1').get() as Row | undefined
    return row ?? null
  })

  ipcMain.handle('form:saveMilitaryService', (_event, data: Record<string, unknown>) => {
    const existing = db.prepare('SELECT id FROM military_service LIMIT 1').get() as { id: string } | undefined

    let id: string
    if (existing) {
      id = existing.id
      const { setClauses, params } = buildUpsertColumns(data, ['id', 'created_at'])
      if (setClauses.length > 0) {
        setClauses.push("updated_at = datetime('now')")
        params.id = id
        db.prepare(`UPDATE military_service SET ${setClauses.join(', ')} WHERE id = @id`).run(params)
      }
    } else {
      id = crypto.randomUUID()
      const { insertColumns, insertPlaceholders, params } = buildUpsertColumns(data, ['id', 'created_at', 'updated_at'])
      insertColumns.unshift('id')
      insertPlaceholders.unshift('@id')
      params.id = id
      db.prepare(
        `INSERT INTO military_service (${insertColumns.join(', ')}, created_at, updated_at) VALUES (${insertPlaceholders.join(', ')}, datetime('now'), datetime('now'))`
      ).run(params)
    }

    return db.prepare('SELECT * FROM military_service WHERE id = ?').get(id)
  })

  // ── va_disability_info (single-row) ────────────────────────────────

  ipcMain.handle('form:getVaDisabilityInfo', () => {
    const row = db.prepare('SELECT * FROM va_disability_info LIMIT 1').get() as Row | undefined
    return row ?? null
  })

  ipcMain.handle('form:saveVaDisabilityInfo', (_event, data: Record<string, unknown>) => {
    const existing = db.prepare('SELECT id FROM va_disability_info LIMIT 1').get() as { id: string } | undefined

    let id: string
    if (existing) {
      id = existing.id
      const { setClauses, params } = buildUpsertColumns(data, ['id', 'created_at'])
      if (setClauses.length > 0) {
        setClauses.push("updated_at = datetime('now')")
        params.id = id
        db.prepare(`UPDATE va_disability_info SET ${setClauses.join(', ')} WHERE id = @id`).run(params)
      }
    } else {
      id = crypto.randomUUID()
      const { insertColumns, insertPlaceholders, params } = buildUpsertColumns(data, ['id', 'created_at', 'updated_at'])
      insertColumns.unshift('id')
      insertPlaceholders.unshift('@id')
      params.id = id
      db.prepare(
        `INSERT INTO va_disability_info (${insertColumns.join(', ')}, created_at, updated_at) VALUES (${insertPlaceholders.join(', ')}, datetime('now'), datetime('now'))`
      ).run(params)
    }

    return db.prepare('SELECT * FROM va_disability_info WHERE id = ?').get(id)
  })

  // ── disability_claims (multiple rows) ──────────────────────────────

  ipcMain.handle('form:getDisabilityClaims', () => {
    return db.prepare('SELECT * FROM disability_claims ORDER BY created_at').all()
  })

  ipcMain.handle('form:createDisabilityClaim', (_event, data: Record<string, unknown>) => {
    const id = crypto.randomUUID()
    const { insertColumns, insertPlaceholders, params } = buildUpsertColumns(data, ['id', 'created_at', 'updated_at'])
    insertColumns.unshift('id')
    insertPlaceholders.unshift('@id')
    params.id = id
    db.prepare(
      `INSERT INTO disability_claims (${insertColumns.join(', ')}, created_at, updated_at) VALUES (${insertPlaceholders.join(', ')}, datetime('now'), datetime('now'))`
    ).run(params)
    return db.prepare('SELECT * FROM disability_claims WHERE id = ?').get(id)
  })

  ipcMain.handle('form:updateDisabilityClaim', (_event, id: string, data: Record<string, unknown>) => {
    const { setClauses, params } = buildUpsertColumns(data, ['id', 'created_at'])
    if (setClauses.length > 0) {
      setClauses.push("updated_at = datetime('now')")
      params.id = id
      db.prepare(`UPDATE disability_claims SET ${setClauses.join(', ')} WHERE id = @id`).run(params)
    }
    return db.prepare('SELECT * FROM disability_claims WHERE id = ?').get(id)
  })

  ipcMain.handle('form:deleteDisabilityClaim', (_event, id: string) => {
    db.prepare('DELETE FROM disability_claims WHERE id = ?').run(id)
  })

  // ── secondary_conditions (multiple rows, FK to disability_claims) ──

  ipcMain.handle('form:getSecondaryConditions', (_event, claimId: string) => {
    return db.prepare('SELECT * FROM secondary_conditions WHERE primary_claim_id = ?').all(claimId)
  })

  ipcMain.handle('form:createSecondaryCondition', (_event, data: Record<string, unknown>) => {
    const id = crypto.randomUUID()
    const { insertColumns, insertPlaceholders, params } = buildUpsertColumns(data, ['id', 'created_at'])
    insertColumns.unshift('id')
    insertPlaceholders.unshift('@id')
    params.id = id
    db.prepare(
      `INSERT INTO secondary_conditions (${insertColumns.join(', ')}, created_at) VALUES (${insertPlaceholders.join(', ')}, datetime('now'))`
    ).run(params)
    return db.prepare('SELECT * FROM secondary_conditions WHERE id = ?').get(id)
  })

  ipcMain.handle('form:deleteSecondaryCondition', (_event, id: string) => {
    db.prepare('DELETE FROM secondary_conditions WHERE id = ?').run(id)
  })

  // ── documents (multiple rows) ──────────────────────────────────────

  ipcMain.handle('form:getDocuments', () => {
    return db.prepare('SELECT * FROM documents ORDER BY uploaded_at DESC').all()
  })

  ipcMain.handle('form:createDocument', (_event, data: Record<string, unknown>) => {
    const id = crypto.randomUUID()
    const { insertColumns, insertPlaceholders, params } = buildUpsertColumns(data, ['id', 'uploaded_at'])
    insertColumns.unshift('id')
    insertPlaceholders.unshift('@id')
    params.id = id
    db.prepare(
      `INSERT INTO documents (${insertColumns.join(', ')}, uploaded_at) VALUES (${insertPlaceholders.join(', ')}, datetime('now'))`
    ).run(params)
    return db.prepare('SELECT * FROM documents WHERE id = ?').get(id)
  })

  ipcMain.handle('form:deleteDocument', (_event, id: string) => {
    db.prepare('DELETE FROM documents WHERE id = ?').run(id)
  })

  // ── packet_status ──────────────────────────────────────────────────

  ipcMain.handle('form:getPacketStatus', () => {
    return db.prepare('SELECT * FROM packet_status ORDER BY created_at').all()
  })

  ipcMain.handle('form:updatePacketStep', (_event, stepName: string, status: string) => {
    db.prepare(
      `UPDATE packet_status SET step_status = @status, updated_at = datetime('now'), completed_at = CASE WHEN @status = 'completed' THEN datetime('now') ELSE NULL END WHERE step_name = @stepName`
    ).run({ status, stepName })
    return db.prepare('SELECT * FROM packet_status WHERE step_name = ?').get(stepName)
  })

  ipcMain.handle('form:resetPacketStatus', () => {
    db.prepare(
      "UPDATE packet_status SET step_status = 'not_started', completed_at = NULL, updated_at = datetime('now')"
    ).run()
  })
}
