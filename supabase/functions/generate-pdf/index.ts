import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts'
import { PDFDocument, StandardFonts, rgb } from 'npm:pdf-lib@1.17.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Create PostgreSQL client for Google Cloud
async function getDbClient(): Promise<Client> {
  const client = new Client({
    hostname: Deno.env.get('DB_HOST')!,
    port: parseInt(Deno.env.get('DB_PORT') || '5432'),
    user: Deno.env.get('DB_USER')!,
    password: Deno.env.get('DB_PASSWORD')!,
    database: Deno.env.get('DB_NAME')!,
    tls: {
      enabled: true,
      enforce: true,
    },
  })
  await client.connect()
  return client
}

interface GeneratePDFRequest {
  userId: string
  documentType: 'dd2860' | 'cover-letter' | 'package'
}

// Branch-specific mailing addresses
const BRANCH_ADDRESSES = {
  army: {
    name: 'Department of the Army',
    address: 'U.S. Army Human Resources Command\nATTN: AHRC-PDR-C (CRSC), Dept 420\n1600 Spearhead Division Avenue\nFort Knox, KY 40122-5402',
    email: 'usarmy.knox.hrc.mbx.tagd-crsc-claims@army.mil',
  },
  navy: {
    name: 'Secretary of the Navy',
    address: 'Council of Review Boards\nATTN: Combat Related Special Compensation Branch\n720 Kennon Street SE, Suite 309\nWashington Navy Yard, DC 20374-5023',
    email: 'CRSC@navy.mil',
  },
  marine_corps: {
    name: 'Secretary of the Navy',
    address: 'Council of Review Boards\nATTN: Combat Related Special Compensation Branch\n720 Kennon Street SE, Suite 309\nWashington Navy Yard, DC 20374-5023',
    email: 'CRSC@navy.mil',
  },
  air_force: {
    name: 'United States Air Force',
    address: 'Disability Division (CRSC)\nHQ AFPC/DPPDC\n550 C Street West\nRandolph AFB, TX 78150-4708',
  },
  space_force: {
    name: 'United States Space Force',
    address: 'Disability Division (CRSC)\nHQ AFPC/DPPDC\n550 C Street West\nRandolph AFB, TX 78150-4708',
  },
  coast_guard: {
    name: 'Coast Guard',
    address: 'Commander (PSC-PSD-MED)\nPersonnel Service Center, ATTN: CRSC\n2703 Martin Luther King Jr. Avenue SE\nWashington, DC 20593-7200',
    email: 'ARL-SMB-CGPSC-PSD-CRSC@uscg.mil',
  },
}

// Combat-related code descriptions
const COMBAT_CODES = {
  PH: 'Purple Heart - Injury from armed conflict',
  AC: 'Armed Conflict - Direct result of armed conflict',
  HS: 'Hazardous Service - Demolition, flight, parachuting, etc.',
  SW: 'Simulating War - Live fire practice, hand-to-hand combat training',
  IN: 'Instrument of War - Injury from military vehicle, weapon, chemical agent',
  AO: 'Agent Orange - Exposure to herbicides',
  RE: 'Radiation Exposure - Combat-related radiation exposure',
  GW: 'Gulf War - Gulf War-related disabilities',
  MG: 'Mustard Gas - Exposure to mustard gas or Lewisite',
}

// Helper function to safely convert values to strings (handles Date objects)
function toStr(value: unknown): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (value instanceof Date) {
    return value.toISOString().split('T')[0] // Format as YYYY-MM-DD
  }
  if (typeof value === 'object') {
    // Handle postgres date objects or other objects
    const dateValue = value as { toISOString?: () => string }
    if (typeof dateValue.toISOString === 'function') {
      return dateValue.toISOString().split('T')[0]
    }
    return String(value)
  }
  return String(value)
}

