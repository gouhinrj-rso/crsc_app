import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk@0.24.3'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create Supabase admin client (bypasses RLS)
function getSupabaseAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

// CRSC System prompt with reference information
const SYSTEM_PROMPT = `You are a CRSC (Combat-Related Special Compensation) filing assistant helping military veterans file for their combat-related disability compensation. Your role is to:

1. Guide veterans through the CRSC eligibility requirements
2. Collect all necessary information in a conversational manner
3. Explain complex military and VA terminology in plain language
4. Help veterans understand what documentation they need
5. Assist in describing combat-related events accurately
6. Ensure completeness before package generation

## CRSC Eligibility Requirements
To be eligible for CRSC, a veteran must:
1. Be entitled to military retired pay
2. Have a VA-rated disability of at least 10%
3. Have disabilities that are combat-related

## Combat-Related Codes
- PH (Purple Heart): Injury from armed conflict
- AC (Armed Conflict): Direct result of armed conflict
- HS (Hazardous Service): Demolition, flight, parachuting, etc.
- SW (Simulating War): Live fire practice, hand-to-hand combat training
- IN (Instrument of War): Injury from military vehicle, weapon, chemical agent
- AO (Agent Orange): Exposure to herbicides (presumptive)
- RE (Radiation Exposure): Combat-related radiation exposure
- GW (Gulf War): Gulf War-related disabilities (presumptive)
- MG (Mustard Gas): Exposure to mustard gas or Lewisite

## Key Guidelines
- Be empathetic and patient - these veterans have served their country
- Use clear, simple language avoiding unnecessary jargon
- Verify eligibility before proceeding with detailed information collection
- Explain what each combat-related code means and help veterans identify which applies
- Help veterans articulate their combat-related events clearly and completely
- Remind veterans NOT to send original documents - only copies
- Note: Following the Supreme Court's June 2025 ruling in Soto v. United States, the previous 6-year back pay limit has been eliminated. Eligible veterans may now receive full retroactive payments to their initial eligibility date.

## Information Collection Flow
1. First verify eligibility (retired with pay, VA rating, disability offset)
2. Collect personal information (name, SSN, DOB, contact info, address)
3. Collect military service details (branch, rank, retirement date, type)
4. Collect VA disability information (file number, rating, decision date)
5. For each disability claim:
   - Disability title and body part affected
   - VA rating percentage
   - Combat-related code (explain options)
   - Unit of assignment when injured
   - Location where injury occurred
   - Detailed description of the event
   - Purple Heart status if applicable
6. Guide through required document uploads

## Important Reminders
- CRSC is tax-free compensation
- Claims must be filed with the veteran's military service branch
- Processing times vary by branch (typically 4-6 months)
- If denied, veterans can request reconsideration within 1 year

## VA Claim Letters Resource
When veterans need to find their VA disability codes or claim letters, direct them to the VA's claim letters portal:
[View Your VA Claim Letters](https://www.va.gov/track-claims/your-claim-letters)
Always format this as a clickable markdown link so they can easily access it.

## Document Upload Requests
When you need the veteran to upload a document for automatic data extraction, include ONE of these markers at the END of your response:
- For VA Decision Letter: [UPLOAD_REQUEST:va_decision_letter]
- For VA Code Sheet: [UPLOAD_REQUEST:va_code_sheet]
- For DD214: [UPLOAD_REQUEST:dd214]

This marker will be replaced with an upload dropzone in the chat interface. The veteran can drag-and-drop or click to upload their document, and the system will automatically extract the relevant information.

Use this feature when:
1. Collecting VA disability information - request the VA decision letter or code sheet
2. Collecting military service information - request the DD214

Example:
"To make this process easier, please upload your VA rating decision letter. I'll automatically extract your disabilities, ratings, and diagnostic codes from it.

[UPLOAD_REQUEST:va_decision_letter]"

## Handling Extracted Document Data
When you receive a message starting with [EXTRACTED_DATA:document_type], it contains data that was automatically extracted from a document the veteran uploaded. The format is:
[EXTRACTED_DATA:va_decision_letter]{"disabilities":[...],"combinedRating":100,...}

When you receive extracted data:
1. Parse the JSON data following the marker
2. Present the extracted information clearly and conversationally to the veteran
3. Ask them to confirm if the information is correct
4. If they confirm, use the appropriate save tools to store the data:
   - For VA decision letters: call save_va_disability_info for overall rating, then save_disability_claim for EACH disability
   - For code sheets: similar process with disability codes
   - For DD214: call save_military_service with the extracted information
5. If the veteran indicates there are errors, ask them to provide corrections

Example response after receiving extracted data:
"I found the following information in your VA decision letter:

**Combined Rating:** 100%
**Decision Date:** March 15, 2024

**Service-Connected Disabilities:**
1. PTSD - 70% (Code 9411)
2. Tinnitus - 10% (Code 6260)
3. Lumbar Strain - 20% (Code 5237)

Does this match your VA decision letter? If everything looks correct, I'll add these disabilities to your CRSC application. If anything needs to be corrected, please let me know."

Be conversational but efficient. Ask one or two related questions at a time. Validate information before moving to the next section. If the veteran seems confused, offer to explain or provide examples.

## IMPORTANT: Data Collection and Progress Tracking
When you collect information from the veteran, you MUST use the appropriate tool to save the data. After confirming information with the veteran, call the relevant save function. Always confirm before saving.

Available data categories to save:
- Personal information (name, SSN, DOB, contact info, address)
- Military service (branch, rank, retirement date, service number)
- VA disability info (VA file number, rating percentage, decision date)
- Disability claims (each individual disability with details)

## CRITICAL: Progress Status Updates
After EACH successful data save, you MUST call update_phase_status to track progress:

1. After confirming eligibility (retired, VA rating, disability offset) → update_phase_status("eligibility", "completed")
2. After saving personal_info with at least name and contact info → update_phase_status("personal_info", "completed")
3. After saving military_service with branch and retirement type → update_phase_status("military_service", "completed")
4. After saving va_disability_info with rating → update_phase_status("va_disability", "completed")
5. After saving at least one disability_claim → update_phase_status("disability_claims", "in_progress")
6. When veteran indicates they've entered all disabilities → update_phase_status("disability_claims", "completed")

When starting a new section, set it to "in_progress" first. When complete, set to "completed".
ALWAYS update phase status - this is how the progress bar updates for the user!`

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface ChatRequest {
  userId: string
  message: string
  conversationHistory: Message[]
}

