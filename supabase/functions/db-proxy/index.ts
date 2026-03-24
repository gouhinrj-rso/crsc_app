import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create PostgreSQL client for Google Cloud with TLS
async function getDbClient(): Promise<Client> {
  const hostname = Deno.env.get('DB_HOST')!
  const port = parseInt(Deno.env.get('DB_PORT') || '5432')
  const user = Deno.env.get('DB_USER')!
  const password = Deno.env.get('DB_PASSWORD')!
  const database = Deno.env.get('DB_NAME')!

  console.log(`[db-proxy] Connecting to PostgreSQL at ${hostname}:${port}/${database} as ${user}`)

  const client = new Client({
    hostname,
    port,
    user,
    password,
    database,
    tls: {
      enabled: true,
      enforce: true,  // Force TLS, don't fall back to non-TLS
      caCertificates: [],  // Accept any certificate (self-signed)
    },
  })

  try {
    await client.connect()
    console.log('[db-proxy] Successfully connected to PostgreSQL with TLS')
    return client
  } catch (error) {
    console.error('[db-proxy] Failed to connect to PostgreSQL:', error)
    throw error
  }
}

interface DbProxyRequest {
  operation: string
  table: string
  userId: string
  data?: Record<string, unknown>
  id?: string
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let db: Client | null = null

