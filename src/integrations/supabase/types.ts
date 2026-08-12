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
      booking_driver_requests: {
        Row: {
          booking_id: string
          created_at: string
          distance_to_pickup_km: number | null
          driver_id: string
          expires_at: string
          id: string
          responded_at: string | null
          sent_at: string
          status: Database["public"]["Enums"]["ride_request_status"]
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          distance_to_pickup_km?: number | null
          driver_id: string
          expires_at: string
          id?: string
          responded_at?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["ride_request_status"]
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          distance_to_pickup_km?: number | null
          driver_id?: string
          expires_at?: string
          id?: string
          responded_at?: string | null
          sent_at?: string
          status?: Database["public"]["Enums"]["ride_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_driver_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          accepted_at: string | null
          arrived_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          currency: string
          customer_id: string
          destination_address: string
          destination_captured_at: string
          destination_latitude: number
          destination_longitude: number
          driver_id: string | null
          estimated_distance_metres: number
          estimated_duration_seconds: number
          estimated_fare: number
          expires_at: string | null
          fare_config_version: number
          fare_snapshot: Json
          final_distance_metres: number | null
          final_duration_seconds: number | null
          final_fare: number | null
          id: string
          idempotency_key: string | null
          pickup_address: string
          pickup_captured_at: string
          pickup_latitude: number
          pickup_longitude: number
          pickup_source: string
          public_id: string
          requested_at: string
          ride_otp_attempts: number
          ride_otp_expires_at: string | null
          ride_otp_hash: string | null
          route_source: string
          search_radius_km: number | null
          search_started_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          started_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          arrived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          destination_address: string
          destination_captured_at?: string
          destination_latitude: number
          destination_longitude: number
          driver_id?: string | null
          estimated_distance_metres: number
          estimated_duration_seconds: number
          estimated_fare: number
          expires_at?: string | null
          fare_config_version: number
          fare_snapshot: Json
          final_distance_metres?: number | null
          final_duration_seconds?: number | null
          final_fare?: number | null
          id?: string
          idempotency_key?: string | null
          pickup_address: string
          pickup_captured_at?: string
          pickup_latitude: number
          pickup_longitude: number
          pickup_source?: string
          public_id: string
          requested_at?: string
          ride_otp_attempts?: number
          ride_otp_expires_at?: string | null
          ride_otp_hash?: string | null
          route_source?: string
          search_radius_km?: number | null
          search_started_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          arrived_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          destination_address?: string
          destination_captured_at?: string
          destination_latitude?: number
          destination_longitude?: number
          driver_id?: string | null
          estimated_distance_metres?: number
          estimated_duration_seconds?: number
          estimated_fare?: number
          expires_at?: string | null
          fare_config_version?: number
          fare_snapshot?: Json
          final_distance_metres?: number | null
          final_duration_seconds?: number | null
          final_fare?: number | null
          id?: string
          idempotency_key?: string | null
          pickup_address?: string
          pickup_captured_at?: string
          pickup_latitude?: number
          pickup_longitude?: number
          pickup_source?: string
          public_id?: string
          requested_at?: string
          ride_otp_attempts?: number
          ride_otp_expires_at?: string | null
          ride_otp_hash?: string | null
          route_source?: string
          search_radius_km?: number | null
          search_started_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "driver_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      driver_availability: {
        Row: {
          created_at: string
          current_booking_id: string | null
          driver_id: string
          last_seen_at: string
          latitude: number | null
          location_updated_at: string | null
          longitude: number | null
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["driver_availability_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_booking_id?: string | null
          driver_id: string
          last_seen_at?: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["driver_availability_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_booking_id?: string | null
          driver_id?: string
          last_seen_at?: string
          latitude?: number | null
          location_updated_at?: string | null
          longitude?: number | null
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["driver_availability_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_availability_current_booking_fkey"
            columns: ["current_booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_profiles: {
        Row: {
          approved_at: string | null
          country_code: string
          created_at: string
          full_name: string | null
          id: string
          phone_number: string | null
          photo_path: string | null
          status: Database["public"]["Enums"]["driver_account_status"]
          suspended_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          country_code?: string
          created_at?: string
          full_name?: string | null
          id: string
          phone_number?: string | null
          photo_path?: string | null
          status?: Database["public"]["Enums"]["driver_account_status"]
          suspended_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          country_code?: string
          created_at?: string
          full_name?: string | null
          id?: string
          phone_number?: string | null
          photo_path?: string | null
          status?: Database["public"]["Enums"]["driver_account_status"]
          suspended_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      driver_vehicles: {
        Row: {
          colour: string | null
          created_at: string
          driver_id: string
          id: string
          is_active: boolean
          make_model: string
          registration_number: string
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          colour?: string | null
          created_at?: string
          driver_id: string
          id?: string
          is_active?: boolean
          make_model: string
          registration_number: string
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          colour?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          is_active?: boolean
          make_model?: string
          registration_number?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          verified_at?: string | null
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
      fare_configs: {
        Row: {
          base_fare: number
          created_at: string
          currency: string
          effective_from: string
          id: string
          is_active: boolean
          minimum_fare: number
          per_km_rate: number
          per_minute_rate: number
          road_distance_factor: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at: string
          version: number
        }
        Insert: {
          base_fare: number
          created_at?: string
          currency?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          minimum_fare: number
          per_km_rate: number
          per_minute_rate: number
          road_distance_factor?: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          version: number
        }
        Update: {
          base_fare?: number
          created_at?: string
          currency?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          minimum_fare?: number
          per_km_rate?: number
          per_minute_rate?: number
          road_distance_factor?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          version?: number
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
      ride_events: {
        Row: {
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["ride_actor_type"]
          booking_id: string
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["booking_status"] | null
          id: string
          metadata: Json
          to_status: Database["public"]["Enums"]["booking_status"] | null
        }
        Insert: {
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["ride_actor_type"]
          booking_id: string
          created_at?: string
          event_type: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          metadata?: Json
          to_status?: Database["public"]["Enums"]["booking_status"] | null
        }
        Update: {
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["ride_actor_type"]
          booking_id?: string
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["booking_status"] | null
          id?: string
          metadata?: Json
          to_status?: Database["public"]["Enums"]["booking_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_locations: {
        Row: {
          accuracy_metres: number | null
          booking_id: string
          created_at: string
          driver_id: string
          id: string
          latitude: number
          longitude: number
          recorded_at: string
        }
        Insert: {
          accuracy_metres?: number | null
          booking_id: string
          created_at?: string
          driver_id: string
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
        }
        Update: {
          accuracy_metres?: number | null
          booking_id?: string
          created_at?: string
          driver_id?: string
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_locations_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      service_configs: {
        Row: {
          created_at: string
          driver_response_seconds: number
          id: string
          initial_radius_km: number
          is_enabled: boolean
          location_stale_seconds: number
          maximum_radius_km: number
          min_trip_distance_metres: number
          radius_increment_km: number
          request_timeout_seconds: number
          ride_otp_max_attempts: number
          ride_otp_ttl_seconds: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_response_seconds?: number
          id?: string
          initial_radius_km?: number
          is_enabled?: boolean
          location_stale_seconds?: number
          maximum_radius_km?: number
          min_trip_distance_metres?: number
          radius_increment_km?: number
          request_timeout_seconds?: number
          ride_otp_max_attempts?: number
          ride_otp_ttl_seconds?: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_response_seconds?: number
          id?: string
          initial_radius_km?: number
          is_enabled?: boolean
          location_stale_seconds?: number
          maximum_radius_km?: number
          min_trip_distance_metres?: number
          radius_increment_km?: number
          request_timeout_seconds?: number
          ride_otp_max_attempts?: number
          ride_otp_ttl_seconds?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
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
      booking_status:
        | "REQUESTED"
        | "SEARCHING_DRIVER"
        | "DRIVER_ASSIGNED"
        | "DRIVER_EN_ROUTE"
        | "DRIVER_ARRIVED"
        | "READY_TO_START"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED_BY_CUSTOMER"
        | "CANCELLED_BY_DRIVER"
        | "DRIVER_REJECTED"
        | "NO_DRIVER_FOUND"
        | "EXPIRED"
        | "FAILED"
      driver_account_status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED"
      driver_availability_status: "OFFLINE" | "ONLINE" | "BUSY"
      place_label: "HOME" | "WORK" | "OTHER"
      ride_actor_type: "CUSTOMER" | "DRIVER" | "SYSTEM"
      ride_request_status:
        | "PENDING"
        | "ACCEPTED"
        | "REJECTED"
        | "EXPIRED"
        | "SUPERSEDED"
      service_type: "BIKE" | "AUTO" | "CAB"
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
      booking_status: [
        "REQUESTED",
        "SEARCHING_DRIVER",
        "DRIVER_ASSIGNED",
        "DRIVER_EN_ROUTE",
        "DRIVER_ARRIVED",
        "READY_TO_START",
        "IN_PROGRESS",
        "COMPLETED",
        "CANCELLED_BY_CUSTOMER",
        "CANCELLED_BY_DRIVER",
        "DRIVER_REJECTED",
        "NO_DRIVER_FOUND",
        "EXPIRED",
        "FAILED",
      ],
      driver_account_status: ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"],
      driver_availability_status: ["OFFLINE", "ONLINE", "BUSY"],
      place_label: ["HOME", "WORK", "OTHER"],
      ride_actor_type: ["CUSTOMER", "DRIVER", "SYSTEM"],
      ride_request_status: [
        "PENDING",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
        "SUPERSEDED",
      ],
      service_type: ["BIKE", "AUTO", "CAB"],
    },
  },
} as const