// Tool definitions for Claude to save data
const tools: Anthropic.Tool[] = [
  {
    name: 'save_personal_info',
    description: 'Save or update the veteran\'s personal information. Call this after confirming personal details with the veteran.',
    input_schema: {
      type: 'object' as const,
      properties: {
        first_name: { type: 'string', description: 'First name' },
        middle_initial: { type: 'string', description: 'Middle initial (optional)' },
        last_name: { type: 'string', description: 'Last name' },
        ssn: { type: 'string', description: 'Social Security Number (format: XXX-XX-XXXX)' },
        date_of_birth: { type: 'string', description: 'Date of birth (format: YYYY-MM-DD)' },
        email: { type: 'string', description: 'Email address' },
        phone: { type: 'string', description: 'Phone number' },
        address_line1: { type: 'string', description: 'Street address line 1' },
        address_line2: { type: 'string', description: 'Street address line 2 (optional)' },
        city: { type: 'string', description: 'City' },
        state: { type: 'string', description: 'State (2-letter code)' },
        zip_code: { type: 'string', description: 'ZIP code' },
      },
      required: ['first_name', 'last_name'],
    },
  },
  {
    name: 'save_military_service',
    description: 'Save or update the veteran\'s military service information. Call this after confirming military details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        branch: { type: 'string', enum: ['Army', 'Navy', 'Air Force', 'Marine Corps', 'Coast Guard', 'Space Force'], description: 'Branch of service' },
        service_number: { type: 'string', description: 'Service number (optional)' },
        retired_rank: { type: 'string', description: 'Rank at retirement' },
        retirement_date: { type: 'string', description: 'Retirement date (format: YYYY-MM-DD)' },
        years_of_service: { type: 'number', description: 'Total years of service' },
        retirement_type: { type: 'string', enum: ['20+ years', 'Chapter 61', 'TERA', 'TDRL', 'PDRL'], description: 'Type of retirement' },
      },
      required: ['branch', 'retirement_type'],
    },
  },
  {
    name: 'save_va_disability_info',
    description: 'Save or update the veteran\'s VA disability information. Call this after confirming VA details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        va_file_number: { type: 'string', description: 'VA file number' },
        current_va_rating: { type: 'number', description: 'Current combined VA rating percentage (10-100)' },
        va_decision_date: { type: 'string', description: 'Date of most recent VA decision (format: YYYY-MM-DD)' },
        has_va_waiver: { type: 'boolean', description: 'Whether veteran has a VA waiver' },
        receives_crdp: { type: 'boolean', description: 'Whether veteran receives CRDP' },
      },
      required: ['current_va_rating'],
    },
  },
  {
    name: 'save_disability_claim',
    description: 'Save a new disability claim or update an existing one. Call this for each individual disability after confirming details.',
    input_schema: {
      type: 'object' as const,
      properties: {
        disability_title: { type: 'string', description: 'Title/name of the disability' },
        disability_code: { type: 'string', description: 'VA disability code' },
        body_part_affected: { type: 'string', description: 'Body part affected' },
        date_awarded_by_va: { type: 'string', description: 'Date awarded by VA (format: YYYY-MM-DD)' },
        initial_rating_percentage: { type: 'number', description: 'Initial rating percentage' },
        current_rating_percentage: { type: 'number', description: 'Current rating percentage' },
        combat_related_code: { type: 'string', enum: ['PH', 'AC', 'HS', 'SW', 'IN', 'AO', 'RE', 'GW', 'MG'], description: 'Combat-related code' },
        unit_of_assignment: { type: 'string', description: 'Unit of assignment when injured' },
        location_of_injury: { type: 'string', description: 'Location/area where injury occurred' },
        description_of_event: { type: 'string', description: 'Detailed description of the combat-related event' },
        received_purple_heart: { type: 'boolean', description: 'Whether a Purple Heart was received for this injury' },
      },
      required: ['disability_title', 'current_rating_percentage', 'combat_related_code'],
    },
  },
  {
    name: 'update_phase_status',
    description: 'Update the completion status of a phase/step in the application process.',
    input_schema: {
      type: 'object' as const,
      properties: {
        step_name: {
          type: 'string',
          enum: ['eligibility', 'personal_info', 'military_service', 'va_disability', 'disability_claims', 'documents'],
          description: 'The step/phase name'
        },
        status: {
          type: 'string',
          enum: ['not_started', 'in_progress', 'completed', 'requires_review'],
          description: 'The status of the step'
        },
      },
      required: ['step_name', 'status'],
    },
  },
]

