export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          created_at: string
          updated_at: string
          last_login: string | null
          profile_completed: boolean
          packet_status: string
          is_admin: boolean
          veteran_verified: boolean
          veteran_verified_at: string | null
          idme_uuid: string | null
          military_status: string | null
        }
        Insert: {
          id?: string
          email: string
          created_at?: string
          updated_at?: string
          last_login?: string | null
          profile_completed?: boolean
          packet_status?: string
          is_admin?: boolean
          veteran_verified?: boolean
          veteran_verified_at?: string | null
          idme_uuid?: string | null
          military_status?: string | null
        }
        Update: {
          id?: string
          email?: string
          created_at?: string
          updated_at?: string
          last_login?: string | null
          profile_completed?: boolean
          packet_status?: string
          is_admin?: boolean
          veteran_verified?: boolean
          veteran_verified_at?: string | null
          idme_uuid?: string | null
          military_status?: string | null
        }
        Relationships: []
      }
      personal_information: {
        Row: {
          id: string
          user_id: string
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
        Insert: {
          id?: string
          user_id: string
          first_name?: string | null
          middle_initial?: string | null
          last_name?: string | null
          ssn_encrypted?: string | null
          date_of_birth?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          first_name?: string | null
          middle_initial?: string | null
          last_name?: string | null
          ssn_encrypted?: string | null
          date_of_birth?: string | null
          email?: string | null
          phone?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          state?: string | null
          zip_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_information_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      military_service: {
        Row: {
          id: string
          user_id: string
          branch: string | null
          service_number: string | null
          retired_rank: string | null
          retirement_date: string | null
          years_of_service: number | null
          retirement_type: string | null
          dd214_uploaded: boolean
          retirement_orders_uploaded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          branch?: string | null
          service_number?: string | null
          retired_rank?: string | null
          retirement_date?: string | null
          years_of_service?: number | null
          retirement_type?: string | null
          dd214_uploaded?: boolean
          retirement_orders_uploaded?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          branch?: string | null
          service_number?: string | null
          retired_rank?: string | null
          retirement_date?: string | null
          years_of_service?: number | null
          retirement_type?: string | null
          dd214_uploaded?: boolean
          retirement_orders_uploaded?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "military_service_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      va_disability_info: {
        Row: {
          id: string
          user_id: string
          va_file_number: string | null
          current_va_rating: number | null
          va_decision_date: string | null
          has_va_waiver: boolean
          receives_crdp: boolean
          code_sheet_uploaded: boolean
          decision_letter_uploaded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          va_file_number?: string | null
          current_va_rating?: number | null
          va_decision_date?: string | null
          has_va_waiver?: boolean
          receives_crdp?: boolean
          code_sheet_uploaded?: boolean
          decision_letter_uploaded?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          va_file_number?: string | null
          current_va_rating?: number | null
          va_decision_date?: string | null
          has_va_waiver?: boolean
          receives_crdp?: boolean
          code_sheet_uploaded?: boolean
          decision_letter_uploaded?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "va_disability_info_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      disability_claims: {
        Row: {
          id: string
          user_id: string
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
          received_purple_heart: boolean
          has_secondary_conditions: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          disability_title?: string | null
          disability_code?: string | null
          body_part_affected?: string | null
          date_awarded_by_va?: string | null
          initial_rating_percentage?: number | null
          current_rating_percentage?: number | null
          combat_related_code?: string | null
          unit_of_assignment?: string | null
          location_of_injury?: string | null
          description_of_event?: string | null
          received_purple_heart?: boolean
          has_secondary_conditions?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          disability_title?: string | null
          disability_code?: string | null
          body_part_affected?: string | null
          date_awarded_by_va?: string | null
          initial_rating_percentage?: number | null
          current_rating_percentage?: number | null
          combat_related_code?: string | null
          unit_of_assignment?: string | null
          location_of_injury?: string | null
          description_of_event?: string | null
          received_purple_heart?: boolean
          has_secondary_conditions?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disability_claims_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      secondary_conditions: {
        Row: {
          id: string
          primary_claim_id: string
          disability_code: string | null
          description: string | null
          percentage: number | null
          date_awarded: string | null
          created_at: string
        }
        Insert: {
          id?: string
          primary_claim_id: string
          disability_code?: string | null
          description?: string | null
          percentage?: number | null
          date_awarded?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          primary_claim_id?: string
          disability_code?: string | null
          description?: string | null
          percentage?: number | null
          date_awarded?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "secondary_conditions_primary_claim_id_fkey"
            columns: ["primary_claim_id"]
            referencedRelation: "disability_claims"
            referencedColumns: ["id"]
          }
        ]
      }
      documents: {
        Row: {
          id: string
          user_id: string
          document_type: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          mime_type: string | null
          uploaded_at: string
          verified: boolean
        }
        Insert: {
          id?: string
          user_id: string
          document_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          mime_type?: string | null
          uploaded_at?: string
          verified?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          document_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          mime_type?: string | null
          uploaded_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "documents_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_history: {
        Row: {
          id: string
          user_id: string
          message: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          role?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_history_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      packet_status: {
        Row: {
          id: string
          user_id: string
          step_name: string | null
          step_status: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          step_name?: string | null
          step_status?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          step_name?: string | null
          step_status?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "packet_status_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      payments: {
        Row: {
          id: string
          user_id: string
          stripe_payment_id: string | null
          amount: number | null
          currency: string
          status: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          stripe_payment_id?: string | null
          amount?: number | null
          currency?: string
          status?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          stripe_payment_id?: string | null
          amount?: number | null
          currency?: string
          status?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string | null
          resource_type: string | null
          resource_id: string | null
          ip_address: string | null
          user_agent: string | null
          details: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action?: string | null
          resource_type?: string | null
          resource_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          details?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string | null
          resource_type?: string | null
          resource_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          details?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      verification_log: {
        Row: {
          id: string
          user_id: string
          provider: string
          status: string
          military_status: string | null
          idme_uuid: string | null
          error_message: string | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider?: string
          status: string
          military_status?: string | null
          idme_uuid?: string | null
          error_message?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          status?: string
          military_status?: string | null
          idme_uuid?: string | null
          error_message?: string | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_log_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
