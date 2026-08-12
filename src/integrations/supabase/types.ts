export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      consent_records: {
        Row: {
          accepted_at: string
          document: string
          id: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          document: string
          id?: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          document?: string
          id?: string
          user_id?: string
          version?: string
        }
        Relationships: []
      }
      customer_profiles: {
        Row: {
          country: string
          country_code: string | null
          created_at: string
          deleted_at: string | null
          display_name: string | null
          email: string | null
          email_verified_at: string | null
          first_name: string | null
          id: string
          language: string
          last_name: string | null
          normalized_phone: string | null
          phone_number: string | null
          phone_verified_at: string | null
          photo_path: string | null
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          country?: string
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          id: string
          language?: string
          last_name?: string | null
          normalized_phone?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          photo_path?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          country?: string
          country_code?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          email_verified_at?: string | null
          first_name?: string | null
          id?: string
          language?: string
          last_name?: string | null
          normalized_phone?: string | null
          phone_number?: string | null
          phone_verified_at?: string | null
          photo_path?: string | null
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          country_code: string
          created_at: string
          id: string
          name: string
          phone_number: string
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          id?: string
          name: string
          phone_number: string
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          id?: string
          name?: string
          phone_number?: string
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          account_email: boolean
          booking_email: boolean
          booking_push: boolean
          created_at: string
          promotional_email: boolean
          promotional_push: boolean
          security_email: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email?: boolean
          booking_email?: boolean
          booking_push?: boolean
          created_at?: string
          promotional_email?: boolean
          promotional_push?: boolean
          security_email?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: boolean
          booking_email?: boolean
          booking_push?: boolean
          created_at?: string
          promotional_email?: boolean
          promotional_push?: boolean
          security_email?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_places: {
        Row: {
          address: string
          created_at: string
          id: string
          label: Database["public"]["Enums"]["place_label"]
          latitude: number
          longitude: number
          name: string
          place_identifier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          label?: Database["public"]["Enums"]["place_label"]
          latitude: number
          longitude: number
          name: string
          place_identifier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          label?: Database["public"]["Enums"]["place_label"]
          latitude?: number
          longitude?: number
          name?: string
          place_identifier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_devices: {
        Row: {
          app_version: string | null
          created_at: string
          device_id: string
          device_name: string | null
          id: string
          last_active_at: string
          last_ip: string | null
          platform: string | null
          user_id: string
        }
        Insert: {
          app_version?: string | null
          created_at?: string
          device_id: string
          device_name?: string | null
          id?: string
          last_active_at?: string
          last_ip?: string | null
          platform?: string | null
          user_id: string
        }
        Update: {
          app_version?: string | null
          created_at?: string
          device_id?: string
          device_name?: string | null
          id?: string
          last_active_at?: string
          last_ip?: string | null
          platform?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      account_status:
        | "PENDING"
        | "ACTIVE"
        | "SUSPENDED"
        | "DEACTIVATED"
        | "DELETED"
      app_role:
        | "customer"
        | "driver"
        | "operator_owner"
        | "operator_manager"
        | "operator_staff"
        | "accountant"
        | "support_agent"
        | "admin"
        | "super_admin"
      place_label: "HOME" | "WORK" | "OTHER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status: [
        "PENDING",
        "ACTIVE",
        "SUSPENDED",
        "DEACTIVATED",
        "DELETED",
      ],
      app_role: [
        "customer",
        "driver",
        "operator_owner",
        "operator_manager",
        "operator_staff",
        "accountant",
        "support_agent",
        "admin",
        "super_admin",
      ],
      place_label: ["HOME", "WORK", "OTHER"],
    },
  },
} as const