// Process tool calls and save data via Supabase
async function processToolCall(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<string> {
  try {
    switch (toolName) {
      case 'save_personal_info': {
        const { error } = await supabase
          .from('personal_information')
          .upsert({
            user_id: userId,
            first_name: toolInput.first_name as string,
            middle_initial: (toolInput.middle_initial as string) || null,
            last_name: toolInput.last_name as string,
            ssn_encrypted: (toolInput.ssn as string) || null,
            date_of_birth: (toolInput.date_of_birth as string) || null,
            email: (toolInput.email as string) || null,
            phone: (toolInput.phone as string) || null,
            address_line1: (toolInput.address_line1 as string) || null,
            address_line2: (toolInput.address_line2 as string) || null,
            city: (toolInput.city as string) || null,
            state: (toolInput.state as string) || null,
            zip_code: (toolInput.zip_code as string) || null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
        if (error) throw error
        return 'Personal information saved successfully.'
      }

      case 'save_military_service': {
        const { error } = await supabase
          .from('military_service')
          .upsert({
            user_id: userId,
            branch: toolInput.branch as string,
            service_number: (toolInput.service_number as string) || null,
            retired_rank: (toolInput.retired_rank as string) || null,
            retirement_date: (toolInput.retirement_date as string) || null,
            years_of_service: (toolInput.years_of_service as number) || null,
            retirement_type: toolInput.retirement_type as string,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
        if (error) throw error
        return 'Military service information saved successfully.'
      }

      case 'save_va_disability_info': {
        const { error } = await supabase
          .from('va_disability_info')
          .upsert({
            user_id: userId,
            va_file_number: (toolInput.va_file_number as string) || null,
            current_va_rating: toolInput.current_va_rating as number,
            va_decision_date: (toolInput.va_decision_date as string) || null,
            has_va_waiver: (toolInput.has_va_waiver as boolean) || false,
            receives_crdp: (toolInput.receives_crdp as boolean) || false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' })
        if (error) throw error
        return 'VA disability information saved successfully.'
      }

      case 'save_disability_claim': {
        const { error } = await supabase
          .from('disability_claims')
          .insert({
            user_id: userId,
            disability_title: toolInput.disability_title as string,
            disability_code: (toolInput.disability_code as string) || null,
            body_part_affected: (toolInput.body_part_affected as string) || null,
            date_awarded_by_va: (toolInput.date_awarded_by_va as string) || null,
            initial_rating_percentage: (toolInput.initial_rating_percentage as number) || null,
            current_rating_percentage: toolInput.current_rating_percentage as number,
            combat_related_code: toolInput.combat_related_code as string,
            unit_of_assignment: (toolInput.unit_of_assignment as string) || null,
            location_of_injury: (toolInput.location_of_injury as string) || null,
            description_of_event: (toolInput.description_of_event as string) || null,
            received_purple_heart: (toolInput.received_purple_heart as boolean) || false,
          })
        if (error) throw error
        return `Disability claim "${toolInput.disability_title}" saved successfully.`
      }

      case 'update_phase_status': {
        const { error } = await supabase
          .from('packet_status')
          .upsert({
            user_id: userId,
            step_name: toolInput.step_name as string,
            step_status: toolInput.status as string,
            completed_at: toolInput.status === 'completed' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,step_name' })
        if (error) throw error
        return `Phase "${toolInput.step_name}" status updated to "${toolInput.status}".`
      }

      default:
        return `Unknown tool: ${toolName}`
    }
  } catch (error) {
    console.error(`Error processing tool ${toolName}:`, error)
    return `Error saving data: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, message, conversationHistory } = await req.json() as ChatRequest

    // Check if client wants streaming (via Accept header)
    const wantsStreaming = req.headers.get('Accept')?.includes('text/event-stream')

    if (!userId || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({
      apiKey: Deno.env.get('ANTHROPIC_API_KEY'),
    })

    // Connect to Supabase
    const supabase = getSupabaseAdmin()

    // Fetch user context from database
    const { data: personalInfo } = await supabase
      .from('personal_information')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .single()

    const { data: militaryService } = await supabase
      .from('military_service')
      .select('branch, retirement_date')
      .eq('user_id', userId)
      .single()

    const { data: vaDisability } = await supabase
      .from('va_disability_info')
      .select('current_va_rating')
      .eq('user_id', userId)
      .single()

    const { count: claimsCount } = await supabase
      .from('disability_claims')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Build context string with user's current data
    let userContext = ''

    if (personalInfo) {
      userContext += `\nUser's Personal Info: ${personalInfo.first_name || 'Not provided'} ${personalInfo.last_name || ''}`
    }
    if (militaryService) {
      userContext += `\nMilitary Service: ${militaryService.branch || 'Not provided'}, Retired ${militaryService.retirement_date || 'date not provided'}`
    }
    if (vaDisability) {
      userContext += `\nVA Rating: ${vaDisability.current_va_rating || 'Not provided'}%`
    }
    if (claimsCount > 0) {
      userContext += `\nCurrent Claims: ${claimsCount} disability claims on file`
    }

    // Build messages array for Claude
    const messages: Anthropic.MessageParam[] = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }))

    // Add the new user message
    messages.push({ role: 'user', content: message })

    // Save user message to chat history immediately
    await supabase.from('chat_history').insert({ user_id: userId, message, role: 'user' })

    // If client wants streaming, use SSE
    if (wantsStreaming) {
      // Create a ReadableStream for SSE
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder()
          let fullResponse = ''
          let continueLoop = true

          // Helper to send SSE event
          const sendEvent = (data: string) => {
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }

          try {
            while (continueLoop) {
              // Use streaming API
              const streamResponse = anthropic.messages.stream({
                model: 'claude-sonnet-4-20250514',
                max_tokens: 4000,
                system: SYSTEM_PROMPT + (userContext ? `\n\n## Current User Context${userContext}` : ''),
                tools: tools,
                messages: messages,
              })

              // Track tool calls in this response
              const toolCalls: Array<{ id: string; name: string; input: string }> = []
              let currentToolInput = ''
              let currentToolId = ''
              let currentToolName = ''
              let hasTextResponse = false

              for await (const event of streamResponse) {
                if (event.type === 'content_block_start') {
                  if (event.content_block.type === 'text') {
                    hasTextResponse = true
                  } else if (event.content_block.type === 'tool_use') {
                    currentToolId = event.content_block.id
                    currentToolName = event.content_block.name
                    currentToolInput = ''
                  }
                } else if (event.type === 'content_block_delta') {
                  if (event.delta.type === 'text_delta') {
                    const text = event.delta.text
                    fullResponse += text
                    // Send each chunk to the client
                    sendEvent(JSON.stringify({ text }))
                  } else if (event.delta.type === 'input_json_delta') {
                    currentToolInput += event.delta.partial_json
                  }
                } else if (event.type === 'content_block_stop') {
                  if (currentToolId && currentToolName) {
                    toolCalls.push({
                      id: currentToolId,
                      name: currentToolName,
                      input: currentToolInput,
                    })
                    currentToolId = ''
                    currentToolName = ''
                    currentToolInput = ''
                  }
                } else if (event.type === 'message_stop') {
                  // Message complete
                }
              }

              // Get the final message to check stop reason
              const finalMessage = await streamResponse.finalMessage()

              // Process any tool calls
              if (toolCalls.length > 0) {
                const toolResults: Anthropic.ToolResultBlockParam[] = []
                const assistantContent: Anthropic.ContentBlock[] = []

                // Add any text content first
                if (hasTextResponse && fullResponse) {
                  assistantContent.push({ type: 'text', text: fullResponse })
                }

                // Add tool use blocks and process them
                for (const tool of toolCalls) {
                  let parsedInput = {}
                  try {
                    parsedInput = JSON.parse(tool.input || '{}')
                  } catch {
                    parsedInput = {}
                  }

                  assistantContent.push({
                    type: 'tool_use',
                    id: tool.id,
                    name: tool.name,
                    input: parsedInput,
                  })

                  const result = await processToolCall(supabase, userId, tool.name, parsedInput as Record<string, unknown>)
                  toolResults.push({
                    type: 'tool_result',
                    tool_use_id: tool.id,
                    content: result,
                  })
                }

                // Add to message history for continuation
                messages.push({ role: 'assistant', content: assistantContent })
                messages.push({ role: 'user', content: toolResults })

                // Reset for next iteration (we'll continue to get more text)
                // Don't reset fullResponse - keep accumulating
              }

              // Check if we should continue the loop
              if (finalMessage.stop_reason === 'end_turn' || finalMessage.stop_reason === 'stop_sequence') {
                continueLoop = false
              } else if (finalMessage.stop_reason !== 'tool_use') {
                continueLoop = false
              }
            }

            // Save the complete assistant response to chat history
            await supabase.from('chat_history').insert({ user_id: userId, message: fullResponse, role: 'assistant' })

            // Send done signal
            sendEvent('[DONE]')
            controller.close()
          } catch (error) {
            console.error('Streaming error:', error)
            sendEvent(JSON.stringify({ error: 'Streaming failed' }))
            controller.close()
          }
        }
      })

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      })
    }

    // Non-streaming fallback (original behavior)
    let finalResponse = ''
    let continueLoop = true

    while (continueLoop) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: SYSTEM_PROMPT + (userContext ? `\n\n## Current User Context${userContext}` : ''),
        tools: tools,
        messages: messages,
      })

      // Process the response
      const toolResults: Anthropic.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type === 'text') {
          finalResponse += block.text
        } else if (block.type === 'tool_use') {
          // Process the tool call
          const result = await processToolCall(supabase, userId, block.name, block.input as Record<string, unknown>)
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          })
        }
      }

      // If there were tool calls, add them to messages and continue
      if (toolResults.length > 0) {
        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user', content: toolResults })
      }

      // Check if we should continue the loop
      if (response.stop_reason === 'end_turn' || response.stop_reason === 'stop_sequence') {
        continueLoop = false
      } else if (response.stop_reason !== 'tool_use') {
        continueLoop = false
      }
    }

    // Save assistant response to chat history
    await supabase.from('chat_history').insert({ user_id: userId, message: finalResponse, role: 'assistant' })

    return new Response(
      JSON.stringify({ reply: finalResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Chat handler error:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to process chat message' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