async function generateCoverLetter(
  pdfDoc: typeof PDFDocument,
  userData: any,
  militaryService: any,
  claims: any[]
): Promise<Uint8Array> {
  const page = pdfDoc.addPage([612, 792]) // Letter size
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

  const { width, height } = page.getSize()
  const margin = 72 // 1 inch margin
  let yPosition = height - margin

  const drawText = (text: string, options: { bold?: boolean; size?: number; indent?: number } = {}) => {
    const fontSize = options.size || 12
    const textFont = options.bold ? boldFont : font
    const xPosition = margin + (options.indent || 0)

    page.drawText(text, {
      x: xPosition,
      y: yPosition,
      size: fontSize,
      font: textFont,
      color: rgb(0, 0, 0),
    })
    yPosition -= fontSize + 4
  }

  const drawParagraph = (text: string, lineHeight = 14) => {
    const words = text.split(' ')
    let line = ''
    const maxWidth = width - (2 * margin)

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word
      const textWidth = font.widthOfTextAtSize(testLine, 12)

      if (textWidth > maxWidth) {
        drawText(line)
        line = word
      } else {
        line = testLine
      }
    }
    if (line) {
      drawText(line)
    }
    yPosition -= lineHeight / 2
  }

  const branchInfo = BRANCH_ADDRESSES[militaryService?.branch as keyof typeof BRANCH_ADDRESSES]
  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Header
  drawText(today)
  yPosition -= 20

  // Address block
  if (branchInfo) {
    drawText(branchInfo.name)
    for (const line of branchInfo.address.split('\n')) {
      drawText(line)
    }
  }
  yPosition -= 20

  // Subject line
  drawText(`Subject: Application for Combat-Related Special Compensation (CRSC)`, { bold: true })
  yPosition -= 10

  // Applicant info
  drawText(`Applicant: ${userData?.first_name} ${userData?.middle_initial || ''} ${userData?.last_name}`)
  if (userData?.ssn_encrypted) {
    drawText(`SSN: XXX-XX-${userData.ssn_encrypted.slice(-4)}`)
  }
  yPosition -= 20

  // Body
  drawText('Dear CRSC Review Board,', { bold: true })
  yPosition -= 10

  drawParagraph(`I am hereby submitting my application for Combat-Related Special Compensation (CRSC) in accordance with 10 U.S.C. § 1413a. I am a retired member of the ${getBranchName(militaryService?.branch)} and have VA-rated service-connected disabilities that I believe qualify for CRSC.`)
  yPosition -= 10

  drawParagraph(`Enclosed with this application, please find:`)
  yPosition -= 5

  drawText('1. Completed DD Form 2860', { indent: 20 })
  drawText('2. Copy of DD Form 214/215', { indent: 20 })
  drawText('3. Copy of Retirement Orders', { indent: 20 })
  drawText('4. Copy of VA Rating Decision Letter', { indent: 20 })
  drawText('5. Copy of VA Code Sheet', { indent: 20 })
  drawText('6. Supporting medical documentation', { indent: 20 })
  yPosition -= 10

  drawParagraph(`I am claiming ${claims.length} service-connected ${claims.length === 1 ? 'disability' : 'disabilities'} as combat-related:`)
  yPosition -= 5

  for (let i = 0; i < claims.length && i < 5; i++) {
    const claim = claims[i]
    const codeDesc = COMBAT_CODES[claim.combat_related_code as keyof typeof COMBAT_CODES] || claim.combat_related_code
    drawText(`${i + 1}. ${claim.disability_title} (${claim.current_rating_percentage}%) - ${codeDesc}`, { indent: 20 })
  }
  if (claims.length > 5) {
    drawText(`   ... and ${claims.length - 5} additional ${claims.length - 5 === 1 ? 'claim' : 'claims'}`, { indent: 20 })
  }
  yPosition -= 10

  drawParagraph(`I certify that the information provided in this application and all supporting documentation is true and accurate to the best of my knowledge. I understand that providing false information may result in denial of benefits and potential legal consequences.`)
  yPosition -= 10

  drawParagraph(`Please contact me at the address or phone number provided on DD Form 2860 if you require any additional information or documentation.`)
  yPosition -= 20

  drawText('Respectfully submitted,')
  yPosition -= 40

  drawText('_________________________________')
  drawText(`${userData?.first_name} ${userData?.middle_initial || ''} ${userData?.last_name}`)
  if (militaryService?.retired_rank) {
    drawText(`${militaryService.retired_rank}, ${getBranchName(militaryService?.branch)} (Retired)`)
  }

  return pdfDoc.save()
}

function getBranchName(branch: string): string {
  const names: Record<string, string> = {
    army: 'United States Army',
    navy: 'United States Navy',
    air_force: 'United States Air Force',
    marine_corps: 'United States Marine Corps',
    coast_guard: 'United States Coast Guard',
    space_force: 'United States Space Force',
  }
  return names[branch] || branch
}