  try {
    const { operation, table, userId, data, id } = await req.json() as DbProxyRequest

    if (!operation || !table || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: operation, table, userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    db = await getDbClient()

    // Helper to create audit log entries
    async function logAudit(action: string, resourceType: string, resourceId?: string) {
      try {
        await db!.queryObject`
          INSERT INTO audit_log (user_id, action, resource_type, resource_id, created_at)
          VALUES (${userId}, ${action}, ${resourceType}, ${resourceId || null}, NOW())
        `
      } catch (e) {
        console.error('[db-proxy] Audit log error:', e)
      }
    }

    let result: unknown = null

    switch (operation) {
      // ==================== SELECT Operations ====================
      case 'get_personal_info': {
        const res = await db.queryObject`
          SELECT * FROM personal_information WHERE user_id = ${userId}
        `
        result = res.rows[0] || null
        await logAudit('read', 'personal_information')
        break
      }

      case 'get_military_service': {
        const res = await db.queryObject`
          SELECT * FROM military_service WHERE user_id = ${userId}
        `
        result = res.rows[0] || null
        await logAudit('read', 'military_service')
        break
      }

      case 'get_va_disability_info': {
        const res = await db.queryObject`
          SELECT * FROM va_disability_info WHERE user_id = ${userId}
        `
        result = res.rows[0] || null
        await logAudit('read', 'va_disability_info')
        break
      }

      case 'get_disability_claims': {
        const res = await db.queryObject`
          SELECT * FROM disability_claims WHERE user_id = ${userId} ORDER BY created_at ASC
        `
        result = res.rows
        break
      }

      case 'get_documents': {
        const res = await db.queryObject`
          SELECT * FROM documents WHERE user_id = ${userId} ORDER BY uploaded_at DESC
        `
        result = res.rows
        break
      }

      case 'get_chat_history': {
        const res = await db.queryObject`
          SELECT * FROM chat_history WHERE user_id = ${userId} ORDER BY created_at ASC
        `
        result = res.rows
        break
      }

      case 'get_packet_status': {
        const res = await db.queryObject`
          SELECT * FROM packet_status WHERE user_id = ${userId} ORDER BY created_at ASC
        `
        result = res.rows
        break
      }

      case 'get_user': {
        const res = await db.queryObject`
          SELECT * FROM users WHERE id = ${userId}
        `
        result = res.rows[0] || null
        break
      }

      case 'get_verification_status': {
        const res = await db.queryObject`
          SELECT veteran_verified, veteran_verified_at, military_status
          FROM users WHERE id = ${userId}
        `
        result = res.rows[0] || null
        break
      }

      case 'get_verification_log': {
        const res = await db.queryObject`
          SELECT * FROM verification_log
          WHERE user_id = ${userId}
          ORDER BY created_at DESC
          LIMIT 10
        `
        result = res.rows
        break
      }

      // ==================== UPSERT Operations ====================
      case 'upsert_personal_info': {
        const d = data!
        await db.queryObject`
          INSERT INTO personal_information (user_id, first_name, middle_initial, last_name, ssn_encrypted, date_of_birth, email, phone, address_line1, address_line2, city, state, zip_code, updated_at)
          VALUES (${userId}, ${d.first_name || null}, ${d.middle_initial || null}, ${d.last_name || null}, ${d.ssn_encrypted || null}, ${d.date_of_birth || null}, ${d.email || null}, ${d.phone || null}, ${d.address_line1 || null}, ${d.address_line2 || null}, ${d.city || null}, ${d.state || null}, ${d.zip_code || null}, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            first_name = COALESCE(EXCLUDED.first_name, personal_information.first_name),
            middle_initial = COALESCE(EXCLUDED.middle_initial, personal_information.middle_initial),
            last_name = COALESCE(EXCLUDED.last_name, personal_information.last_name),
            ssn_encrypted = COALESCE(EXCLUDED.ssn_encrypted, personal_information.ssn_encrypted),
            date_of_birth = COALESCE(EXCLUDED.date_of_birth, personal_information.date_of_birth),
            email = COALESCE(EXCLUDED.email, personal_information.email),
            phone = COALESCE(EXCLUDED.phone, personal_information.phone),
            address_line1 = COALESCE(EXCLUDED.address_line1, personal_information.address_line1),
            address_line2 = COALESCE(EXCLUDED.address_line2, personal_information.address_line2),
            city = COALESCE(EXCLUDED.city, personal_information.city),
            state = COALESCE(EXCLUDED.state, personal_information.state),
            zip_code = COALESCE(EXCLUDED.zip_code, personal_information.zip_code),
            updated_at = NOW()
        `
        const res = await db.queryObject`
          SELECT * FROM personal_information WHERE user_id = ${userId}
        `
        result = res.rows[0]
        break
      }

      case 'upsert_military_service': {
        const d = data!
        await db.queryObject`
          INSERT INTO military_service (user_id, branch, service_number, retired_rank, retirement_date, years_of_service, retirement_type, dd214_uploaded, retirement_orders_uploaded, updated_at)
          VALUES (${userId}, ${d.branch || null}, ${d.service_number || null}, ${d.retired_rank || null}, ${d.retirement_date || null}, ${d.years_of_service || null}, ${d.retirement_type || null}, ${d.dd214_uploaded || false}, ${d.retirement_orders_uploaded || false}, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            branch = COALESCE(EXCLUDED.branch, military_service.branch),
            service_number = COALESCE(EXCLUDED.service_number, military_service.service_number),
            retired_rank = COALESCE(EXCLUDED.retired_rank, military_service.retired_rank),
            retirement_date = COALESCE(EXCLUDED.retirement_date, military_service.retirement_date),
            years_of_service = COALESCE(EXCLUDED.years_of_service, military_service.years_of_service),
            retirement_type = COALESCE(EXCLUDED.retirement_type, military_service.retirement_type),
            dd214_uploaded = COALESCE(EXCLUDED.dd214_uploaded, military_service.dd214_uploaded),
            retirement_orders_uploaded = COALESCE(EXCLUDED.retirement_orders_uploaded, military_service.retirement_orders_uploaded),
            updated_at = NOW()
        `
        const res = await db.queryObject`
          SELECT * FROM military_service WHERE user_id = ${userId}
        `
        result = res.rows[0]
        break
      }

      case 'upsert_va_disability_info': {
        const d = data!
        await db.queryObject`
          INSERT INTO va_disability_info (user_id, va_file_number, current_va_rating, va_decision_date, has_va_waiver, receives_crdp, code_sheet_uploaded, decision_letter_uploaded, updated_at)
          VALUES (${userId}, ${d.va_file_number || null}, ${d.current_va_rating || null}, ${d.va_decision_date || null}, ${d.has_va_waiver || false}, ${d.receives_crdp || false}, ${d.code_sheet_uploaded || false}, ${d.decision_letter_uploaded || false}, NOW())
          ON CONFLICT (user_id) DO UPDATE SET
            va_file_number = COALESCE(EXCLUDED.va_file_number, va_disability_info.va_file_number),
            current_va_rating = COALESCE(EXCLUDED.current_va_rating, va_disability_info.current_va_rating),
            va_decision_date = COALESCE(EXCLUDED.va_decision_date, va_disability_info.va_decision_date),
            has_va_waiver = COALESCE(EXCLUDED.has_va_waiver, va_disability_info.has_va_waiver),
            receives_crdp = COALESCE(EXCLUDED.receives_crdp, va_disability_info.receives_crdp),
            code_sheet_uploaded = COALESCE(EXCLUDED.code_sheet_uploaded, va_disability_info.code_sheet_uploaded),
            decision_letter_uploaded = COALESCE(EXCLUDED.decision_letter_uploaded, va_disability_info.decision_letter_uploaded),
            updated_at = NOW()
        `
        const res = await db.queryObject`
          SELECT * FROM va_disability_info WHERE user_id = ${userId}
        `
        result = res.rows[0]
        break
      }

      case 'upsert_packet_status': {
        const d = data!
        const completedAt = d.step_status === 'completed' ? new Date() : null
        await db.queryObject`
          INSERT INTO packet_status (user_id, step_name, step_status, completed_at, updated_at)
          VALUES (${userId}, ${d.step_name}, ${d.step_status}, ${completedAt}, NOW())
          ON CONFLICT (user_id, step_name) DO UPDATE SET
            step_status = EXCLUDED.step_status,
            completed_at = EXCLUDED.completed_at,
            updated_at = NOW()
        `
        const res = await db.queryObject`
          SELECT * FROM packet_status WHERE user_id = ${userId} AND step_name = ${d.step_name}
        `
        result = res.rows[0]
        break
      }

      // ==================== INSERT Operations ====================
      case 'create_user': {
        const d = data!
        await db.queryObject`
          INSERT INTO users (id, email, created_at, updated_at)
          VALUES (${userId}, ${d.email}, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `
        const res = await db.queryObject`
          SELECT * FROM users WHERE id = ${userId}
        `
        result = res.rows[0]
        break
      }

      case 'create_disability_claim': {
        const d = data!
        const res = await db.queryObject`
          INSERT INTO disability_claims (user_id, disability_title, disability_code, body_part_affected, date_awarded_by_va, initial_rating_percentage, current_rating_percentage, combat_related_code, unit_of_assignment, location_of_injury, description_of_event, received_purple_heart, has_secondary_conditions, created_at, updated_at)
          VALUES (${userId}, ${d.disability_title || null}, ${d.disability_code || null}, ${d.body_part_affected || null}, ${d.date_awarded_by_va || null}, ${d.initial_rating_percentage || null}, ${d.current_rating_percentage || null}, ${d.combat_related_code || null}, ${d.unit_of_assignment || null}, ${d.location_of_injury || null}, ${d.description_of_event || null}, ${d.received_purple_heart || false}, ${d.has_secondary_conditions || false}, NOW(), NOW())
          RETURNING *
        `
        result = res.rows[0]
        break
      }

      case 'create_document': {
        const d = data!
        const res = await db.queryObject`
          INSERT INTO documents (user_id, document_type, file_name, file_path, file_size, mime_type, uploaded_at)
          VALUES (${userId}, ${d.document_type || null}, ${d.file_name || null}, ${d.file_path || null}, ${d.file_size || null}, ${d.mime_type || null}, NOW())
          RETURNING *
        `
        result = res.rows[0]
        break
      }

      case 'add_chat_message': {
        const d = data!
        const res = await db.queryObject`
          INSERT INTO chat_history (user_id, message, role, created_at)
          VALUES (${userId}, ${d.message}, ${d.role}, NOW())
          RETURNING *
        `
        result = res.rows[0]
        break
      }

      // ==================== UPDATE Operations ====================
      case 'update_disability_claim': {
        const d = data!
        await db.queryObject`
          UPDATE disability_claims SET
            disability_title = COALESCE(${d.disability_title || null}, disability_title),
            disability_code = COALESCE(${d.disability_code || null}, disability_code),
            body_part_affected = COALESCE(${d.body_part_affected || null}, body_part_affected),
            date_awarded_by_va = COALESCE(${d.date_awarded_by_va || null}, date_awarded_by_va),
            initial_rating_percentage = COALESCE(${d.initial_rating_percentage || null}, initial_rating_percentage),
            current_rating_percentage = COALESCE(${d.current_rating_percentage || null}, current_rating_percentage),
            combat_related_code = COALESCE(${d.combat_related_code || null}, combat_related_code),
            unit_of_assignment = COALESCE(${d.unit_of_assignment || null}, unit_of_assignment),
            location_of_injury = COALESCE(${d.location_of_injury || null}, location_of_injury),
            description_of_event = COALESCE(${d.description_of_event || null}, description_of_event),
            received_purple_heart = COALESCE(${d.received_purple_heart}, received_purple_heart),
            has_secondary_conditions = COALESCE(${d.has_secondary_conditions}, has_secondary_conditions),
            updated_at = NOW()
          WHERE id = ${id}
        `
        const res = await db.queryObject`
          SELECT * FROM disability_claims WHERE id = ${id}
        `
        result = res.rows[0]
        break
      }

      case 'update_user': {
        const d = data!
        await db.queryObject`
          UPDATE users SET
            profile_completed = COALESCE(${d.profile_completed}, profile_completed),
            packet_status = COALESCE(${d.packet_status || null}, packet_status),
            last_login = COALESCE(${d.last_login || null}, last_login),
            updated_at = NOW()
          WHERE id = ${userId}
        `
        const res = await db.queryObject`
          SELECT * FROM users WHERE id = ${userId}
        `
        result = res.rows[0]
        break
      }

      // ==================== DELETE Operations ====================
      case 'delete_disability_claim': {
        await db.queryObject`
          DELETE FROM disability_claims WHERE id = ${id} AND user_id = ${userId}
        `
        result = { success: true }
        break
      }

      case 'delete_document': {
        await db.queryObject`
          DELETE FROM documents WHERE id = ${id} AND user_id = ${userId}
        `
        result = { success: true }
        break
      }

      case 'clear_chat_history': {
        await db.queryObject`
          DELETE FROM chat_history WHERE user_id = ${userId}
        `
        result = { success: true }
        break
      }

      case 'reset_packet_status': {
        await db.queryObject`
          DELETE FROM packet_status WHERE user_id = ${userId}
        `
        result = { success: true }
        break
      }

      case 'create_audit_log': {
        const d = data!
        const res = await db.queryObject`
          INSERT INTO audit_log (user_id, action, resource_type, resource_id, created_at)
          VALUES (${userId}, ${d.action}, ${d.resource_type}, ${d.resource_id || null}, NOW())
          RETURNING *
        `
        result = res.rows[0]
        break
      }

      // ==================== Document Upload ====================
      case 'upload_document': {
        const d = data!
        // Store the file data as a base64 string in the file_path column
        // In production, this would upload to GCS and store the GCS path
        const gcsPath = `gs://${Deno.env.get('GCS_BUCKET_NAME') || 'crsc-documents'}/uploads/${userId}/${d.document_type}/${d.file_name}`
        const res = await db.queryObject`
          INSERT INTO documents (user_id, document_type, file_name, file_path, file_size, mime_type, uploaded_at)
          VALUES (${userId}, ${d.document_type || null}, ${d.file_name || null}, ${gcsPath}, ${d.file_size || null}, ${d.mime_type || null}, NOW())
          RETURNING *
        `
        result = res.rows[0]
        await logAudit('upload', 'documents', (res.rows[0] as Record<string, unknown>)?.id as string)
        break
      }

      default:
        await db.end()
        return new Response(
          JSON.stringify({ error: `Unknown operation: ${operation}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

    await db.end()

    return new Response(
      JSON.stringify({ data: result, error: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('DB Proxy error:', error)
    if (db) {
      try {
        await db.end()
      } catch {
        // Ignore close errors
      }
    }
    return new Response(
      JSON.stringify({ data: null, error: error instanceof Error ? error.message : 'Database operation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
