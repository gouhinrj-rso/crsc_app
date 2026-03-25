import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { getDb } from '../db/database'
import { app } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRANCH_ADDRESSES: Record<string, { name: string; address: string; email?: string }> = {
  army: {
    name: 'Department of the Army',
    address:
      'U.S. Army Human Resources Command\nATTN: AHRC-PDR-C (CRSC), Dept 420\n1600 Spearhead Division Avenue\nFort Knox, KY 40122-5402',
    email: 'usarmy.knox.hrc.mbx.tagd-crsc-claims@army.mil',
  },
  navy: {
    name: 'Secretary of the Navy',
    address:
      'Council of Review Boards\nATTN: Combat Related Special Compensation Branch\n720 Kennon Street SE, Suite 309\nWashington Navy Yard, DC 20374-5023',
    email: 'CRSC@navy.mil',
  },
  marine_corps: {
    name: 'Secretary of the Navy',
    address:
      'Council of Review Boards\nATTN: Combat Related Special Compensation Branch\n720 Kennon Street SE, Suite 309\nWashington Navy Yard, DC 20374-5023',
    email: 'CRSC@navy.mil',
  },
  air_force: {
    name: 'United States Air Force',
    address:
      'Disability Division (CRSC)\nHQ AFPC/DPPDC\n550 C Street West\nRandolph AFB, TX 78150-4708',
  },
  space_force: {
    name: 'United States Space Force',
    address:
      'Disability Division (CRSC)\nHQ AFPC/DPPDC\n550 C Street West\nRandolph AFB, TX 78150-4708',
  },
  coast_guard: {
    name: 'Coast Guard',
    address:
      'Commander (PSC-PSD-MED)\nPersonnel Service Center, ATTN: CRSC\n2703 Martin Luther King Jr. Avenue SE\nWashington, DC 20593-7200',
    email: 'ARL-SMB-CGPSC-PSD-CRSC@uscg.mil',
  },
}