async function generateDD2860(
  userData: any,
  militaryService: any,
  vaDisability: any,
  claims: any[]
): Promise<Uint8Array> {
  // Create a new PDF document matching official DD Form 2860 structure
  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 612 // Letter size
  const pageHeight = 792
  const margin = 40
  const lineHeight = 14
  const smallLineHeight = 11

  // Helper functions
  const drawBox = (page: any, x: number, y: number, width: number, height: number) => {
    page.drawRectangle({
      x, y: y - height, width, height,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    })
  }

  const drawLabelValue = (page: any, label: string, value: string, x: number, y: number, labelWidth: number, valueWidth: number, fontSize = 8) => {
    // Draw label box
    drawBox(page, x, y, labelWidth, 18)
    page.drawText(label, { x: x + 2, y: y - 12, size: fontSize - 1, font: boldFont })

    // Draw value box
    drawBox(page, x + labelWidth, y, valueWidth, 18)
    page.drawText(toStr(value).substring(0, Math.floor(valueWidth / 5)), { x: x + labelWidth + 2, y: y - 12, size: fontSize, font })
  }

  const drawCheckbox = (page: any, x: number, y: number, checked: boolean, label: string) => {
    page.drawRectangle({
      x, y: y - 10, width: 10, height: 10,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    })
    if (checked) {
      page.drawText('X', { x: x + 2, y: y - 8, size: 8, font: boldFont })
    }
    page.drawText(label, { x: x + 14, y: y - 8, size: 7, font })
  }

  // ============= PAGE 1 - Header and Personal Information =============
  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  // Form header
  page.drawText('CLAIM FOR COMBAT-RELATED SPECIAL COMPENSATION (CRSC)', {
    x: margin, y, size: 11, font: boldFont
  })
  y -= 15
  page.drawText('(Read Privacy Act Statement and Instructions before completing this form)', {
    x: margin, y, size: 7, font
  })
  y -= 20

  // Form number box (top right)
  page.drawText('OMB No. 0704-0441', { x: pageWidth - margin - 100, y: pageHeight - margin, size: 7, font })
  page.drawText('OMB approval expires', { x: pageWidth - margin - 100, y: pageHeight - margin - 10, size: 6, font })

  // SECTION I - IDENTIFICATION DATA
  page.drawRectangle({
    x: margin, y: y - 15, width: pageWidth - 2 * margin, height: 15,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  })
  page.drawText('SECTION I - IDENTIFICATION DATA', { x: margin + 5, y: y - 12, size: 9, font: boldFont })
  y -= 20

  // Row 1: Name
  drawBox(page, margin, y, pageWidth - 2 * margin, 25)
  page.drawText('1. NAME (Last, First, Middle Initial)', { x: margin + 2, y: y - 8, size: 7, font: boldFont })
  page.drawText(`${userData?.last_name || ''}, ${userData?.first_name || ''} ${userData?.middle_initial || ''}`, {
    x: margin + 5, y: y - 20, size: 10, font
  })
  y -= 25

  // Row 2: SSN, DOB, Rank, Branch
  const row2Width = (pageWidth - 2 * margin) / 4
  drawBox(page, margin, y, row2Width, 25)
  page.drawText('2. SSN OR EMPLOYEE ID', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(userData?.ssn_encrypted || '___-__-____', { x: margin + 5, y: y - 20, size: 9, font })

  drawBox(page, margin + row2Width, y, row2Width, 25)
  page.drawText('3. DATE OF BIRTH (YYYYMMDD)', { x: margin + row2Width + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(toStr(userData?.date_of_birth), { x: margin + row2Width + 5, y: y - 20, size: 9, font })

  drawBox(page, margin + 2 * row2Width, y, row2Width, 25)
  page.drawText('4. RETIRED RANK/RATE', { x: margin + 2 * row2Width + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(militaryService?.retired_rank || '', { x: margin + 2 * row2Width + 5, y: y - 20, size: 9, font })

  drawBox(page, margin + 3 * row2Width, y, row2Width, 25)
  page.drawText('5. TELEPHONE (Include area code)', { x: margin + 3 * row2Width + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(userData?.phone || '', { x: margin + 3 * row2Width + 5, y: y - 20, size: 9, font })
  y -= 25

  // Row 3: Email and Mailing Address
  const halfWidth = (pageWidth - 2 * margin) / 2
  drawBox(page, margin, y, halfWidth, 25)
  page.drawText('6. E-MAIL ADDRESS', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(userData?.email || '', { x: margin + 5, y: y - 20, size: 8, font })

  drawBox(page, margin + halfWidth, y, halfWidth, 25)
  page.drawText('7. MAILING ADDRESS (Street, City, State, ZIP)', { x: margin + halfWidth + 2, y: y - 8, size: 6, font: boldFont })
  const address = `${userData?.address_line1 || ''} ${userData?.address_line2 || ''}, ${userData?.city || ''}, ${userData?.state || ''} ${userData?.zip_code || ''}`
  page.drawText(address.substring(0, 50), { x: margin + halfWidth + 5, y: y - 20, size: 7, font })
  y -= 30

  // SECTION II - PRELIMINARY REQUIREMENTS
  page.drawRectangle({
    x: margin, y: y - 15, width: pageWidth - 2 * margin, height: 15,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  })
  page.drawText('SECTION II - PRELIMINARY REQUIREMENTS (If you answer NO to ALL questions 8a-8d, you are NOT eligible for CRSC)', {
    x: margin + 5, y: y - 12, size: 7, font: boldFont
  })
  y -= 20

  // Eligibility questions
  const questions = [
    '8a. Are you entitled to military retired pay?',
    '8b. Do you have a VA disability rating of at least 10%?',
    '8c. Have you filed a DD Form 2860 for combat-related disabilities rated by the VA?',
    '8d. Is your military retirement pay currently reduced due to receipt of VA disability compensation?',
  ]

  for (const question of questions) {
    drawBox(page, margin, y, pageWidth - 2 * margin, 18)
    page.drawText(question, { x: margin + 5, y: y - 12, size: 7, font })
    // Assume YES based on the fact they're applying
    drawCheckbox(page, pageWidth - margin - 80, y - 3, true, 'YES')
    drawCheckbox(page, pageWidth - margin - 40, y - 3, false, 'NO')
    y -= 18
  }
  y -= 10

  // SECTION III - SERVICE HISTORY
  page.drawRectangle({
    x: margin, y: y - 15, width: pageWidth - 2 * margin, height: 15,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  })
  page.drawText('SECTION III - SERVICE HISTORY', { x: margin + 5, y: y - 12, size: 9, font: boldFont })
  y -= 20

  // Branch of service
  drawBox(page, margin, y, pageWidth - 2 * margin, 30)
  page.drawText('9. BRANCH OF SERVICE FROM WHICH YOU RETIRED (Check one)', { x: margin + 5, y: y - 10, size: 7, font: boldFont })

  const branches = [
    { key: 'army', label: 'Army' },
    { key: 'navy', label: 'Navy' },
    { key: 'air_force', label: 'Air Force' },
    { key: 'marine_corps', label: 'Marine Corps' },
    { key: 'coast_guard', label: 'Coast Guard' },
    { key: 'space_force', label: 'Space Force' },
  ]
  let xPos = margin + 10
  for (const branch of branches) {
    drawCheckbox(page, xPos, y - 18, militaryService?.branch === branch.key, branch.label)
    xPos += 80
  }
  y -= 35

  // Retirement date
  drawBox(page, margin, y, halfWidth, 25)
  page.drawText('RETIREMENT DATE', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(toStr(militaryService?.retirement_date), { x: margin + 5, y: y - 20, size: 9, font })

  drawBox(page, margin + halfWidth, y, halfWidth, 25)
  page.drawText('RETIREMENT TYPE', { x: margin + halfWidth + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(militaryService?.retirement_type || '', { x: margin + halfWidth + 5, y: y - 20, size: 9, font })
  y -= 30

  // POW question
  drawBox(page, margin, y, pageWidth - 2 * margin, 20)
  page.drawText('11. WERE YOU EVER A PRISONER OF WAR (POW)?', { x: margin + 5, y: y - 13, size: 7, font: boldFont })
  drawCheckbox(page, pageWidth - margin - 80, y - 5, false, 'YES')
  drawCheckbox(page, pageWidth - margin - 40, y - 5, true, 'NO')
  y -= 25

  // VA file number
  drawBox(page, margin, y, pageWidth - 2 * margin, 25)
  page.drawText('12. VA FILE NUMBER', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(vaDisability?.va_file_number || '', { x: margin + 5, y: y - 20, size: 10, font })
  y -= 30

  // Footer for page 1
  page.drawText('DD FORM 2860, JUL 2011', { x: margin, y: 25, size: 7, font })
  page.drawText('Page 1 of ' + (Math.ceil(claims.length) + 2), { x: pageWidth - margin - 50, y: 25, size: 7, font })

  // ============= PAGE 2+ - Disability Claims (Item 13) =============
  // Each disability gets its own section on a new page or continues on same page

  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i]

    // Start new page for each disability claim (matching official form)
    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - margin

    // Section header
    page.drawRectangle({
      x: margin, y: y - 15, width: pageWidth - 2 * margin, height: 15,
      color: rgb(0.9, 0.9, 0.9),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    })
    page.drawText(`SECTION IV - COMBAT-RELATEDNESS DETERMINATION - DISABILITY ${i + 1} of ${claims.length}`, {
      x: margin + 5, y: y - 12, size: 9, font: boldFont
    })
    y -= 20

    page.drawText('13. COMPLETE ONE ITEM 13 BLOCK FOR EACH DISABILITY RATED BY THE VA THAT YOU THINK IS COMBAT-RELATED.', {
      x: margin, y, size: 7, font: boldFont
    })
    y -= 15

    // 13a. VA Disability Code
    drawBox(page, margin, y, 150, 25)
    page.drawText('13a. VA DISABILITY CODE', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText(claim.disability_code || '', { x: margin + 5, y: y - 20, size: 10, font })

    // 13b. Disability Description
    drawBox(page, margin + 150, y, pageWidth - 2 * margin - 150, 25)
    page.drawText('13b. DESCRIPTION OF DISABILITY', { x: margin + 152, y: y - 8, size: 6, font: boldFont })
    page.drawText((claim.disability_title || '').substring(0, 50), { x: margin + 155, y: y - 20, size: 9, font })
    y -= 25

    // 13c. Rating percentage and 13d. Date awarded
    drawBox(page, margin, y, halfWidth, 25)
    page.drawText('13c. CURRENT VA RATING PERCENTAGE', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText(claim.current_rating_percentage ? `${claim.current_rating_percentage}%` : '', { x: margin + 5, y: y - 20, size: 10, font })

    drawBox(page, margin + halfWidth, y, halfWidth, 25)
    page.drawText('13d. DATE DISABILITY WAS AWARDED BY VA', { x: margin + halfWidth + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText(toStr(claim.date_awarded_by_va), { x: margin + halfWidth + 5, y: y - 20, size: 9, font })
    y -= 25

    // 13e. Initial rating
    drawBox(page, margin, y, halfWidth, 25)
    page.drawText('13e. INITIAL VA RATING PERCENTAGE', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText(claim.initial_rating_percentage ? `${claim.initial_rating_percentage}%` : '', { x: margin + 5, y: y - 20, size: 10, font })

    // 13f. Body part affected
    drawBox(page, margin + halfWidth, y, halfWidth, 25)
    page.drawText('13f. BODY PART AFFECTED', { x: margin + halfWidth + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText((claim.body_part_affected || '').substring(0, 40), { x: margin + halfWidth + 5, y: y - 20, size: 9, font })
    y -= 30

    // 13g. Combat-related category (checkboxes)
    drawBox(page, margin, y, pageWidth - 2 * margin, 60)
    page.drawText('13g. CATEGORY THAT BEST DESCRIBES HOW YOUR DISABILITY IS COMBAT-RELATED (Check only ONE)', {
      x: margin + 2, y: y - 10, size: 7, font: boldFont
    })

    const combatCategories = [
      { code: 'PH', label: 'Purple Heart (PH)' },
      { code: 'AC', label: 'Armed Conflict (AC)' },
      { code: 'SW', label: 'Simulating War (SW)' },
      { code: 'HS', label: 'Hazardous Service (HS)' },
      { code: 'IN', label: 'Instrumentality of War (IN)' },
      { code: 'AO', label: 'Agent Orange (AO)' },
      { code: 'RE', label: 'Radiation Exposure (RE)' },
      { code: 'GW', label: 'Gulf War (GW)' },
    ]

    let catX = margin + 10
    let catY = y - 25
    for (let j = 0; j < combatCategories.length; j++) {
      if (j === 4) { catX = margin + 10; catY -= 15 }
      drawCheckbox(page, catX, catY, claim.combat_related_code === combatCategories[j].code, combatCategories[j].label)
      catX += 130
    }
    y -= 65

    // 13h. Unit of assignment
    drawBox(page, margin, y, pageWidth - 2 * margin, 25)
    page.drawText('13h. UNIT OF ASSIGNMENT AT THE TIME OF INJURY/ILLNESS/DISEASE/EVENT', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText((claim.unit_of_assignment || '').substring(0, 80), { x: margin + 5, y: y - 20, size: 9, font })
    y -= 25

    // 13i. Location
    drawBox(page, margin, y, pageWidth - 2 * margin, 25)
    page.drawText('13i. LOCATION/AREA OF ASSIGNMENT AT TIME OF INJURY/ILLNESS/DISEASE/EVENT', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText((claim.location_of_injury || '').substring(0, 80), { x: margin + 5, y: y - 20, size: 9, font })
    y -= 30

    // 13j. Description of event (multi-line)
    drawBox(page, margin, y, pageWidth - 2 * margin, 120)
    page.drawText('13j. EXPLANATION OF HOW DISABILITY WAS CAUSED (Provide details of combat-related incident)', {
      x: margin + 2, y: y - 10, size: 7, font: boldFont
    })

    // Word wrap the description
    const description = claim.description_of_event || ''
    const words = description.split(' ')
    let line = ''
    let descY = y - 25
    const maxLineWidth = pageWidth - 2 * margin - 10

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word
      const textWidth = font.widthOfTextAtSize(testLine, 8)

      if (textWidth > maxLineWidth) {
        page.drawText(line, { x: margin + 5, y: descY, size: 8, font })
        descY -= 10
        line = word
        if (descY < y - 110) break // Stop if we run out of space
      } else {
        line = testLine
      }
    }
    if (line && descY >= y - 110) {
      page.drawText(line, { x: margin + 5, y: descY, size: 8, font })
    }
    y -= 125

    // 13k. Purple Heart
    drawBox(page, margin, y, pageWidth - 2 * margin, 20)
    page.drawText('13k. DID YOU RECEIVE A PURPLE HEART FOR THIS DISABILITY?', { x: margin + 5, y: y - 13, size: 7, font: boldFont })
    drawCheckbox(page, pageWidth - margin - 80, y - 5, claim.received_purple_heart === true, 'YES')
    drawCheckbox(page, pageWidth - margin - 40, y - 5, claim.received_purple_heart !== true, 'NO')
    y -= 25

    // 13l. Secondary conditions
    drawBox(page, margin, y, pageWidth - 2 * margin, 20)
    page.drawText('13l. ARE THERE SECONDARY CONDITIONS ASSOCIATED WITH THIS DISABILITY?', { x: margin + 5, y: y - 13, size: 7, font: boldFont })
    drawCheckbox(page, pageWidth - margin - 80, y - 5, claim.has_secondary_conditions === true, 'YES')
    drawCheckbox(page, pageWidth - margin - 40, y - 5, claim.has_secondary_conditions !== true, 'NO')
    y -= 25

    // Page footer
    page.drawText('DD FORM 2860, JUL 2011', { x: margin, y: 25, size: 7, font })
    page.drawText(`Page ${i + 2} of ${claims.length + 2}`, { x: pageWidth - margin - 50, y: 25, size: 7, font })
  }

  // ============= FINAL PAGE - Supporting Documents & Certification =============
  page = pdfDoc.addPage([pageWidth, pageHeight])
  y = pageHeight - margin

  // SECTION V - Supporting Documents
  page.drawRectangle({
    x: margin, y: y - 15, width: pageWidth - 2 * margin, height: 15,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  })
  page.drawText('SECTION V - SUPPORTING DOCUMENTS CHECKLIST', { x: margin + 5, y: y - 12, size: 9, font: boldFont })
  y -= 20

  page.drawText('14. THE FOLLOWING DOCUMENTS MUST BE SUBMITTED WITH THIS APPLICATION:', { x: margin, y, size: 8, font: boldFont })
  y -= 15

  const requiredDocs = [
    'All available DD 214s/DD 215s',
    'Retirement Orders',
    'VA Rating Decision Letter(s)',
    'VA Code Sheet(s)',
    'Medical records specifically showing the causation of the disability',
    'Service medical records, treatment records, or other military records that document combat-related injury',
    'Award citations or certificates (if claiming Purple Heart)',
  ]

  for (const doc of requiredDocs) {
    drawCheckbox(page, margin + 10, y, true, doc)
    y -= 15
  }
  y -= 20

  page.drawText('NOTE: DO NOT SEND ORIGINAL DOCUMENTS. Send copies only. Original documents will not be returned.', {
    x: margin, y, size: 8, font: boldFont, color: rgb(0.8, 0, 0)
  })
  y -= 30

  // SECTION VI - Certification
  page.drawRectangle({
    x: margin, y: y - 15, width: pageWidth - 2 * margin, height: 15,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  })
  page.drawText('SECTION VI - CERTIFICATION', { x: margin + 5, y: y - 12, size: 9, font: boldFont })
  y -= 25

  const certStatements = [
    '15a. I certify that the information provided above is true and correct to the best of my knowledge.',
    '15b. I understand that I may be required to provide additional information or documentation.',
    '15c. I understand that knowingly making a false statement may result in denial of benefits and legal action.',
    '15d. I authorize the release of information necessary to process this claim.',
  ]

  for (const statement of certStatements) {
    drawCheckbox(page, margin + 10, y, true, statement)
    y -= 18
  }
  y -= 30

  // Signature block
  drawBox(page, margin, y, pageWidth - 2 * margin, 60)
  page.drawText('SIGNATURE OF APPLICANT', { x: margin + 5, y: y - 10, size: 7, font: boldFont })
  page.drawText('(Sign in ink after printing form)', { x: margin + 5, y: y - 20, size: 6, font })
  y -= 25
  page.drawLine({
    start: { x: margin + 10, y },
    end: { x: margin + 250, y },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  })
  page.drawText('Signature', { x: margin + 100, y: y - 10, size: 7, font })

  // Date signed
  page.drawText('DATE SIGNED', { x: margin + 300, y: y + 25, size: 7, font: boldFont })
  page.drawLine({
    start: { x: margin + 300, y },
    end: { x: pageWidth - margin - 10, y },
    thickness: 0.5,
    color: rgb(0, 0, 0),
  })
  page.drawText('Date', { x: margin + 380, y: y - 10, size: 7, font })
  y -= 40

  // Printed name
  page.drawText('PRINTED NAME:', { x: margin + 10, y, size: 8, font: boldFont })
  page.drawText(`${userData?.first_name || ''} ${userData?.middle_initial || ''} ${userData?.last_name || ''}`.toUpperCase(), {
    x: margin + 100, y, size: 10, font
  })

  // Page footer
  page.drawText('DD FORM 2860, JUL 2011', { x: margin, y: 25, size: 7, font })
  page.drawText('PREVIOUS EDITIONS ARE OBSOLETE', { x: margin + 150, y: 25, size: 7, font })
  page.drawText(`Page ${claims.length + 2} of ${claims.length + 2}`, { x: pageWidth - margin - 50, y: 25, size: 7, font })

  return pdfDoc.save()
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let db: Client | null = null

  try {
    const { userId, documentType } = await req.json() as GeneratePDFRequest

    if (!userId || !documentType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Connect to Google Cloud PostgreSQL
    db = await getDbClient()

    // Fetch user data from external PostgreSQL (decrypt SSN for form generation)
    const ssnEncryptionKey = Deno.env.get('SSN_ENCRYPTION_KEY') || Deno.env.get('DB_PASSWORD')!
    const personalInfoResult = await db.queryObject`
      SELECT id, user_id, first_name, middle_initial, last_name,
        CASE WHEN ssn_encrypted IS NOT NULL AND ssn_encrypted != ''
          THEN decrypt_ssn(ssn_encrypted, ${ssnEncryptionKey})
          ELSE ssn_encrypted
        END AS ssn_encrypted,
        date_of_birth, email, phone, address_line1, address_line2,
        city, state, zip_code, created_at, updated_at
      FROM personal_information WHERE user_id = ${userId}
    `
    const militaryServiceResult = await db.queryObject`
      SELECT * FROM military_service WHERE user_id = ${userId}
    `
    const vaDisabilityResult = await db.queryObject`
      SELECT * FROM va_disability_info WHERE user_id = ${userId}
    `
    const claimsResult = await db.queryObject`
      SELECT * FROM disability_claims WHERE user_id = ${userId}
    `

    const personalInfo = personalInfoResult.rows[0]
    const militaryService = militaryServiceResult.rows[0]
    const vaDisability = vaDisabilityResult.rows[0]
    const claims = claimsResult.rows || []

    let pdfBytes: Uint8Array

    if (documentType === 'dd2860') {
      pdfBytes = await generateDD2860(
        personalInfo,
        militaryService,
        vaDisability,
        claims
      )
    } else if (documentType === 'cover-letter') {
      const pdfDoc = await PDFDocument.create()
      pdfBytes = await generateCoverLetter(
        pdfDoc,
        personalInfo,
        militaryService,
        claims
      )
    } else if (documentType === 'package') {
      // Generate a combined PDF package: cover letter + DD2860
      const dd2860Bytes = await generateDD2860(
        personalInfo,
        militaryService,
        vaDisability,
        claims
      )

      // Create combined document
      const packageDoc = await PDFDocument.create()

      // Generate and embed cover letter
      const coverLetterDoc = await PDFDocument.create()
      const coverBytes = await generateCoverLetter(
        coverLetterDoc,
        personalInfo,
        militaryService,
        claims
      )
      const coverPdf = await PDFDocument.load(coverBytes)
      const coverPages = await packageDoc.copyPages(coverPdf, coverPdf.getPageIndices())
      for (const page of coverPages) {
        packageDoc.addPage(page)
      }

      // Embed DD2860
      const dd2860Pdf = await PDFDocument.load(dd2860Bytes)
      const dd2860Pages = await packageDoc.copyPages(dd2860Pdf, dd2860Pdf.getPageIndices())
      for (const page of dd2860Pages) {
        packageDoc.addPage(page)
      }

      // Add submission instructions page
      const instrPage = packageDoc.addPage([612, 792])
      const instrFont = await packageDoc.embedFont(StandardFonts.Helvetica)
      const instrBoldFont = await packageDoc.embedFont(StandardFonts.HelveticaBold)
      let instrY = 740

      instrPage.drawText('SUBMISSION INSTRUCTIONS', { x: 50, y: instrY, size: 16, font: instrBoldFont })
      instrY -= 30

      const branch = (militaryService as Record<string, unknown>)?.branch as string || 'army'
      const branchAddresses: Record<string, { name: string; address: string[] }> = {
        army: {
          name: 'Army CRSC',
          address: ['Department of the Army', 'U.S. Army Human Resources Command', 'ATTN: AHRC-PDR-C (CRSC), Dept 420', '1600 Spearhead Division Avenue', 'Fort Knox, KY 40122-5402'],
        },
        navy: {
          name: 'Navy CRSC',
          address: ['Secretary of the Navy', 'Council of Review Boards', 'ATTN: Combat Related Special Compensation Branch', '720 Kennon Street SE, Suite 309', 'Washington Navy Yard, DC 20374-5023'],
        },
        marine_corps: {
          name: 'Marine Corps CRSC',
          address: ['Secretary of the Navy', 'Council of Review Boards', 'ATTN: Combat Related Special Compensation Branch', '720 Kennon Street SE, Suite 309', 'Washington Navy Yard, DC 20374-5023'],
        },
        air_force: {
          name: 'Air Force CRSC',
          address: ['United States Air Force', 'Disability Division (CRSC)', 'HQ AFPC/DPPDC', '550 C Street West', 'Randolph AFB, TX 78150-4708'],
        },
        space_force: {
          name: 'Space Force CRSC',
          address: ['United States Air Force', 'Disability Division (CRSC)', 'HQ AFPC/DPPDC', '550 C Street West', 'Randolph AFB, TX 78150-4708'],
        },
        coast_guard: {
          name: 'Coast Guard CRSC',
          address: ['Commander (PSC-PSD-MED)', 'Personnel Service Center, ATTN: CRSC', '2703 Martin Luther King Jr. Avenue SE', 'Washington, DC 20593-7200'],
        },
      }

      const addr = branchAddresses[branch] || branchAddresses.army

      instrPage.drawText(`Mail your complete package to:`, { x: 50, y: instrY, size: 11, font: instrBoldFont })
      instrY -= 20
      for (const line of addr.address) {
        instrPage.drawText(line, { x: 70, y: instrY, size: 10, font: instrFont })
        instrY -= 14
      }
      instrY -= 20

      const instructions = [
        '1. Print all pages of this package on standard 8.5" x 11" paper.',
        '2. Sign and date the DD Form 2860 certification page.',
        '3. Attach copies of all supporting documents (DD214, retirement orders, VA rating decisions, etc.).',
        '4. DO NOT send original documents — send copies only.',
        '5. Send via USPS Certified Mail with Return Receipt for tracking.',
        '6. Keep a complete copy of everything you submit for your records.',
        '7. Expected processing time is 6-12 months depending on the branch.',
        '8. You will receive written notification of the decision by mail.',
      ]

      for (const instr of instructions) {
        instrPage.drawText(instr, { x: 50, y: instrY, size: 10, font: instrFont })
        instrY -= 18
      }

      instrY -= 20
      instrPage.drawText('IMPORTANT REMINDERS', { x: 50, y: instrY, size: 12, font: instrBoldFont })
      instrY -= 18
      instrPage.drawText('Following the Supreme Court\'s June 2025 ruling in Soto v. United States,', { x: 50, y: instrY, size: 9, font: instrFont })
      instrY -= 14
      instrPage.drawText('the previous 6-year back pay limit has been eliminated. Eligible veterans', { x: 50, y: instrY, size: 9, font: instrFont })
      instrY -= 14
      instrPage.drawText('may now receive full retroactive payments to their initial eligibility date.', { x: 50, y: instrY, size: 9, font: instrFont })

      pdfBytes = await packageDoc.save()
    } else {
      await db.end()
      return new Response(
        JSON.stringify({ error: 'Invalid document type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Convert to base64
    const base64Pdf = btoa(String.fromCharCode(...pdfBytes))

    // Create audit log entry
    await db.queryObject`
      INSERT INTO audit_log (user_id, action, resource_type, details, created_at)
      VALUES (${userId}, 'pdf_generated', 'document', ${JSON.stringify({ document_type: documentType })}, NOW())
    `

    await db.end()

    return new Response(
      JSON.stringify({ pdf: base64Pdf }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('PDF generation error:', error)
    if (db) {
      try {
        await db.end()
      } catch {
        // Ignore close errors
      }
    }
    return new Response(
      JSON.stringify({ error: 'Failed to generate PDF' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
