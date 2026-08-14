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
      bus_bookings: {
        Row: {
          boarding_stop_id: string
          cancellation_fee: number
          cancellation_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          customer_id: string
          discount_amount: number
          discount_code: string | null
          dropping_stop_id: string
          fare_snapshot: Json
          hold_expires_at: string | null
          id: string
          lead_passenger_email: string | null
          lead_passenger_name: string
          lead_passenger_phone: string
          operator_id: string
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["bus_payment_status"]
          pnr: string
          refund_amount: number
          schedule_id: string
          seat_count: number
          seat_total: number
          status: Database["public"]["Enums"]["bus_booking_status"]
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          boarding_stop_id: string
          cancellation_fee?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_id: string
          discount_amount?: number
          discount_code?: string | null
          dropping_stop_id: string
          fare_snapshot: Json
          hold_expires_at?: string | null
          id?: string
          lead_passenger_email?: string | null
          lead_passenger_name: string
          lead_passenger_phone: string
          operator_id: string
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["bus_payment_status"]
          pnr: string
          refund_amount?: number
          schedule_id: string
          seat_count: number
          seat_total: number
          status?: Database["public"]["Enums"]["bus_booking_status"]
          tax_amount?: number
          total_amount: number
          updated_at?: string
        }
        Update: {
          boarding_stop_id?: string
          cancellation_fee?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_id?: string
          discount_amount?: number
          discount_code?: string | null
          dropping_stop_id?: string
          fare_snapshot?: Json
          hold_expires_at?: string | null
          id?: string
          lead_passenger_email?: string | null
          lead_passenger_name?: string
          lead_passenger_phone?: string
          operator_id?: string
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["bus_payment_status"]
          pnr?: string
          refund_amount?: number
          schedule_id?: string
          seat_count?: number
          seat_total?: number
          status?: Database["public"]["Enums"]["bus_booking_status"]
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_bookings_boarding_stop_id_fkey"
            columns: ["boarding_stop_id"]
            isOneToOne: false
            referencedRelation: "bus_schedule_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_bookings_dropping_stop_id_fkey"
            columns: ["dropping_stop_id"]
            isOneToOne: false
            referencedRelation: "bus_schedule_stops"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_bookings_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_bookings_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "bus_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_discounts: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          ends_at: string | null
          id: string
          max_discount_amount: number | null
          min_booking_amount: number
          name: string
          operator_id: string
          per_user_limit: number
          route_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["discount_status"]
          updated_at: string
          usage_limit: number | null
          used_count: number
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: string
          ends_at?: string | null
          id?: string
          max_discount_amount?: number | null
          min_booking_amount?: number
          name: string
          operator_id: string
          per_user_limit?: number
          route_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["discount_status"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          ends_at?: string | null
          id?: string
          max_discount_amount?: number | null
          min_booking_amount?: number
          name?: string
          operator_id?: string
          per_user_limit?: number
          route_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["discount_status"]
          updated_at?: string
          usage_limit?: number | null
          used_count?: number
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "bus_discounts_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_discounts_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_drivers: {
        Row: {
          assigned_bus_id: string | null
          created_at: string
          document_status: Database["public"]["Enums"]["document_status"]
          email: string | null
          full_name: string
          id: string
          licence_expiry: string | null
          licence_number: string
          operator_id: string
          phone: string
          photo_path: string | null
          status: Database["public"]["Enums"]["bus_driver_status"]
          updated_at: string
        }
        Insert: {
          assigned_bus_id?: string | null
          created_at?: string
          document_status?: Database["public"]["Enums"]["document_status"]
          email?: string | null
          full_name: string
          id?: string
          licence_expiry?: string | null
          licence_number: string
          operator_id: string
          phone: string
          photo_path?: string | null
          status?: Database["public"]["Enums"]["bus_driver_status"]
          updated_at?: string
        }
        Update: {
          assigned_bus_id?: string | null
          created_at?: string
          document_status?: Database["public"]["Enums"]["document_status"]
          email?: string | null
          full_name?: string
          id?: string
          licence_expiry?: string | null
          licence_number?: string
          operator_id?: string
          phone?: string
          photo_path?: string | null
          status?: Database["public"]["Enums"]["bus_driver_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_drivers_assigned_bus_id_fkey"
            columns: ["assigned_bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_drivers_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_ledger_entries: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          description: string | null
          entry_type: string
          id: string
          occurred_at: string
          operator_id: string
          schedule_id: string | null
          settlement_id: string | null
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          entry_type: string
          id?: string
          occurred_at?: string
          operator_id: string
          schedule_id?: string | null
          settlement_id?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          entry_type?: string
          id?: string
          occurred_at?: string
          operator_id?: string
          schedule_id?: string | null
          settlement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bus_ledger_entries_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bus_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_ledger_entries_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_ledger_entries_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "bus_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_ledger_entries_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "bus_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_operators: {
        Row: {
          address: string | null
          bank_account_last4: string | null
          bank_account_name: string | null
          bank_ifsc: string | null
          business_name: string
          city: string | null
          commission_percent: number
          contact_email: string | null
          contact_person: string
          contact_phone: string
          created_at: string
          gst_number: string | null
          id: string
          owner_user_id: string
          state: string | null
          status: Database["public"]["Enums"]["operator_status"]
          suspended_at: string | null
          updated_at: string
          verification_notes: string | null
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          bank_account_last4?: string | null
          bank_account_name?: string | null
          bank_ifsc?: string | null
          business_name: string
          city?: string | null
          commission_percent?: number
          contact_email?: string | null
          contact_person: string
          contact_phone: string
          created_at?: string
          gst_number?: string | null
          id?: string
          owner_user_id: string
          state?: string | null
          status?: Database["public"]["Enums"]["operator_status"]
          suspended_at?: string | null
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          bank_account_last4?: string | null
          bank_account_name?: string | null
          bank_ifsc?: string | null
          business_name?: string
          city?: string | null
          commission_percent?: number
          contact_email?: string | null
          contact_person?: string
          contact_phone?: string
          created_at?: string
          gst_number?: string | null
          id?: string
          owner_user_id?: string
          state?: string | null
          status?: Database["public"]["Enums"]["operator_status"]
          suspended_at?: string | null
          updated_at?: string
          verification_notes?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      bus_passengers: {
        Row: {
          age: number | null
          boarding_status: Database["public"]["Enums"]["boarding_status"]
          booking_id: string
          created_at: string
          fare: number
          full_name: string
          gender: string | null
          id: string
          is_lead: boolean
          operator_id: string
          schedule_id: string
          seat_code: string
          updated_at: string
        }
        Insert: {
          age?: number | null
          boarding_status?: Database["public"]["Enums"]["boarding_status"]
          booking_id: string
          created_at?: string
          fare?: number
          full_name: string
          gender?: string | null
          id?: string
          is_lead?: boolean
          operator_id: string
          schedule_id: string
          seat_code: string
          updated_at?: string
        }
        Update: {
          age?: number | null
          boarding_status?: Database["public"]["Enums"]["boarding_status"]
          booking_id?: string
          created_at?: string
          fare?: number
          full_name?: string
          gender?: string | null
          id?: string
          is_lead?: boolean
          operator_id?: string
          schedule_id?: string
          seat_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_passengers_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bus_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_passengers_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_passengers_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "bus_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_route_stops: {
        Row: {
          created_at: string
          drop_enabled: boolean
          id: string
          is_active: boolean
          minutes_from_start: number
          pickup_enabled: boolean
          route_id: string
          sequence: number
          stop_id: string
        }
        Insert: {
          created_at?: string
          drop_enabled?: boolean
          id?: string
          is_active?: boolean
          minutes_from_start?: number
          pickup_enabled?: boolean
          route_id: string
          sequence: number
          stop_id: string
        }
        Update: {
          created_at?: string
          drop_enabled?: boolean
          id?: string
          is_active?: boolean
          minutes_from_start?: number
          pickup_enabled?: boolean
          route_id?: string
          sequence?: number
          stop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_route_stops_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_route_stops_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "bus_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_routes: {
        Row: {
          base_fare: number
          created_at: string
          destination_city: string
          distance_km: number | null
          estimated_duration_minutes: number | null
          id: string
          name: string
          operator_id: string
          origin_city: string
          status: Database["public"]["Enums"]["bus_route_status"]
          updated_at: string
        }
        Insert: {
          base_fare?: number
          created_at?: string
          destination_city: string
          distance_km?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          name: string
          operator_id: string
          origin_city: string
          status?: Database["public"]["Enums"]["bus_route_status"]
          updated_at?: string
        }
        Update: {
          base_fare?: number
          created_at?: string
          destination_city?: string
          distance_km?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          name?: string
          operator_id?: string
          origin_city?: string
          status?: Database["public"]["Enums"]["bus_route_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_routes_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_schedule_seats: {
        Row: {
          block_reason: string | null
          booking_id: string | null
          column_index: number
          created_at: string
          deck: number
          fare: number
          hold_expires_at: string | null
          hold_id: string | null
          id: string
          row_index: number
          schedule_id: string
          seat_code: string
          seat_id: string
          seat_type: Database["public"]["Enums"]["bus_seat_type"]
          state: Database["public"]["Enums"]["bus_seat_state"]
          updated_at: string
        }
        Insert: {
          block_reason?: string | null
          booking_id?: string | null
          column_index: number
          created_at?: string
          deck?: number
          fare: number
          hold_expires_at?: string | null
          hold_id?: string | null
          id?: string
          row_index: number
          schedule_id: string
          seat_code: string
          seat_id: string
          seat_type: Database["public"]["Enums"]["bus_seat_type"]
          state?: Database["public"]["Enums"]["bus_seat_state"]
          updated_at?: string
        }
        Update: {
          block_reason?: string | null
          booking_id?: string | null
          column_index?: number
          created_at?: string
          deck?: number
          fare?: number
          hold_expires_at?: string | null
          hold_id?: string | null
          id?: string
          row_index?: number
          schedule_id?: string
          seat_code?: string
          seat_id?: string
          seat_type?: Database["public"]["Enums"]["bus_seat_type"]
          state?: Database["public"]["Enums"]["bus_seat_state"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_schedule_seats_booking_fk"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bus_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_schedule_seats_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "bus_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_schedule_seats_seat_id_fkey"
            columns: ["seat_id"]
            isOneToOne: false
            referencedRelation: "bus_seats"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_schedule_stops: {
        Row: {
          address: string | null
          city: string
          drop_enabled: boolean
          id: string
          latitude: number
          longitude: number
          pickup_enabled: boolean
          schedule_id: string
          scheduled_at: string
          sequence: number
          stop_id: string
          stop_name: string
        }
        Insert: {
          address?: string | null
          city: string
          drop_enabled?: boolean
          id?: string
          latitude: number
          longitude: number
          pickup_enabled?: boolean
          schedule_id: string
          scheduled_at: string
          sequence: number
          stop_id: string
          stop_name: string
        }
        Update: {
          address?: string | null
          city?: string
          drop_enabled?: boolean
          id?: string
          latitude?: number
          longitude?: number
          pickup_enabled?: boolean
          schedule_id?: string
          scheduled_at?: string
          sequence?: number
          stop_id?: string
          stop_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_schedule_stops_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "bus_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_schedule_stops_stop_id_fkey"
            columns: ["stop_id"]
            isOneToOne: false
            referencedRelation: "bus_stops"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_schedules: {
        Row: {
          arrival_estimate_at: string
          base_fare: number
          booking_closes_at: string
          bus_id: string
          cancellation_policy: string | null
          cancelled_reason: string | null
          created_at: string
          currency: string
          departure_at: string
          driver_id: string | null
          id: string
          operator_id: string
          published_at: string | null
          route_id: string
          service_date: string
          status: Database["public"]["Enums"]["bus_schedule_status"]
          total_seats: number
          updated_at: string
        }
        Insert: {
          arrival_estimate_at: string
          base_fare: number
          booking_closes_at: string
          bus_id: string
          cancellation_policy?: string | null
          cancelled_reason?: string | null
          created_at?: string
          currency?: string
          departure_at: string
          driver_id?: string | null
          id?: string
          operator_id: string
          published_at?: string | null
          route_id: string
          service_date: string
          status?: Database["public"]["Enums"]["bus_schedule_status"]
          total_seats?: number
          updated_at?: string
        }
        Update: {
          arrival_estimate_at?: string
          base_fare?: number
          booking_closes_at?: string
          bus_id?: string
          cancellation_policy?: string | null
          cancelled_reason?: string | null
          created_at?: string
          currency?: string
          departure_at?: string
          driver_id?: string | null
          id?: string
          operator_id?: string
          published_at?: string | null
          route_id?: string
          service_date?: string
          status?: Database["public"]["Enums"]["bus_schedule_status"]
          total_seats?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_schedules_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "bus_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_schedules_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_schedules_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "bus_routes"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_seats: {
        Row: {
          bus_id: string
          column_index: number
          created_at: string
          deck: number
          fare_multiplier: number
          id: string
          is_active: boolean
          row_index: number
          seat_code: string
          seat_type: Database["public"]["Enums"]["bus_seat_type"]
        }
        Insert: {
          bus_id: string
          column_index: number
          created_at?: string
          deck?: number
          fare_multiplier?: number
          id?: string
          is_active?: boolean
          row_index: number
          seat_code: string
          seat_type?: Database["public"]["Enums"]["bus_seat_type"]
        }
        Update: {
          bus_id?: string
          column_index?: number
          created_at?: string
          deck?: number
          fare_multiplier?: number
          id?: string
          is_active?: boolean
          row_index?: number
          seat_code?: string
          seat_type?: Database["public"]["Enums"]["bus_seat_type"]
        }
        Relationships: [
          {
            foreignKeyName: "bus_seats_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_settlements: {
        Row: {
          commission_amount: number
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          operator_id: string
          other_adjustment: number
          paid_at: string | null
          period_end: string
          period_start: string
          reference: string | null
          refund_adjustment: number
          status: Database["public"]["Enums"]["settlement_status"]
          updated_at: string
        }
        Insert: {
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          operator_id: string
          other_adjustment?: number
          paid_at?: string | null
          period_end: string
          period_start: string
          reference?: string | null
          refund_adjustment?: number
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          operator_id?: string
          other_adjustment?: number
          paid_at?: string | null
          period_end?: string
          period_start?: string
          reference?: string | null
          refund_adjustment?: number
          status?: Database["public"]["Enums"]["settlement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_settlements_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_stops: {
        Row: {
          address: string | null
          city: string
          created_at: string
          id: string
          is_active: boolean
          latitude: number
          longitude: number
          name: string
          operator_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude: number
          longitude: number
          name: string
          operator_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number
          longitude?: number
          name?: string
          operator_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_stops_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          amenities: string[]
          assigned_driver_id: string | null
          bus_type: string
          created_at: string
          id: string
          is_ac: boolean
          manufacturer_model: string | null
          name: string
          notes: string | null
          operator_id: string
          registration_number: string
          seating_capacity: number
          status: Database["public"]["Enums"]["bus_status"]
          updated_at: string
          vehicle_category: string | null
        }
        Insert: {
          amenities?: string[]
          assigned_driver_id?: string | null
          bus_type: string
          created_at?: string
          id?: string
          is_ac?: boolean
          manufacturer_model?: string | null
          name: string
          notes?: string | null
          operator_id: string
          registration_number: string
          seating_capacity: number
          status?: Database["public"]["Enums"]["bus_status"]
          updated_at?: string
          vehicle_category?: string | null
        }
        Update: {
          amenities?: string[]
          assigned_driver_id?: string | null
          bus_type?: string
          created_at?: string
          id?: string
          is_ac?: boolean
          manufacturer_model?: string | null
          name?: string
          notes?: string | null
          operator_id?: string
          registration_number?: string
          seating_capacity?: number
          status?: Database["public"]["Enums"]["bus_status"]
          updated_at?: string
          vehicle_category?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buses_assigned_driver_fk"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "bus_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buses_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
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
      operator_audit_logs: {
        Row: {
          action: string
          actor_role: Database["public"]["Enums"]["operator_role"] | null
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json
          object_id: string | null
          object_type: string
          operator_id: string
          result: string
        }
        Insert: {
          action: string
          actor_role?: Database["public"]["Enums"]["operator_role"] | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          object_id?: string | null
          object_type: string
          operator_id: string
          result?: string
        }
        Update: {
          action?: string
          actor_role?: Database["public"]["Enums"]["operator_role"] | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          object_id?: string | null
          object_type?: string
          operator_id?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_audit_logs_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_notifications: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          link_path: string | null
          operator_id: string
          read_at: string | null
          title: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          id?: string
          link_path?: string | null
          operator_id: string
          read_at?: string | null
          title: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          link_path?: string | null
          operator_id?: string
          read_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_notifications_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
        ]
      }
      operator_staff: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean
          operator_id: string
          role: Database["public"]["Enums"]["operator_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          operator_id: string
          role: Database["public"]["Enums"]["operator_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          operator_id?: string
          role?: Database["public"]["Enums"]["operator_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operator_staff_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
        ]
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
      support_ticket_messages: {
        Row: {
          author_type: string
          author_user_id: string | null
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_type: string
          author_user_id?: string | null
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_type?: string
          author_user_id?: string | null
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          booking_id: string | null
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          operator_id: string | null
          reference: string
          resolution: string | null
          schedule_id: string | null
          status: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          category: string
          created_at?: string
          created_by: string
          description: string
          id?: string
          operator_id?: string | null
          reference: string
          resolution?: string | null
          schedule_id?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          operator_id?: string | null
          reference?: string
          resolution?: string | null
          schedule_id?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bus_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_operator_id_fkey"
            columns: ["operator_id"]
            isOneToOne: false
            referencedRelation: "bus_operators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "bus_schedules"
            referencedColumns: ["id"]
          },
        ]
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
      hold_bus_seats: {
        Args: {
          _hold_id: string
          _schedule_id: string
          _seat_codes: string[]
          _ttl_seconds: number
        }
        Returns: number
      }
      is_operator_member: {
        Args: { _operator_id: string; _user_id: string }
        Returns: boolean
      }
      operator_role_of: {
        Args: { _operator_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["operator_role"]
      }
      release_expired_bus_holds: { Args: never; Returns: number }
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
      boarding_status: "NOT_BOARDED" | "BOARDED" | "NO_SHOW" | "CANCELLED"
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
      bus_booking_status:
        | "DRAFT"
        | "SEAT_HELD"
        | "PAYMENT_PENDING"
        | "CONFIRMED"
        | "CANCEL_REQUESTED"
        | "CANCELLED"
        | "REFUND_PENDING"
        | "REFUNDED"
        | "PARTIALLY_REFUNDED"
        | "COMPLETED"
        | "NO_SHOW"
        | "EXPIRED"
      bus_driver_status: "PENDING" | "ACTIVE" | "INACTIVE" | "SUSPENDED"
      bus_payment_status:
        | "PENDING"
        | "PAID"
        | "FAILED"
        | "REFUNDED"
        | "PARTIALLY_REFUNDED"
      bus_route_status: "DRAFT" | "ACTIVE" | "INACTIVE"
      bus_schedule_status:
        | "DRAFT"
        | "SCHEDULED"
        | "BOARDING"
        | "DEPARTED"
        | "COMPLETED"
        | "CANCELLED"
        | "SUSPENDED"
      bus_seat_state:
        | "AVAILABLE"
        | "HELD"
        | "BOOKED"
        | "BLOCKED"
        | "UNAVAILABLE"
      bus_seat_type: "SEATER" | "SLEEPER_LOWER" | "SLEEPER_UPPER"
      bus_status:
        | "ACTIVE"
        | "INACTIVE"
        | "MAINTENANCE"
        | "SUSPENDED"
        | "ARCHIVED"
      discount_status: "DRAFT" | "ACTIVE" | "EXPIRED" | "DISABLED"
      document_status: "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED"
      driver_account_status: "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED"
      driver_availability_status: "OFFLINE" | "ONLINE" | "BUSY"
      operator_role: "OWNER" | "MANAGER" | "BOOKING_STAFF" | "ACCOUNTANT"
      operator_status: "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED"
      place_label: "HOME" | "WORK" | "OTHER"
      ride_actor_type: "CUSTOMER" | "DRIVER" | "SYSTEM"
      ride_request_status:
        | "PENDING"
        | "ACCEPTED"
        | "REJECTED"
        | "EXPIRED"
        | "SUPERSEDED"
      service_type: "BIKE" | "AUTO" | "CAB"
      settlement_status:
        | "PENDING"
        | "PROCESSING"
        | "PAID"
        | "FAILED"
        | "ON_HOLD"
      support_ticket_status:
        | "OPEN"
        | "IN_PROGRESS"
        | "WAITING"
        | "RESOLVED"
        | "CLOSED"
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
      boarding_status: ["NOT_BOARDED", "BOARDED", "NO_SHOW", "CANCELLED"],
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
      bus_booking_status: [
        "DRAFT",
        "SEAT_HELD",
        "PAYMENT_PENDING",
        "CONFIRMED",
        "CANCEL_REQUESTED",
        "CANCELLED",
        "REFUND_PENDING",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
        "COMPLETED",
        "NO_SHOW",
        "EXPIRED",
      ],
      bus_driver_status: ["PENDING", "ACTIVE", "INACTIVE", "SUSPENDED"],
      bus_payment_status: [
        "PENDING",
        "PAID",
        "FAILED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
      ],
      bus_route_status: ["DRAFT", "ACTIVE", "INACTIVE"],
      bus_schedule_status: [
        "DRAFT",
        "SCHEDULED",
        "BOARDING",
        "DEPARTED",
        "COMPLETED",
        "CANCELLED",
        "SUSPENDED",
      ],
      bus_seat_state: ["AVAILABLE", "HELD", "BOOKED", "BLOCKED", "UNAVAILABLE"],
      bus_seat_type: ["SEATER", "SLEEPER_LOWER", "SLEEPER_UPPER"],
      bus_status: [
        "ACTIVE",
        "INACTIVE",
        "MAINTENANCE",
        "SUSPENDED",
        "ARCHIVED",
      ],
      discount_status: ["DRAFT", "ACTIVE", "EXPIRED", "DISABLED"],
      document_status: ["PENDING", "VERIFIED", "REJECTED", "EXPIRED"],
      driver_account_status: ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"],
      driver_availability_status: ["OFFLINE", "ONLINE", "BUSY"],
      operator_role: ["OWNER", "MANAGER", "BOOKING_STAFF", "ACCOUNTANT"],
      operator_status: ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"],
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
      settlement_status: ["PENDING", "PROCESSING", "PAID", "FAILED", "ON_HOLD"],
      support_ticket_status: [
        "OPEN",
        "IN_PROGRESS",
        "WAITING",
        "RESOLVED",
        "CLOSED",
      ],
    },
  },
} as const