const COMBAT_CODES: Record<string, string> = {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toStr(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().split('T')[0]
  if (typeof value === 'object') {
    const d = value as { toISOString?: () => string }
    if (typeof d.toISOString === 'function') return d.toISOString().split('T')[0]
    return String(value)
  }
  return String(value)
}

function getBranchName(branch: string | null | undefined): string {
  const names: Record<string, string> = {
    army: 'United States Army',
    navy: 'United States Navy',
    air_force: 'United States Air Force',
    marine_corps: 'United States Marine Corps',
    coast_guard: 'United States Coast Guard',
    space_force: 'United States Space Force',
  }
  return names[branch || ''] || branch || ''
}

/** Read all user data from the single-user SQLite database */
function readAllData() {
  const db = getDb()
  const personalInfo = db.prepare('SELECT * FROM personal_information LIMIT 1').get() as Record<string, unknown> | undefined
  const militaryService = db.prepare('SELECT * FROM military_service LIMIT 1').get() as Record<string, unknown> | undefined
  const vaDisability = db.prepare('SELECT * FROM va_disability_info LIMIT 1').get() as Record<string, unknown> | undefined
  const claims = db.prepare('SELECT * FROM disability_claims').all() as Record<string, unknown>[]
  const documents = db.prepare('SELECT * FROM documents').all() as Record<string, unknown>[]
  return { personalInfo, militaryService, vaDisability, claims, documents }
}

// ---------------------------------------------------------------------------
// DD Form 2860 Generator
// ---------------------------------------------------------------------------

export async function generateDD2860(): Promise<Uint8Array> {
  const { personalInfo: userData, militaryService, vaDisability, claims } = readAllData()

  const pdfDoc = await PDFDocument.create()
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 612
  const pageHeight = 792
  const margin = 40

  // Helper: draw box
  const drawBox = (pg: ReturnType<typeof pdfDoc.addPage>, x: number, y: number, w: number, h: number) => {
    pg.drawRectangle({
      x,
      y: y - h,
      width: w,
      height: h,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    })
  }

  // Helper: draw checkbox
  const drawCheckbox = (pg: ReturnType<typeof pdfDoc.addPage>, x: number, y: number, checked: boolean, label: string) => {
    pg.drawRectangle({
      x,
      y: y - 10,
      width: 10,
      height: 10,
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    })
    if (checked) {
      pg.drawText('X', { x: x + 2, y: y - 8, size: 8, font: boldFont })
    }
    pg.drawText(label, { x: x + 14, y: y - 8, size: 7, font })
  }

  // ===== PAGE 1 =====
  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin
  const halfWidth = (pageWidth - 2 * margin) / 2

  // Form header
  page.drawText('CLAIM FOR COMBAT-RELATED SPECIAL COMPENSATION (CRSC)', {
    x: margin,
    y,
    size: 11,
    font: boldFont,
  })
  y -= 15
  page.drawText('(Read Privacy Act Statement and Instructions before completing this form)', {
    x: margin,
    y,
    size: 7,
    font,
  })
  y -= 20

  page.drawText('OMB No. 0704-0441', { x: pageWidth - margin - 100, y: pageHeight - margin, size: 7, font })
  page.drawText('OMB approval expires', { x: pageWidth - margin - 100, y: pageHeight - margin - 10, size: 6, font })

  // SECTION I - IDENTIFICATION DATA
  page.drawRectangle({
    x: margin,
    y: y - 15,
    width: pageWidth - 2 * margin,
    height: 15,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  })
  page.drawText('SECTION I - IDENTIFICATION DATA', { x: margin + 5, y: y - 12, size: 9, font: boldFont })
  y -= 20

  // Row 1: Name
  drawBox(page, margin, y, pageWidth - 2 * margin, 25)
  page.drawText('1. NAME (Last, First, Middle Initial)', { x: margin + 2, y: y - 8, size: 7, font: boldFont })
  page.drawText(
    `${userData?.last_name || ''}, ${userData?.first_name || ''} ${userData?.middle_initial || ''}`,
    { x: margin + 5, y: y - 20, size: 10, font }
  )
  y -= 25

  // Row 2: SSN, DOB, Rank, Telephone
  const row2Width = (pageWidth - 2 * margin) / 4

  drawBox(page, margin, y, row2Width, 25)
  page.drawText('2. SSN OR EMPLOYEE ID', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(toStr(userData?.ssn_encrypted) || '___-__-____', { x: margin + 5, y: y - 20, size: 9, font })

  drawBox(page, margin + row2Width, y, row2Width, 25)
  page.drawText('3. DATE OF BIRTH (YYYYMMDD)', { x: margin + row2Width + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(toStr(userData?.date_of_birth), { x: margin + row2Width + 5, y: y - 20, size: 9, font })

  drawBox(page, margin + 2 * row2Width, y, row2Width, 25)
  page.drawText('4. RETIRED RANK/RATE', { x: margin + 2 * row2Width + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(toStr(militaryService?.retired_rank), { x: margin + 2 * row2Width + 5, y: y - 20, size: 9, font })

  drawBox(page, margin + 3 * row2Width, y, row2Width, 25)
  page.drawText('5. TELEPHONE (Include area code)', { x: margin + 3 * row2Width + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(toStr(userData?.phone), { x: margin + 3 * row2Width + 5, y: y - 20, size: 9, font })
  y -= 25

  // Row 3: Email and Mailing Address
  drawBox(page, margin, y, halfWidth, 25)
  page.drawText('6. E-MAIL ADDRESS', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(toStr(userData?.email), { x: margin + 5, y: y - 20, size: 8, font })

  drawBox(page, margin + halfWidth, y, halfWidth, 25)
  page.drawText('7. MAILING ADDRESS (Street, City, State, ZIP)', { x: margin + halfWidth + 2, y: y - 8, size: 6, font: boldFont })
  const address = `${userData?.address_line1 || ''} ${userData?.address_line2 || ''}, ${userData?.city || ''}, ${userData?.state || ''} ${userData?.zip_code || ''}`
  page.drawText(address.substring(0, 50), { x: margin + halfWidth + 5, y: y - 20, size: 7, font })
  y -= 30

  // SECTION II - PRELIMINARY REQUIREMENTS
  page.drawRectangle({
    x: margin,
    y: y - 15,
    width: pageWidth - 2 * margin,
    height: 15,
    color: rgb(0.9, 0.9, 0.9),
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
  })
  page.drawText(
    'SECTION II - PRELIMINARY REQUIREMENTS (If you answer NO to ALL questions 8a-8d, you are NOT eligible for CRSC)',
    { x: margin + 5, y: y - 12, size: 7, font: boldFont }
  )
  y -= 20

  const questions = [
    '8a. Are you entitled to military retired pay?',
    '8b. Do you have a VA disability rating of at least 10%?',
    '8c. Have you filed a DD Form 2860 for combat-related disabilities rated by the VA?',
    '8d. Is your military retirement pay currently reduced due to receipt of VA disability compensation?',
  ]
  for (const question of questions) {
    drawBox(page, margin, y, pageWidth - 2 * margin, 18)
    page.drawText(question, { x: margin + 5, y: y - 12, size: 7, font })
    drawCheckbox(page, pageWidth - margin - 80, y - 3, true, 'YES')
    drawCheckbox(page, pageWidth - margin - 40, y - 3, false, 'NO')
    y -= 18
  }
  y -= 10

  // SECTION III - SERVICE HISTORY
  page.drawRectangle({
    x: margin,
    y: y - 15,
    width: pageWidth - 2 * margin,
    height: 15,
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

  // Retirement date / type
  drawBox(page, margin, y, halfWidth, 25)
  page.drawText('RETIREMENT DATE', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(toStr(militaryService?.retirement_date), { x: margin + 5, y: y - 20, size: 9, font })

  drawBox(page, margin + halfWidth, y, halfWidth, 25)
  page.drawText('RETIREMENT TYPE', { x: margin + halfWidth + 2, y: y - 8, size: 6, font: boldFont })
  page.drawText(toStr(militaryService?.retirement_type), { x: margin + halfWidth + 5, y: y - 20, size: 9, font })
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
  page.drawText(toStr(vaDisability?.va_file_number), { x: margin + 5, y: y - 20, size: 10, font })
  y -= 30

  // Footer page 1
  page.drawText('DD FORM 2860, JUL 2011', { x: margin, y: 25, size: 7, font })
  page.drawText('Page 1 of ' + (claims.length + 2), { x: pageWidth - margin - 50, y: 25, size: 7, font })

  // ===== PAGES 2+ - One page per disability claim (Section IV) =====
  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i]

    page = pdfDoc.addPage([pageWidth, pageHeight])
    y = pageHeight - margin

    // Section header
    page.drawRectangle({
      x: margin,
      y: y - 15,
      width: pageWidth - 2 * margin,
      height: 15,
      color: rgb(0.9, 0.9, 0.9),
      borderColor: rgb(0, 0, 0),
      borderWidth: 0.5,
    })
    page.drawText(`SECTION IV - COMBAT-RELATEDNESS DETERMINATION - DISABILITY ${i + 1} of ${claims.length}`, {
      x: margin + 5,
      y: y - 12,
      size: 9,
      font: boldFont,
    })
    y -= 20

    page.drawText(
      '13. COMPLETE ONE ITEM 13 BLOCK FOR EACH DISABILITY RATED BY THE VA THAT YOU THINK IS COMBAT-RELATED.',
      { x: margin, y, size: 7, font: boldFont }
    )
    y -= 15

    // 13a. VA Disability Code
    drawBox(page, margin, y, 150, 25)
    page.drawText('13a. VA DISABILITY CODE', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText(toStr(claim.disability_code), { x: margin + 5, y: y - 20, size: 10, font })

    // 13b. Disability Description
    drawBox(page, margin + 150, y, pageWidth - 2 * margin - 150, 25)
    page.drawText('13b. DESCRIPTION OF DISABILITY', { x: margin + 152, y: y - 8, size: 6, font: boldFont })
    page.drawText(toStr(claim.disability_title).substring(0, 50), { x: margin + 155, y: y - 20, size: 9, font })
    y -= 25

    // 13c. Rating percentage & 13d. Date awarded
    drawBox(page, margin, y, halfWidth, 25)
    page.drawText('13c. CURRENT VA RATING PERCENTAGE', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText(claim.current_rating_percentage ? `${claim.current_rating_percentage}%` : '', {
      x: margin + 5,
      y: y - 20,
      size: 10,
      font,
    })

    drawBox(page, margin + halfWidth, y, halfWidth, 25)
    page.drawText('13d. DATE DISABILITY WAS AWARDED BY VA', { x: margin + halfWidth + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText(toStr(claim.date_awarded_by_va), { x: margin + halfWidth + 5, y: y - 20, size: 9, font })
    y -= 25

    // 13e. Initial rating & 13f. Body part
    drawBox(page, margin, y, halfWidth, 25)
    page.drawText('13e. INITIAL VA RATING PERCENTAGE', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText(claim.initial_rating_percentage ? `${claim.initial_rating_percentage}%` : '', {
      x: margin + 5,
      y: y - 20,
      size: 10,
      font,
    })

    drawBox(page, margin + halfWidth, y, halfWidth, 25)
    page.drawText('13f. BODY PART AFFECTED', { x: margin + halfWidth + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText(toStr(claim.body_part_affected).substring(0, 40), { x: margin + halfWidth + 5, y: y - 20, size: 9, font })
    y -= 30

    // 13g. Combat-related category
    drawBox(page, margin, y, pageWidth - 2 * margin, 60)
    page.drawText('13g. CATEGORY THAT BEST DESCRIBES HOW YOUR DISABILITY IS COMBAT-RELATED (Check only ONE)', {
      x: margin + 2,
      y: y - 10,
      size: 7,
      font: boldFont,
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
      if (j === 4) {
        catX = margin + 10
        catY -= 15
      }
      drawCheckbox(page, catX, catY, claim.combat_related_code === combatCategories[j].code, combatCategories[j].label)
      catX += 130
    }
    y -= 65

    // 13h. Unit of assignment
    drawBox(page, margin, y, pageWidth - 2 * margin, 25)
    page.drawText('13h. UNIT OF ASSIGNMENT AT THE TIME OF INJURY/ILLNESS/DISEASE/EVENT', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText(toStr(claim.unit_of_assignment).substring(0, 80), { x: margin + 5, y: y - 20, size: 9, font })
    y -= 25

    // 13i. Location
    drawBox(page, margin, y, pageWidth - 2 * margin, 25)
    page.drawText('13i. LOCATION/AREA OF ASSIGNMENT AT TIME OF INJURY/ILLNESS/DISEASE/EVENT', { x: margin + 2, y: y - 8, size: 6, font: boldFont })
    page.drawText(toStr(claim.location_of_injury).substring(0, 80), { x: margin + 5, y: y - 20, size: 9, font })
    y -= 30

    // 13j. Description of event (multi-line)
    drawBox(page, margin, y, pageWidth - 2 * margin, 120)
    page.drawText('13j. EXPLANATION OF HOW DISABILITY WAS CAUSED (Provide details of combat-related incident)', {
      x: margin + 2,
      y: y - 10,
      size: 7,
      font: boldFont,
    })

    const description = toStr(claim.description_of_event)
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
        if (descY < y - 110) break
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
    const purpleHeart = claim.received_purple_heart === 1 || claim.received_purple_heart === true
    drawCheckbox(page, pageWidth - margin - 80, y - 5, purpleHeart, 'YES')
    drawCheckbox(page, pageWidth - margin - 40, y - 5, !purpleHeart, 'NO')
    y -= 25

    // 13l. Secondary conditions
    drawBox(page, margin, y, pageWidth - 2 * margin, 20)
    page.drawText('13l. ARE THERE SECONDARY CONDITIONS ASSOCIATED WITH THIS DISABILITY?', { x: margin + 5, y: y - 13, size: 7, font: boldFont })
    const hasSecondary = claim.has_secondary_conditions === 1 || claim.has_secondary_conditions === true
    drawCheckbox(page, pageWidth - margin - 80, y - 5, hasSecondary, 'YES')
    drawCheckbox(page, pageWidth - margin - 40, y - 5, !hasSecondary, 'NO')
    y -= 25

    // Footer
    page.drawText('DD FORM 2860, JUL 2011', { x: margin, y: 25, size: 7, font })
    page.drawText(`Page ${i + 2} of ${claims.length + 2}`, { x: pageWidth - margin - 50, y: 25, size: 7, font })
  }

  // ===== FINAL PAGE - Supporting Documents & Certification =====
  page = pdfDoc.addPage([pageWidth, pageHeight])
  y = pageHeight - margin

  // SECTION V
  page.drawRectangle({
    x: margin,
    y: y - 15,
    width: pageWidth - 2 * margin,
    height: 15,
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

  page.drawText(
    'NOTE: DO NOT SEND ORIGINAL DOCUMENTS. Send copies only. Original documents will not be returned.',
    { x: margin, y, size: 8, font: boldFont, color: rgb(0.8, 0, 0) }
  )
  y -= 30

  // SECTION VI - Certification
  page.drawRectangle({
    x: margin,
    y: y - 15,
    width: pageWidth - 2 * margin,
    height: 15,
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
  page.drawText(
    `${userData?.first_name || ''} ${userData?.middle_initial || ''} ${userData?.last_name || ''}`.toUpperCase(),
    { x: margin + 100, y, size: 10, font }
  )

  // Footer
  page.drawText('DD FORM 2860, JUL 2011', { x: margin, y: 25, size: 7, font })
  page.drawText('PREVIOUS EDITIONS ARE OBSOLETE', { x: margin + 150, y: 25, size: 7, font })
  page.drawText(`Page ${claims.length + 2} of ${claims.length + 2}`, { x: pageWidth - margin - 50, y: 25, size: 7, font })

  return pdfDoc.save()
}

// ---------------------------------------------------------------------------
// Cover Letter Generator
// ---------------------------------------------------------------------------

export async function generateCoverLetter(): Promise<Uint8Array> {
  const { personalInfo: userData, militaryService, claims } = readAllData()

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792])
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const boldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

  const { width, height } = page.getSize()
  const margin = 72
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
    const maxWidth = width - 2 * margin
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
    if (line) drawText(line)
    yPosition -= lineHeight / 2
  }

  const branchInfo = BRANCH_ADDRESSES[toStr(militaryService?.branch)]
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

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
  drawText('Subject: Application for Combat-Related Special Compensation (CRSC)', { bold: true })
  yPosition -= 10

  // Applicant info
  drawText(`Applicant: ${userData?.first_name || ''} ${userData?.middle_initial || ''} ${userData?.last_name || ''}`)
  if (userData?.ssn_encrypted) {
    drawText(`SSN: XXX-XX-${toStr(userData.ssn_encrypted).slice(-4)}`)
  }
  yPosition -= 20

  // Body
  drawText('Dear CRSC Review Board,', { bold: true })
  yPosition -= 10

  drawParagraph(
    `I am hereby submitting my application for Combat-Related Special Compensation (CRSC) in accordance with 10 U.S.C. \u00A7 1413a. I am a retired member of the ${getBranchName(toStr(militaryService?.branch))} and have VA-rated service-connected disabilities that I believe qualify for CRSC.`
  )
  yPosition -= 10

  drawParagraph('Enclosed with this application, please find:')
  yPosition -= 5

  drawText('1. Completed DD Form 2860', { indent: 20 })
  drawText('2. Copy of DD Form 214/215', { indent: 20 })
  drawText('3. Copy of Retirement Orders', { indent: 20 })
  drawText('4. Copy of VA Rating Decision Letter', { indent: 20 })
  drawText('5. Copy of VA Code Sheet', { indent: 20 })
  drawText('6. Supporting medical documentation', { indent: 20 })
  yPosition -= 10

  drawParagraph(
    `I am claiming ${claims.length} service-connected ${claims.length === 1 ? 'disability' : 'disabilities'} as combat-related:`
  )
  yPosition -= 5

  for (let i = 0; i < claims.length && i < 5; i++) {
    const claim = claims[i]
    const codeDesc = COMBAT_CODES[toStr(claim.combat_related_code)] || toStr(claim.combat_related_code)
    drawText(`${i + 1}. ${claim.disability_title || ''} (${claim.current_rating_percentage || 0}%) - ${codeDesc}`, {
      indent: 20,
    })
  }
  if (claims.length > 5) {
    drawText(`   ... and ${claims.length - 5} additional ${claims.length - 5 === 1 ? 'claim' : 'claims'}`, { indent: 20 })
  }
  yPosition -= 10

  drawParagraph(
    'I certify that the information provided in this application and all supporting documentation is true and accurate to the best of my knowledge. I understand that providing false information may result in denial of benefits and potential legal consequences.'
  )
  yPosition -= 10

  drawParagraph(
    'Please contact me at the address or phone number provided on DD Form 2860 if you require any additional information or documentation.'
  )
  yPosition -= 20

  drawText('Respectfully submitted,')
  yPosition -= 40

  drawText('_________________________________')
  drawText(`${userData?.first_name || ''} ${userData?.middle_initial || ''} ${userData?.last_name || ''}`)
  if (militaryService?.retired_rank) {
    drawText(`${militaryService.retired_rank}, ${getBranchName(toStr(militaryService?.branch))} (Retired)`)
  }

  return pdfDoc.save()
}

// ---------------------------------------------------------------------------
// Submission Instructions Generator
// ---------------------------------------------------------------------------

export async function generateSubmissionInstructions(): Promise<Uint8Array> {
  const { militaryService } = readAllData()

  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 60
  const pageWidth = 612
  let y = 792 - margin

  const drawText = (text: string, options: { bold?: boolean; size?: number; indent?: number } = {}) => {
    const fontSize = options.size || 11
    const textFont = options.bold ? boldFont : font
    page.drawText(text, {
      x: margin + (options.indent || 0),
      y,
      size: fontSize,
      font: textFont,
      color: rgb(0, 0, 0),
    })
    y -= fontSize + 5
  }

  const drawParagraph = (text: string, fontSize = 11) => {
    const words = text.split(' ')
    let line = ''
    const maxWidth = pageWidth - 2 * margin
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word
      const textWidth = font.widthOfTextAtSize(testLine, fontSize)
      if (textWidth > maxWidth) {
        drawText(line, { size: fontSize })
        line = word
      } else {
        line = testLine
      }
    }
    if (line) drawText(line, { size: fontSize })
    y -= 6
  }

  // Title
  drawText('CRSC SUBMISSION INSTRUCTIONS', { bold: true, size: 16 })
  y -= 15

  // Branch-specific mailing address
  const branch = toStr(militaryService?.branch)
  const branchInfo = BRANCH_ADDRESSES[branch]

  drawText('1. MAILING ADDRESS', { bold: true, size: 13 })
  y -= 5
  drawParagraph('Mail your completed CRSC application packet to the following address:')
  y -= 5

  if (branchInfo) {
    drawText(branchInfo.name, { bold: true, indent: 20 })
    for (const line of branchInfo.address.split('\n')) {
      drawText(line, { indent: 20 })
    }
    if (branchInfo.email) {
      y -= 3
      drawText(`Email: ${branchInfo.email}`, { indent: 20 })
    }
  } else {
    drawText('Please verify the correct mailing address for your branch of service.', { indent: 20 })
  }
  y -= 15

  // Recommended mailing method
  drawText('2. RECOMMENDED MAILING METHOD', { bold: true, size: 13 })
  y -= 5
  drawParagraph(
    'It is strongly recommended that you send your application via USPS Certified Mail with Return Receipt Requested. This provides proof of delivery and a tracking number. Keep a complete copy of your entire application packet for your records.'
  )
  y -= 10

  // What to expect
  drawText('3. WHAT TO EXPECT AFTER SUBMISSION', { bold: true, size: 13 })
  y -= 5
  drawParagraph(
    'After submitting your CRSC application, the review board for your branch of service will review your claim. Typical processing times vary by branch but can range from 6 to 18 months. You should receive an acknowledgment letter within a few weeks confirming receipt of your application.'
  )
  y -= 5
  drawParagraph(
    'The board may request additional documentation during the review process. Respond promptly to any requests to avoid delays.'
  )
  y -= 5
  drawParagraph(
    'Following the Supreme Court\'s June 2025 ruling in Soto v. United States, the previous 6-year back pay limit has been eliminated. Eligible veterans may now receive full retroactive payments to their initial eligibility date.'
  )
  y -= 10

  // Reconsideration
  drawText('4. HOW TO REQUEST RECONSIDERATION', { bold: true, size: 13 })
  y -= 5
  drawParagraph(
    'If your claim is denied, you have the right to request reconsideration. A reconsideration request should include:'
  )
  y -= 3
  drawText('- A written statement explaining why you disagree with the decision', { indent: 20 })
  drawText('- Any new or additional evidence supporting your claim', { indent: 20 })
  drawText('- Medical opinions or buddy statements if available', { indent: 20 })
  drawText('- Corrected information if there were errors in your original application', { indent: 20 })
  y -= 8
  drawParagraph(
    'Submit your reconsideration request to the same address listed above. There is no time limit for reconsideration, but it is best to submit as soon as possible after receiving the denial.'
  )
  y -= 15

  // Important reminders
  drawText('5. IMPORTANT REMINDERS', { bold: true, size: 13 })
  y -= 5
  drawText('- DO NOT send original documents. Send copies only.', { indent: 10 })
  drawText('- Keep a complete copy of your entire application packet.', { indent: 10 })
  drawText('- Sign and date your DD Form 2860 in ink before mailing.', { indent: 10 })
  drawText('- Include all supporting documentation listed on the checklist.', { indent: 10 })

  // Footer
  page.drawText('Generated by CRSC Filing Assistant', { x: margin, y: 30, size: 8, font, color: rgb(0.5, 0.5, 0.5) })

  return pdfDoc.save()
}

// ---------------------------------------------------------------------------
// Package Assembler
// ---------------------------------------------------------------------------

export async function assemblePackage(): Promise<string> {
  const { personalInfo, militaryService, documents } = readAllData()

  const lastName = toStr(personalInfo?.last_name) || 'Unknown'
  const dateStr = new Date().toISOString().split('T')[0]
  const folderName = `CRSC_Package_${lastName}_${dateStr}`

  const packagesDir = path.join(app.getPath('userData'), 'packages')
  const packageDir = path.join(packagesDir, folderName)
  const supportingDir = path.join(packageDir, 'Supporting_Documents')

  // Clean up any previous package with the same name
  if (fs.existsSync(packageDir)) {
    fs.rmSync(packageDir, { recursive: true, force: true })
  }
  fs.mkdirSync(supportingDir, { recursive: true })

  // Generate DD Form 2860
  const dd2860Bytes = await generateDD2860()
  fs.writeFileSync(path.join(packageDir, 'DD_Form_2860.pdf'), Buffer.from(dd2860Bytes))

  // Generate cover letter
  const coverLetterBytes = await generateCoverLetter()
  fs.writeFileSync(path.join(packageDir, 'Cover_Letter.pdf'), Buffer.from(coverLetterBytes))

  // Generate submission instructions
  const instructionsBytes = await generateSubmissionInstructions()
  fs.writeFileSync(path.join(packageDir, 'Submission_Instructions.pdf'), Buffer.from(instructionsBytes))

  // Copy uploaded supporting documents
  for (const doc of documents) {
    const srcPath = toStr(doc.file_path)
    if (srcPath && fs.existsSync(srcPath)) {
      const fileName = toStr(doc.file_name) || path.basename(srcPath)
      const destPath = path.join(supportingDir, fileName)
      fs.copyFileSync(srcPath, destPath)
    }
  }

  return packageDir
}
