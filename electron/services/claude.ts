import Anthropic from '@anthropic-ai/sdk'
import { getDb } from '../db/database'
import fs from 'fs'
import path from 'path'
import { app } from 'electron'

let cachedSystemPrompt: string | null = null

function getApiKey(): string {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('api_key') as
    | { value: string }
    | undefined
  if (!row?.value)
    throw new Error('No API key configured. Please set your Anthropic API key in Settings.')
  return row.value
}

function loadReferenceFile(filename: string): string {
  const basePaths = [
    path.join(process.resourcesPath || '', 'resources'),
    path.join(app.getAppPath(), 'resources'),
    app.getAppPath(),
    process.cwd(),
  ]

  for (const base of basePaths) {
    try {
      const filePath = path.join(base, filename)
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8')
      }
    } catch {
      /* continue searching */
    }
  }

  return ''
}

function loadSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt

  const crscVaText = loadReferenceFile('crsc_va.txt')
  const crscRefText = loadReferenceFile('crsc_reference_text.txt')

  const basePrompt = `You are a CRSC (Combat-Related Special Compensation) filing assistant helping military veterans file for their combat-related disability compensation. Your role is to:

1. Guide veterans through the CRSC eligibility requirements
2. Collect all necessary information in a conversational manner
3. Explain complex military and VA terminology in plain language
4. Help veterans understand what documentation they need
5. Assist in describing combat-related events accurately
6. Ensure completeness before package generation

Key Guidelines:
- Be empathetic and patient
- Use clear, simple language
- Verify eligibility before proceeding
- Explain the combat-related codes (PH, AC, HS, SW, IN, AO, RE, GW, MG)
- Help identify which disabilities may qualify as combat-related
- Remind veterans NOT to send original documents
- Note: Following the Supreme Court's June 2025 ruling in Soto v. United States, the previous 6-year back pay limit has been eliminated. Eligible veterans may now receive full retroactive payments to their initial eligibility date.

Combat-Related Codes Reference:
- PH: Purple Heart - Injury from armed conflict
- AC: Armed Conflict - Direct result of armed conflict
- HS: Hazardous Service - Demolition, flight, parachuting, etc.
- SW: Simulating War - Live fire practice, hand-to-hand combat training
- IN: Instrument of War - Injury from military vehicle, weapon, chemical agent
- AO: Agent Orange - Exposure to herbicides (presumptive)
- RE: Radiation Exposure - Combat-related radiation exposure
- GW: Gulf War - Gulf War-related disabilities (presumptive)
- MG: Mustard Gas - Exposure to mustard gas or Lewisite`

  const referenceSections: string[] = [basePrompt]

  if (crscVaText) {
    referenceSections.push(
      `\n\n--- CRSC VA Reference Information ---\n${crscVaText}`
    )
  }

  if (crscRefText) {
    referenceSections.push(
      `\n\n--- CRSC Reference Guide ---\n${crscRefText}`
    )
  }

  cachedSystemPrompt = referenceSections.join('')
  return cachedSystemPrompt
}

export interface StreamCallbacks {
  onChunk: (text: string) => void
  onComplete: (fullText: string) => void
  onError: (error: string) => void
}

export async function streamChat(
  message: string,
  conversationHistory: Array<{ role: string; content: string }>,
  callbacks: StreamCallbacks
): Promise<void> {
  const apiKey = getApiKey()
  const client = new Anthropic({ apiKey })

  // Get model from settings, default to claude-sonnet-4-20250514
  const db = getDb()
  const modelRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('model') as
    | { value: string }
    | undefined
  const model = modelRow?.value || 'claude-sonnet-4-20250514'

  const systemPrompt = loadSystemPrompt()

  // Build messages array - filter to only user/assistant roles
  const messages = conversationHistory
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  let fullText = ''

  try {
    const stream = client.messages.stream({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        fullText += event.delta.text
        callbacks.onChunk(event.delta.text)
      }
    }

    callbacks.onComplete(fullText)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'
    callbacks.onError(errorMsg)
  }
}
