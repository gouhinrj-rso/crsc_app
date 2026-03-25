// Extracted document data types (moved from api.ts)

export interface ExtractedDisability {
  title: string
  diagnosticCode?: string
  percentage: number
  effectiveDate?: string
  bodyPart?: string
}

export interface ExtractedVADecisionLetter {
  disabilities: ExtractedDisability[]
  combinedRating?: number
  decisionDate?: string
  vaFileNumber?: string
}

export interface ExtractedCodeSheet {
  disabilities: Array<{
    diagnosticCode: string
    description: string
    percentage: number
  }>
  combinedRating?: number
}

export interface ExtractedDD214 {
  branch?: string
  entryDate?: string
  separationDate?: string
  rank?: string
  yearsOfService?: number
  characterOfService?: string
}

export type ExtractedDocumentData =
  | ExtractedVADecisionLetter
  | ExtractedCodeSheet
  | ExtractedDD214
