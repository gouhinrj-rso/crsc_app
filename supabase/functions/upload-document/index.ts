import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getDbClient(): Promise<Client> {
  const client = new Client({
    hostname: Deno.env.get('DB_HOST')!,
    port: parseInt(Deno.env.get('DB_PORT') || '5432'),
    user: Deno.env.get('DB_USER')!,
    password: Deno.env.get('DB_PASSWORD')!,
    database: Deno.env.get('DB_NAME')!,
    tls: { enabled: true, enforce: true, caCertificates: [] },
  })
  await client.connect()
  return client
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let db: Client | null = null

  try {
    const { userId, documentType, fileName, fileSize, mimeType, fileBase64 } = await req.json()

    if (!userId || !documentType || !fileName || !fileBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Construct GCS path
    const bucketName = Deno.env.get('GCS_BUCKET_NAME') || 'crsc-documents'
    const gcsPath = `gs://${bucketName}/uploads/${userId}/${documentType}/${fileName}`

    // Upload to Google Cloud Storage if credentials are available
    const gcsProjectId = Deno.env.get('GCS_PROJECT_ID')
    const gcsClientEmail = Deno.env.get('GCS_CLIENT_EMAIL')
    const gcsPrivateKey = Deno.env.get('GCS_PRIVATE_KEY')

    if (gcsProjectId && gcsClientEmail && gcsPrivateKey) {
      // Decode base64 to bytes for upload
      const fileBytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0))
      const objectName = `uploads/${userId}/${documentType}/${fileName}`

      // Upload using GCS JSON API with service account
      const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(objectName)}`

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': mimeType || 'application/octet-stream',
          'Authorization': `Bearer ${await getAccessToken(gcsClientEmail, gcsPrivateKey)}`,
        },
        body: fileBytes,
      })

      if (!uploadResponse.ok) {
        console.error('[upload-document] GCS upload failed:', await uploadResponse.text())
        // Continue to save the DB record even if GCS upload fails
      } else {
        console.log(`[upload-document] File uploaded to GCS: ${gcsPath}`)
      }
    } else {
      console.warn('[upload-document] GCS credentials not configured, skipping cloud upload')
    }

    // Save document record to database
    db = await getDbClient()

    const res = await db.queryObject`
      INSERT INTO documents (user_id, document_type, file_name, file_path, file_size, mime_type, uploaded_at)
      VALUES (${userId}, ${documentType}, ${fileName}, ${gcsPath}, ${fileSize || null}, ${mimeType || null}, NOW())
      RETURNING *
    `

    // Create audit log entry
    const docId = (res.rows[0] as Record<string, unknown>)?.id
    await db.queryObject`
      INSERT INTO audit_log (user_id, action, resource_type, resource_id, created_at)
      VALUES (${userId}, ${'upload'}, ${'documents'}, ${docId}, NOW())
    `

    await db.end()

    return new Response(
      JSON.stringify({ data: res.rows[0], error: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[upload-document] Error:', error)
    if (db) {
      try { await db.end() } catch { /* ignore */ }
    }
    return new Response(
      JSON.stringify({ data: null, error: error instanceof Error ? error.message : 'Upload failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// Helper to get GCS access token from service account credentials
async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = btoa(JSON.stringify({
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/devstorage.read_write',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))

  const signInput = `${header}.${claim}`

  // Import the private key for signing
  const pemKey = privateKey.replace(/\\n/g, '\n')
  const pemContent = pemKey.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '')
  const keyBuffer = Uint8Array.from(atob(pemContent), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signInput)
  )

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const jwt = `${header}.${claim}.${signatureB64}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const tokenData = await tokenResponse.json()
  return tokenData.access_token
}
