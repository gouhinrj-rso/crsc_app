// SQLite database types for single-user Electron app
// boolean fields use number (0/1) to match SQLite INTEGER storage

export interface PersonalInformation {
  id: string
  first_name: string | null
  middle_initial: string | null
  last_name: string | null
  ssn_encrypted: string | null
  date_of_birth: string | null
  email: string | null
  phone: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  created_at: string
  updated_at: string
}

export interface MilitaryService {
  id: string
  branch: string | null
  service_number: string | null
  retired_rank: string | null
  retirement_date: string | null
  years_of_service: number | null
  retirement_type: string | null
  dd214_uploaded: number
  retirement_orders_uploaded: number
  created_at: string
  updated_at: string
}

export interface VaDisabilityInfo {
  id: string
  va_file_number: string | null
  current_va_rating: number | null
  va_decision_date: string | null
  has_va_waiver: number
  receives_crdp: number
  code_sheet_uploaded: number
  decision_letter_uploaded: number
  created_at: string
  updated_at: string
}

export interface DisabilityClaim {
  id: string
  disability_title: string | null
  disability_code: string | null
  body_part_affected: string | null
  date_awarded_by_va: string | null
  initial_rating_percentage: number | null
  current_rating_percentage: number | null
  combat_related_code: string | null
  unit_of_assignment: string | null
  location_of_injury: string | null
  description_of_event: string | null
  received_purple_heart: number
  has_secondary_conditions: number
  created_at: string
  updated_at: string
}

export interface SecondaryCondition {
  id: string
  primary_claim_id: string
  disability_code: string | null
  description: string | null
  percentage: number | null
  date_awarded: string | null
  created_at: string
}

export interface Document {
  id: string
  document_type: string | null
  file_name: string | null
  file_path: string | null
  file_size: number | null
  mime_type: string | null
  uploaded_at: string
  verified: number
}

export interface ChatMessage {
  id: string
  message: string
  role: string
  created_at: string
}

export interface PacketStatus {
  id: string
  step_name: string | null
  step_status: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface Setting {
  key: string
  value: string | null
}
