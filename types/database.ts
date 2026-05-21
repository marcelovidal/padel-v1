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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      club_aliases: {
        Row: {
          alias_name: string
          alias_normalized: string
          alias_text: string
          city_id: string | null
          city_id_key: string | null
          club_id: string
          country_code: string
          created_at: string
          created_by: string | null
          id: string
          region_code: string | null
          region_code_key: string | null
        }
        Insert: {
          alias_name: string
          alias_normalized: string
          alias_text: string
          city_id?: string | null
          city_id_key?: string | null
          club_id: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          region_code?: string | null
          region_code_key?: string | null
        }
        Update: {
          alias_name?: string
          alias_normalized?: string
          alias_text?: string
          city_id?: string | null
          city_id_key?: string | null
          club_id?: string
          country_code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          region_code?: string | null
          region_code_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_aliases_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_booking_settings: {
        Row: {
          buffer_minutes: number
          club_id: string
          created_at: string
          opening_hours: Json
          slot_duration_minutes: number
          timezone: string
          updated_at: string
        }
        Insert: {
          buffer_minutes?: number
          club_id: string
          created_at?: string
          opening_hours?: Json
          slot_duration_minutes?: number
          timezone?: string
          updated_at?: string
        }
        Update: {
          buffer_minutes?: number
          club_id?: string
          created_at?: string
          opening_hours?: Json
          slot_duration_minutes?: number
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_booking_settings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: true
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_claim_log: {
        Row: {
          claimed_at: string
          claimed_by: string
          club_id: string
          id: string
          method: string
          note: string | null
        }
        Insert: {
          claimed_at?: string
          claimed_by: string
          club_id: string
          id?: string
          method: string
          note?: string | null
        }
        Update: {
          claimed_at?: string
          claimed_by?: string
          club_id?: string
          id?: string
          method?: string
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_claim_log_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_claim_requests: {
        Row: {
          club_id: string
          contact_phone: string | null
          created_at: string
          id: string
          message: string | null
          requested_by: string
          requester_email: string
          requester_first_name: string
          requester_last_name: string
          requester_phone: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          club_id: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          message?: string | null
          requested_by: string
          requester_email: string
          requester_first_name: string
          requester_last_name: string
          requester_phone: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          club_id?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          message?: string | null
          requested_by?: string
          requester_email?: string
          requester_first_name?: string
          requester_last_name?: string
          requester_phone?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_claim_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_courts: {
        Row: {
          active: boolean
          closing_time: string
          club_id: string
          created_at: string
          id: string
          is_indoor: boolean
          name: string
          opening_time: string
          slot_interval_minutes: number | null
          surface_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          closing_time?: string
          club_id: string
          created_at?: string
          id?: string
          is_indoor?: boolean
          name: string
          opening_time?: string
          slot_interval_minutes?: number | null
          surface_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          closing_time?: string
          club_id?: string
          created_at?: string
          id?: string
          is_indoor?: boolean
          name?: string
          opening_time?: string
          slot_interval_minutes?: number | null
          surface_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_courts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_leads: {
        Row: {
          city: string | null
          city_id: string | null
          country_code: string
          created_at: string
          id: string
          match_id: string | null
          normalized_name: string
          notes: string | null
          region_code: string | null
          region_name: string | null
          resolved_at: string | null
          resolved_by: string | null
          source: string
          status: string
          suggested_by: string
          suggested_name: string
        }
        Insert: {
          city?: string | null
          city_id?: string | null
          country_code?: string
          created_at?: string
          id?: string
          match_id?: string | null
          normalized_name: string
          notes?: string | null
          region_code?: string | null
          region_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          status?: string
          suggested_by: string
          suggested_name: string
        }
        Update: {
          city?: string | null
          city_id?: string | null
          country_code?: string
          created_at?: string
          id?: string
          match_id?: string | null
          normalized_name?: string
          notes?: string | null
          region_code?: string | null
          region_name?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          source?: string
          status?: string
          suggested_by?: string
          suggested_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_leads_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      club_leagues: {
        Row: {
          club_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          season_label: string | null
          start_date: string | null
          status: string
          target_city_ids: string[]
          updated_at: string
        }
        Insert: {
          club_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          season_label?: string | null
          start_date?: string | null
          status?: string
          target_city_ids?: string[]
          updated_at?: string
        }
        Update: {
          club_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          season_label?: string | null
          start_date?: string | null
          status?: string
          target_city_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_leagues_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_merge_log: {
        Row: {
          affected_matches_count: number
          id: string
          merged_at: string
          merged_by: string
          note: string | null
          source_club_id: string
          target_club_id: string
        }
        Insert: {
          affected_matches_count?: number
          id?: string
          merged_at?: string
          merged_by: string
          note?: string | null
          source_club_id: string
          target_club_id: string
        }
        Update: {
          affected_matches_count?: number
          id?: string
          merged_at?: string
          merged_by?: string
          note?: string | null
          source_club_id?: string
          target_club_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_merge_log_source_club_id_fkey"
            columns: ["source_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_merge_log_target_club_id_fkey"
            columns: ["target_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_owner_requests: {
        Row: {
          club_id: string | null
          club_name_requested: string | null
          id: string
          notes: string | null
          player_id: string | null
          requested_at: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          club_id?: string | null
          club_name_requested?: string | null
          id?: string
          notes?: string | null
          player_id?: string | null
          requested_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          club_id?: string | null
          club_name_requested?: string | null
          id?: string
          notes?: string | null
          player_id?: string | null
          requested_at?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_owner_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_owner_requests_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      club_tournaments: {
        Row: {
          allow_lower_category: boolean
          club_id: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          season_label: string | null
          start_date: string | null
          status: string
          target_category_int: number
          target_city_ids: string[]
          updated_at: string
        }
        Insert: {
          allow_lower_category?: boolean
          club_id: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          season_label?: string | null
          start_date?: string | null
          status?: string
          target_category_int: number
          target_city_ids?: string[]
          updated_at?: string
        }
        Update: {
          allow_lower_category?: boolean
          club_id?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          season_label?: string | null
          start_date?: string | null
          status?: string
          target_category_int?: number
          target_city_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_tournaments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          access_type: string | null
          address: string | null
          archived_at: string | null
          avatar_url: string | null
          city: string | null
          city_id: string | null
          city_normalized: string | null
          claim_status: string
          claimed: boolean
          claimed_at: string | null
          claimed_by: string | null
          contact_first_name: string | null
          contact_last_name: string | null
          contact_phone: string | null
          country_code: string
          courts_count: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          display_name: string
          has_glass: boolean
          has_synthetic_grass: boolean
          id: string
          merged_into: string | null
          merged_into_club_id: string | null
          name: string
          normalized_name: string
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          owner_player_id: string | null
          region_code: string | null
          region_name: string | null
          responsible_email: string | null
          responsible_first_name: string | null
          responsible_last_name: string | null
          responsible_phone: string | null
          surface_types: Json
          updated_at: string
        }
        Insert: {
          access_type?: string | null
          address?: string | null
          archived_at?: string | null
          avatar_url?: string | null
          city?: string | null
          city_id?: string | null
          city_normalized?: string | null
          claim_status?: string
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_phone?: string | null
          country_code?: string
          courts_count?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_name: string
          has_glass?: boolean
          has_synthetic_grass?: boolean
          id?: string
          merged_into?: string | null
          merged_into_club_id?: string | null
          name: string
          normalized_name: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          owner_player_id?: string | null
          region_code?: string | null
          region_name?: string | null
          responsible_email?: string | null
          responsible_first_name?: string | null
          responsible_last_name?: string | null
          responsible_phone?: string | null
          surface_types?: Json
          updated_at?: string
        }
        Update: {
          access_type?: string | null
          address?: string | null
          archived_at?: string | null
          avatar_url?: string | null
          city?: string | null
          city_id?: string | null
          city_normalized?: string | null
          claim_status?: string
          claimed?: boolean
          claimed_at?: string | null
          claimed_by?: string | null
          contact_first_name?: string | null
          contact_last_name?: string | null
          contact_phone?: string | null
          country_code?: string
          courts_count?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          display_name?: string
          has_glass?: boolean
          has_synthetic_grass?: boolean
          id?: string
          merged_into?: string | null
          merged_into_club_id?: string | null
          name?: string
          normalized_name?: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          owner_player_id?: string | null
          region_code?: string | null
          region_name?: string | null
          responsible_email?: string | null
          responsible_first_name?: string | null
          responsible_last_name?: string | null
          responsible_phone?: string | null
          surface_types?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clubs_merged_into_club_id_fkey"
            columns: ["merged_into_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clubs_owner_player_id_fkey"
            columns: ["owner_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_availability: {
        Row: {
          activo: boolean
          club_id: string
          coach_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          slot_duration_minutes: number
          start_time: string
        }
        Insert: {
          activo?: boolean
          club_id: string
          coach_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          slot_duration_minutes?: number
          start_time: string
        }
        Update: {
          activo?: boolean
          club_id?: string
          coach_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          slot_duration_minutes?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_availability_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_availability_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_bookings: {
        Row: {
          club_id: string
          coach_id: string
          court_id: string | null
          created_at: string
          duration_minutes: number
          id: string
          notes_coach: string | null
          notes_player: string | null
          player_id: string
          scheduled_at: string
          status: string
          tarifa_aplicada: number | null
        }
        Insert: {
          club_id: string
          coach_id: string
          court_id?: string | null
          created_at?: string
          duration_minutes: number
          id?: string
          notes_coach?: string | null
          notes_player?: string | null
          player_id: string
          scheduled_at: string
          status?: string
          tarifa_aplicada?: number | null
        }
        Update: {
          club_id?: string
          coach_id?: string
          court_id?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          notes_coach?: string | null
          notes_player?: string | null
          player_id?: string
          scheduled_at?: string
          status?: string
          tarifa_aplicada?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_bookings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_bookings_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "club_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_bookings_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_players: {
        Row: {
          accepted_at: string | null
          coach_id: string
          id: string
          invited_at: string
          player_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          coach_id: string
          id?: string
          invited_at?: string
          player_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          coach_id?: string
          id?: string
          invited_at?: string
          player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_players_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_profiles: {
        Row: {
          activo: boolean
          additional_club_ids: string[] | null
          bio: string | null
          created_at: string
          especialidad: string | null
          id: string
          player_id: string
          primary_club_id: string | null
          tarifa_por_hora: number | null
          tarifa_publica: boolean
        }
        Insert: {
          activo?: boolean
          additional_club_ids?: string[] | null
          bio?: string | null
          created_at?: string
          especialidad?: string | null
          id?: string
          player_id: string
          primary_club_id?: string | null
          tarifa_por_hora?: number | null
          tarifa_publica?: boolean
        }
        Update: {
          activo?: boolean
          additional_club_ids?: string[] | null
          bio?: string | null
          created_at?: string
          especialidad?: string | null
          id?: string
          player_id?: string
          primary_club_id?: string | null
          tarifa_por_hora?: number | null
          tarifa_publica?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "coach_profiles_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: true
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_profiles_primary_club_id_fkey"
            columns: ["primary_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      court_bookings: {
        Row: {
          club_id: string
          court_id: string
          created_at: string
          end_at: string
          id: string
          match_id: string | null
          note: string | null
          rejection_reason: string | null
          requested_by_player_id: string | null
          requested_by_user_id: string | null
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          club_id: string
          court_id: string
          created_at?: string
          end_at: string
          id?: string
          match_id?: string | null
          note?: string | null
          rejection_reason?: string | null
          requested_by_player_id?: string | null
          requested_by_user_id?: string | null
          start_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          club_id?: string
          court_id?: string
          created_at?: string
          end_at?: string
          id?: string
          match_id?: string | null
          note?: string | null
          rejection_reason?: string | null
          requested_by_player_id?: string | null
          requested_by_user_id?: string | null
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_bookings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_bookings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "club_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_bookings_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_bookings_requested_by_player_id_fkey"
            columns: ["requested_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      court_fixed_slots: {
        Row: {
          club_id: string
          court_id: string
          created_at: string | null
          created_by: string | null
          day_of_week: number
          end_time: string
          id: string
          note: string | null
          player_id: string
          released_at: string | null
          released_by: string | null
          start_time: string
          status: string
          updated_at: string | null
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          club_id: string
          court_id: string
          created_at?: string | null
          created_by?: string | null
          day_of_week: number
          end_time: string
          id?: string
          note?: string | null
          player_id: string
          released_at?: string | null
          released_by?: string | null
          start_time: string
          status?: string
          updated_at?: string | null
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          club_id?: string
          court_id?: string
          created_at?: string | null
          created_by?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          note?: string | null
          player_id?: string
          released_at?: string | null
          released_by?: string | null
          start_time?: string
          status?: string
          updated_at?: string | null
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "court_fixed_slots_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_fixed_slots_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "club_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "court_fixed_slots_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      league_divisions: {
        Row: {
          allow_override: boolean
          category_mode: string
          category_value_int: number | null
          created_at: string
          id: string
          league_id: string
          name: string
          updated_at: string
        }
        Insert: {
          allow_override?: boolean
          category_mode: string
          category_value_int?: number | null
          created_at?: string
          id?: string
          league_id: string
          name: string
          updated_at?: string
        }
        Update: {
          allow_override?: boolean
          category_mode?: string
          category_value_int?: number | null
          created_at?: string
          id?: string
          league_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_divisions_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "club_leagues"
            referencedColumns: ["id"]
          },
        ]
      }
      league_group_teams: {
        Row: {
          created_at: string
          group_id: string
          seed_order: number | null
          team_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          seed_order?: number | null
          team_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          seed_order?: number | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_group_teams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "league_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_group_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "league_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      league_groups: {
        Row: {
          created_at: string
          division_id: string
          id: string
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          division_id: string
          id?: string
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          division_id?: string
          id?: string
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_groups_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "league_divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      league_matches: {
        Row: {
          court_id: string | null
          created_at: string
          group_id: string
          id: string
          match_id: string
          round_index: number
          scheduled_at: string | null
          team_a_id: string
          team_b_id: string
          updated_at: string
        }
        Insert: {
          court_id?: string | null
          created_at?: string
          group_id: string
          id?: string
          match_id: string
          round_index: number
          scheduled_at?: string | null
          team_a_id: string
          team_b_id: string
          updated_at?: string
        }
        Update: {
          court_id?: string | null
          created_at?: string
          group_id?: string
          id?: string
          match_id?: string
          round_index?: number
          scheduled_at?: string | null
          team_a_id?: string
          team_b_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "club_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "league_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "league_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "league_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      league_playoff_matches: {
        Row: {
          court_id: string | null
          created_at: string
          division_id: string
          id: string
          match_id: string
          match_order: number
          scheduled_at: string | null
          source_match_a_id: string | null
          source_match_b_id: string | null
          stage: string
          stage_order: number
          team_a_id: string | null
          team_b_id: string | null
          updated_at: string
          winner_team_id: string | null
        }
        Insert: {
          court_id?: string | null
          created_at?: string
          division_id: string
          id?: string
          match_id: string
          match_order: number
          scheduled_at?: string | null
          source_match_a_id?: string | null
          source_match_b_id?: string | null
          stage: string
          stage_order: number
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string
          winner_team_id?: string | null
        }
        Update: {
          court_id?: string | null
          created_at?: string
          division_id?: string
          id?: string
          match_id?: string
          match_order?: number
          scheduled_at?: string | null
          source_match_a_id?: string | null
          source_match_b_id?: string | null
          stage?: string
          stage_order?: number
          team_a_id?: string | null
          team_b_id?: string | null
          updated_at?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_playoff_matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "club_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_playoff_matches_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "league_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_playoff_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_playoff_matches_source_match_a_id_fkey"
            columns: ["source_match_a_id"]
            isOneToOne: false
            referencedRelation: "league_playoff_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_playoff_matches_source_match_b_id_fkey"
            columns: ["source_match_b_id"]
            isOneToOne: false
            referencedRelation: "league_playoff_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_playoff_matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "league_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_playoff_matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "league_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_playoff_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "league_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      league_registrations: {
        Row: {
          id: string
          league_id: string
          player_id: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          teammate_player_id: string | null
        }
        Insert: {
          id?: string
          league_id: string
          player_id: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          teammate_player_id?: string | null
        }
        Update: {
          id?: string
          league_id?: string
          player_id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          teammate_player_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "league_registrations_league_id_fkey"
            columns: ["league_id"]
            isOneToOne: false
            referencedRelation: "club_leagues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_registrations_teammate_player_id_fkey"
            columns: ["teammate_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      league_teams: {
        Row: {
          created_at: string
          division_id: string
          entry_category_int: number | null
          id: string
          player_id_a: string
          player_id_b: string
          seed_strength: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          division_id: string
          entry_category_int?: number | null
          id?: string
          player_id_a: string
          player_id_b: string
          seed_strength?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          division_id?: string
          entry_category_int?: number | null
          id?: string
          player_id_a?: string
          player_id_b?: string
          seed_strength?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "league_teams_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "league_divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_teams_player_id_a_fkey"
            columns: ["player_id_a"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "league_teams_player_id_b_fkey"
            columns: ["player_id_b"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_club_anchoring_events: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          match_id: string
          source: string
          user_id: string | null
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          match_id: string
          source: string
          user_id?: string | null
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          match_id?: string
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "match_club_anchoring_events_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_club_anchoring_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_club_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          id: string
          match_id: string
          new_club_id: string | null
          new_club_name_raw: string | null
          old_club_id: string | null
          old_club_name_raw: string | null
          source: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          match_id: string
          new_club_id?: string | null
          new_club_name_raw?: string | null
          old_club_id?: string | null
          old_club_name_raw?: string | null
          source: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          id?: string
          match_id?: string
          new_club_id?: string | null
          new_club_name_raw?: string | null
          old_club_id?: string | null
          old_club_name_raw?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_club_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_club_events_new_club_id_fkey"
            columns: ["new_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_club_events_old_club_id_fkey"
            columns: ["old_club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          created_at: string
          id: string
          match_id: string
          player_id: string
          team: Database["public"]["Enums"]["team_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          player_id: string
          team: Database["public"]["Enums"]["team_type"]
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          player_id?: string
          team?: Database["public"]["Enums"]["team_type"]
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results: {
        Row: {
          created_at: string
          id: string
          match_id: string
          recorded_at: string
          sets: Json
          updated_at: string
          winner_team: Database["public"]["Enums"]["team_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          recorded_at?: string
          sets: Json
          updated_at?: string
          winner_team: Database["public"]["Enums"]["team_type"]
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          recorded_at?: string
          sets?: Json
          updated_at?: string
          winner_team?: Database["public"]["Enums"]["team_type"]
        }
        Relationships: [
          {
            foreignKeyName: "match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          club_id: string | null
          club_name: string
          club_name_raw: string | null
          created_at: string
          created_by: string
          id: string
          match_at: string
          match_source: string
          max_players: number
          notes: string | null
          status: Database["public"]["Enums"]["match_status"]
          updated_at: string
        }
        Insert: {
          club_id?: string | null
          club_name: string
          club_name_raw?: string | null
          created_at?: string
          created_by?: string
          id?: string
          match_at: string
          match_source?: string
          max_players?: number
          notes?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Update: {
          club_id?: string | null
          club_name?: string
          club_name_raw?: string | null
          created_at?: string
          created_by?: string
          id?: string
          match_at?: string
          match_source?: string
          max_players?: number
          notes?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          club_id: string | null
          created_at: string
          dedupe_key: string | null
          entity_id: string | null
          id: string
          payload: Json
          priority: number
          read_at: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          id?: string
          payload?: Json
          priority?: number
          read_at?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          club_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          entity_id?: string | null
          id?: string
          payload?: Json
          priority?: number
          read_at?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      player_badges: {
        Row: {
          badge_key: string
          id: string
          player_id: string
          unlocked_at: string
        }
        Insert: {
          badge_key: string
          id?: string
          player_id: string
          unlocked_at?: string
        }
        Update: {
          badge_key?: string
          id?: string
          player_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_badges_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_challenges: {
        Row: {
          coach_id: string
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          player_id: string
          status: string
          target_metric: string | null
          target_value: number | null
          title: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          player_id: string
          status?: string
          target_metric?: string | null
          target_value?: number | null
          title: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          player_id?: string
          status?: string
          target_metric?: string | null
          target_value?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_challenges_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_challenges_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_club_stats: {
        Row: {
          club_id: string
          last_match_at: string | null
          losses: number
          matches_played: number
          player_id: string
          points: number
          sets_lost: number
          sets_won: number
          updated_at: string
          wins: number
        }
        Insert: {
          club_id: string
          last_match_at?: string | null
          losses?: number
          matches_played?: number
          player_id: string
          points?: number
          sets_lost?: number
          sets_won?: number
          updated_at?: string
          wins?: number
        }
        Update: {
          club_id?: string
          last_match_at?: string | null
          losses?: number
          matches_played?: number
          player_id?: string
          points?: number
          sets_lost?: number
          sets_won?: number
          updated_at?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "player_club_stats_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_club_stats_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_coach_notes: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          note: string
          note_type: string
          player_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          note: string
          note_type?: string
          player_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          note?: string
          note_type?: string
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_coach_notes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_coach_notes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_index_history: {
        Row: {
          id: string
          pasala_index: number
          player_id: string
          recorded_at: string
        }
        Insert: {
          id?: string
          pasala_index: number
          player_id: string
          recorded_at?: string
        }
        Update: {
          id?: string
          pasala_index?: number
          player_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_index_history_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      player_match_assessments: {
        Row: {
          bajada_pared: number | null
          bandeja: number | null
          comments: string | null
          created_at: string
          globo: number | null
          id: string
          immutable: boolean
          match_id: string
          player_id: string
          recepcion_saque: number | null
          remate: number | null
          saque: number | null
          submitted_by: string | null
          vibora: number | null
          volea: number | null
        }
        Insert: {
          bajada_pared?: number | null
          bandeja?: number | null
          comments?: string | null
          created_at?: string
          globo?: number | null
          id?: string
          immutable?: boolean
          match_id: string
          player_id: string
          recepcion_saque?: number | null
          remate?: number | null
          saque?: number | null
          submitted_by?: string | null
          vibora?: number | null
          volea?: number | null
        }
        Update: {
          bajada_pared?: number | null
          bandeja?: number | null
          comments?: string | null
          created_at?: string
          globo?: number | null
          id?: string
          immutable?: boolean
          match_id?: string
          player_id?: string
          recepcion_saque?: number | null
          remate?: number | null
          saque?: number | null
          submitted_by?: string | null
          vibora?: number | null
          volea?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "player_match_assessments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_assessments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_match_assessments_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_url: string | null
          birth_year: number | null
          category: string
          city: string | null
          city_id: string | null
          city_normalized: string | null
          club_owner_enabled_at: string | null
          coach_enabled_at: string | null
          country_code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_name: string
          email: string | null
          first_name: string
          id: string
          is_club_owner: boolean | null
          is_coach: boolean
          is_guest: boolean
          last_name: string
          normalized_name: string
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          onboarding_version: number
          pasala_index: number | null
          pasala_index_updated_at: string | null
          phone: string | null
          position: Database["public"]["Enums"]["player_position"]
          region_code: string | null
          region_name: string | null
          status: Database["public"]["Enums"]["player_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_year?: number | null
          category?: string
          city?: string | null
          city_id?: string | null
          city_normalized?: string | null
          club_owner_enabled_at?: string | null
          coach_enabled_at?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_name: string
          email?: string | null
          first_name: string
          id?: string
          is_club_owner?: boolean | null
          is_coach?: boolean
          is_guest?: boolean
          last_name: string
          normalized_name: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_version?: number
          pasala_index?: number | null
          pasala_index_updated_at?: string | null
          phone?: string | null
          position?: Database["public"]["Enums"]["player_position"]
          region_code?: string | null
          region_name?: string | null
          status?: Database["public"]["Enums"]["player_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_year?: number | null
          category?: string
          city?: string | null
          city_id?: string | null
          city_normalized?: string | null
          club_owner_enabled_at?: string | null
          coach_enabled_at?: string | null
          country_code?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          display_name?: string
          email?: string | null
          first_name?: string
          id?: string
          is_club_owner?: boolean | null
          is_coach?: boolean
          is_guest?: boolean
          last_name?: string
          normalized_name?: string
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_version?: number
          pasala_index?: number | null
          pasala_index_updated_at?: string | null
          phone?: string | null
          position?: Database["public"]["Enums"]["player_position"]
          region_code?: string | null
          region_name?: string | null
          status?: Database["public"]["Enums"]["player_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      share_events: {
        Row: {
          channel: string
          context: string
          created_at: string
          id: string
          match_id: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          context?: string
          created_at?: string
          id?: string
          match_id?: string | null
          user_id: string
        }
        Update: {
          channel?: string
          context?: string
          created_at?: string
          id?: string
          match_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_events_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_group_teams: {
        Row: {
          created_at: string
          group_id: string
          seed_order: number | null
          team_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          seed_order?: number | null
          team_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          seed_order?: number | null
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_group_teams_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_group_teams_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: true
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          sort_order: number
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_groups_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "club_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          court_id: string | null
          created_at: string
          group_id: string
          id: string
          match_id: string
          round_index: number
          scheduled_at: string | null
          team_a_id: string
          team_b_id: string
          updated_at: string
        }
        Insert: {
          court_id?: string | null
          created_at?: string
          group_id: string
          id?: string
          match_id: string
          round_index: number
          scheduled_at?: string | null
          team_a_id: string
          team_b_id: string
          updated_at?: string
        }
        Update: {
          court_id?: string | null
          created_at?: string
          group_id?: string
          id?: string
          match_id?: string
          round_index?: number
          scheduled_at?: string | null
          team_a_id?: string
          team_b_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "club_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "tournament_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_playoff_matches: {
        Row: {
          court_id: string | null
          created_at: string
          id: string
          match_id: string
          match_order: number
          scheduled_at: string | null
          source_match_a_id: string | null
          source_match_b_id: string | null
          stage: string
          stage_order: number
          team_a_id: string | null
          team_b_id: string | null
          tournament_id: string
          updated_at: string
          winner_team_id: string | null
        }
        Insert: {
          court_id?: string | null
          created_at?: string
          id?: string
          match_id: string
          match_order: number
          scheduled_at?: string | null
          source_match_a_id?: string | null
          source_match_b_id?: string | null
          stage: string
          stage_order: number
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Update: {
          court_id?: string | null
          created_at?: string
          id?: string
          match_id?: string
          match_order?: number
          scheduled_at?: string | null
          source_match_a_id?: string | null
          source_match_b_id?: string | null
          stage?: string
          stage_order?: number
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id?: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_playoff_matches_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "club_courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_playoff_matches_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_playoff_matches_source_match_a_id_fkey"
            columns: ["source_match_a_id"]
            isOneToOne: false
            referencedRelation: "tournament_playoff_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_playoff_matches_source_match_b_id_fkey"
            columns: ["source_match_b_id"]
            isOneToOne: false
            referencedRelation: "tournament_playoff_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_playoff_matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_playoff_matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_playoff_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "club_tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_playoff_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_registrations: {
        Row: {
          id: string
          player_id: string
          requested_at: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          teammate_player_id: string | null
          tournament_id: string
        }
        Insert: {
          id?: string
          player_id: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          teammate_player_id?: string | null
          tournament_id: string
        }
        Update: {
          id?: string
          player_id?: string
          requested_at?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          teammate_player_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_teammate_player_id_fkey"
            columns: ["teammate_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "club_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          created_at: string
          entry_category_int: number | null
          id: string
          player_id_a: string
          player_id_b: string
          tournament_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entry_category_int?: number | null
          id?: string
          player_id_a: string
          player_id_b: string
          tournament_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entry_category_int?: number | null
          id?: string
          player_id_a?: string
          player_id_b?: string
          tournament_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_player_id_a_fkey"
            columns: ["player_id_a"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_player_id_b_fkey"
            columns: ["player_id_b"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "club_tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          coach_booking_id: string | null
          coach_id: string
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          player_id: string
          session_date: string
          session_type: string
        }
        Insert: {
          coach_booking_id?: string | null
          coach_id: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          player_id: string
          session_date: string
          session_type?: string
        }
        Update: {
          coach_booking_id?: string | null
          coach_id?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          player_id?: string
          session_date?: string
          session_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_coach_booking_id_fkey"
            columns: ["coach_booking_id"]
            isOneToOne: false
            referencedRelation: "coach_bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coach_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_analytics_activation_funnel: { Args: never; Returns: Json }
      admin_analytics_activation_series: {
        Args: { p_days?: number }
        Returns: Json
      }
      admin_analytics_club_metrics: { Args: never; Returns: Json }
      admin_analytics_feature_adoption: { Args: never; Returns: Json }
      admin_analytics_growth: { Args: never; Returns: Json }
      admin_analytics_kpis: { Args: never; Returns: Json }
      admin_analytics_retention: { Args: never; Returns: Json }
      admin_attach_alias_to_club: {
        Args: {
          p_alias_name: string
          p_city_id?: string
          p_club_id: string
          p_country_code?: string
          p_region_code?: string
        }
        Returns: string
      }
      admin_backfill_match_clubs: {
        Args: { p_dry_run?: boolean }
        Returns: {
          action: string
          club_name_raw: string
          confidence: number
          match_id: string
          suggested_club_id: string
          suggested_club_name: string
        }[]
      }
      admin_find_club_duplicates: {
        Args: { p_limit?: number; p_query?: string }
        Returns: {
          city: string
          city_id: string
          clubs: Json
          clubs_count: number
          cluster_key: string
          confidence: number
          country_code: string
          region_code: string
          region_name: string
          total_matches: number
        }[]
      }
      admin_get_club_anchoring_stats: { Args: never; Returns: Json }
      admin_get_overview_stats: { Args: never; Returns: Json }
      admin_merge_clubs:
        | { Args: { p_from: string; p_into: string }; Returns: Json }
        | {
            Args: {
              p_note?: string
              p_source_club_id: string
              p_target_club_id: string
            }
            Returns: Json
          }
      admin_set_match_club: {
        Args: {
          p_club_id: string
          p_club_name_raw?: string
          p_match_id: string
        }
        Returns: string
      }
      backfill_all_pasala_indexes: { Args: never; Returns: number }
      booking_create_match: { Args: { p_booking_id: string }; Returns: string }
      calculate_player_pasala_index: {
        Args: { p_player_id: string }
        Returns: number
      }
      check_and_unlock_badges: {
        Args: { p_player_id: string }
        Returns: undefined
      }
      club_assign_team_to_group: {
        Args: { p_group_id: string; p_seed_order?: number; p_team_id: string }
        Returns: undefined
      }
      club_assign_tournament_team_to_group: {
        Args: { p_group_id: string; p_seed_order?: number; p_team_id: string }
        Returns: undefined
      }
      club_auto_create_groups: {
        Args: {
          p_division_id: string
          p_group_count?: number
          p_target_size?: number
        }
        Returns: number
      }
      club_auto_create_tournament_groups: {
        Args: {
          p_group_count?: number
          p_target_size?: number
          p_tournament_id: string
        }
        Returns: number
      }
      club_cancel_booking: { Args: { p_booking_id: string }; Returns: string }
      club_complete_onboarding: {
        Args: {
          p_access_type?: string
          p_address?: string
          p_avatar_url?: string
          p_city?: string
          p_city_id?: string
          p_contact_first_name?: string
          p_contact_last_name?: string
          p_contact_phone?: string
          p_country_code?: string
          p_courts_count?: number
          p_description?: string
          p_has_glass?: boolean
          p_has_synthetic_grass?: boolean
          p_name: string
          p_region_code?: string
          p_region_name?: string
        }
        Returns: string
      }
      club_confirm_booking: { Args: { p_booking_id: string }; Returns: string }
      club_confirm_booking_and_create_match: {
        Args: { p_booking_id: string }
        Returns: string
      }
      club_create: {
        Args: {
          p_city?: string
          p_city_id?: string
          p_country_code?: string
          p_name: string
          p_region_code?: string
          p_region_name?: string
        }
        Returns: string
      }
      club_create_candidate: {
        Args: {
          p_address?: string
          p_city?: string
          p_city_id?: string
          p_country_code?: string
          p_courts_count?: number
          p_display_name: string
          p_region_code?: string
          p_region_name?: string
          p_responsible_email?: string
          p_responsible_first_name?: string
          p_responsible_last_name?: string
          p_responsible_phone?: string
          p_surface_types?: Json
        }
        Returns: string
      }
      club_create_confirmed_booking_match: {
        Args: {
          p_club_id: string
          p_court_id: string
          p_end_at: string
          p_note?: string
          p_player_id: string
          p_start_at: string
        }
        Returns: Json
      }
      club_create_court: {
        Args: {
          p_club_id: string
          p_is_indoor?: boolean
          p_name: string
          p_surface_type?: string
        }
        Returns: string
      }
      club_create_league: {
        Args: {
          p_club_id: string
          p_description?: string
          p_name: string
          p_season_label?: string
          p_status?: string
        }
        Returns: string
      }
      club_create_league_division: {
        Args: {
          p_allow_override?: boolean
          p_category_mode: string
          p_category_value_int?: number
          p_league_id: string
          p_name: string
        }
        Returns: string
      }
      club_create_league_group: {
        Args: { p_division_id: string; p_name: string; p_sort_order?: number }
        Returns: string
      }
      club_create_match: {
        Args: { p_match_at: string; p_max_players?: number; p_notes?: string }
        Returns: string
      }
      club_create_match_with_players: {
        Args: {
          p_match_at: string
          p_max_players?: number
          p_notes?: string
          p_player_a1_id: string
          p_player_a2_id: string
          p_player_b1_id: string
          p_player_b2_id: string
        }
        Returns: string
      }
      club_create_tournament: {
        Args: {
          p_allow_lower_category?: boolean
          p_club_id: string
          p_description?: string
          p_name: string
          p_season_label?: string
          p_status?: string
          p_target_category_int: number
        }
        Returns: string
      }
      club_find_claim_candidates: {
        Args: {
          p_city_id?: string
          p_exclude_club_id?: string
          p_limit?: number
          p_name: string
          p_region_code?: string
        }
        Returns: {
          city: string
          claim_status: string
          exact_name: boolean
          id: string
          location_match: boolean
          name: string
          region_name: string
        }[]
      }
      club_generate_division_playoffs: {
        Args: { p_division_id: string }
        Returns: number
      }
      club_generate_group_fixture: {
        Args: { p_group_id: string }
        Returns: number
      }
      club_generate_tournament_group_fixture: {
        Args: { p_group_id: string }
        Returns: number
      }
      club_generate_tournament_playoffs: {
        Args: { p_tournament_id: string }
        Returns: number
      }
      club_get_agenda_slots: {
        Args: { p_club_id: string; p_from: string; p_to: string }
        Returns: {
          booking_status: string
          court_id: string
          court_name: string
          end_at: string
          entity_id: string
          entity_name: string
          match_id: string
          note: string
          requester_name: string
          slot_id: string
          slot_type: string
          start_at: string
          team_a: string
          team_b: string
        }[]
      }
      club_get_dashboard_stats: {
        Args: { p_club_id?: string }
        Returns: {
          club_id: string
          matches_by_category: Json
          matches_by_hour: Json
          matches_by_weekday: Json
          matches_last_30_days: number
          matches_last_7_days: number
          top_players: Json
          unique_players_last_30_days: number
        }[]
      }
      club_get_group_table: {
        Args: { p_group_id: string }
        Returns: {
          last_match_at: string
          losses: number
          played: number
          points: number
          sets_lost: number
          sets_won: number
          team_id: string
          wins: number
        }[]
      }
      club_get_league_registrations: {
        Args: { p_league_id: string }
        Returns: {
          player_category: number
          player_city: string
          player_id: string
          player_name: string
          registration_id: string
          requested_at: string
          status: string
          teammate_category: number
          teammate_city: string
          teammate_name: string
          teammate_player_id: string
        }[]
      }
      club_get_public_profile: {
        Args: { p_club_id: string }
        Returns: {
          city: string
          claimed: boolean
          country_code: string
          courts_count: number
          id: string
          name: string
          region_code: string
          region_name: string
          surface_types: Json
        }[]
      }
      club_get_ranking: {
        Args: { p_club_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          category: string
          display_name: string
          last_match_at: string
          losses: number
          matches_played: number
          player_id: string
          points: number
          rank: number
          sets_lost: number
          sets_won: number
          wins: number
        }[]
      }
      club_get_tournament_group_table: {
        Args: { p_group_id: string }
        Returns: {
          last_match_at: string
          losses: number
          played: number
          points: number
          sets_lost: number
          sets_won: number
          team_id: string
          wins: number
        }[]
      }
      club_get_tournament_registrations: {
        Args: { p_tournament_id: string }
        Returns: {
          player_category: number
          player_city: string
          player_id: string
          player_name: string
          registration_id: string
          requested_at: string
          status: string
          teammate_category: number
          teammate_city: string
          teammate_name: string
          teammate_player_id: string
        }[]
      }
      club_list_my_matches: {
        Args: { p_club_id: string; p_limit?: number }
        Returns: {
          club_id: string
          club_name: string
          created_at: string
          id: string
          match_at: string
          match_results: Json
          max_players: number
          notes: string
          players_by_team: Json
          players_count: number
          status: string
          updated_at: string
        }[]
      }
      club_normalize_name: { Args: { p_name: string }; Returns: string }
      club_recalculate_rankings: {
        Args: { p_club_id: string }
        Returns: undefined
      }
      club_register_alias: {
        Args: { p_alias_text: string; p_club_id: string }
        Returns: string
      }
      club_register_league_team: {
        Args: {
          p_division_id: string
          p_entry_category_int?: number
          p_player_id_a: string
          p_player_id_b: string
        }
        Returns: string
      }
      club_register_tournament_team: {
        Args: {
          p_entry_category_int?: number
          p_player_id_a: string
          p_player_id_b: string
          p_tournament_id: string
        }
        Returns: string
      }
      club_reject_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: string
      }
      club_remove_league_team: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      club_remove_tournament_team: {
        Args: { p_team_id: string }
        Returns: undefined
      }
      club_reopen_division_fixture_for_edit: {
        Args: { p_division_id: string }
        Returns: Json
      }
      club_reopen_tournament_fixture_for_edit: {
        Args: { p_tournament_id: string }
        Returns: Json
      }
      club_request_claim:
        | {
            Args: {
              p_club_id: string
              p_contact_phone?: string
              p_message?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_club_id: string
              p_message?: string
              p_requester_email: string
              p_requester_first_name: string
              p_requester_last_name: string
              p_requester_phone: string
            }
            Returns: string
          }
      club_resolve_claim: {
        Args: { p_decision: string; p_request_id: string }
        Returns: string
      }
      club_resolve_league_registration: {
        Args: { p_registration_id: string; p_status: string }
        Returns: undefined
      }
      club_resolve_tournament_registration: {
        Args: { p_registration_id: string; p_status: string }
        Returns: undefined
      }
      club_schedule_league_match: {
        Args: {
          p_court_id: string
          p_league_match_id: string
          p_match_at: string
        }
        Returns: Json
      }
      club_schedule_playoff_match: {
        Args: {
          p_court_id: string
          p_match_at: string
          p_playoff_match_id: string
        }
        Returns: Json
      }
      club_schedule_tournament_match: {
        Args: {
          p_court_id: string
          p_match_at: string
          p_tournament_match_id: string
        }
        Returns: Json
      }
      club_schedule_tournament_playoff_match: {
        Args: {
          p_court_id: string
          p_match_at: string
          p_playoff_match_id: string
        }
        Returns: Json
      }
      club_search: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          city: string
          city_id: string
          claimed: boolean
          country_code: string
          id: string
          name: string
          region_code: string
          region_name: string
          score: number
        }[]
      }
      club_set_court_schedule: {
        Args: {
          p_closing_time: string
          p_court_id: string
          p_opening_time: string
          p_slot_interval_minutes?: number
        }
        Returns: string
      }
      club_similarity_key: { Args: { p_name: string }; Returns: string }
      club_submit_league_match_result: {
        Args: {
          p_league_match_id: string
          p_set1_a: number
          p_set1_b: number
          p_set2_a: number
          p_set2_b: number
          p_set3_a?: number
          p_set3_b?: number
        }
        Returns: string
      }
      club_submit_playoff_match_result: {
        Args: {
          p_playoff_match_id: string
          p_set1_a: number
          p_set1_b: number
          p_set2_a: number
          p_set2_b: number
          p_set3_a?: number
          p_set3_b?: number
        }
        Returns: string
      }
      club_submit_tournament_match_result: {
        Args: {
          p_set1_a: number
          p_set1_b: number
          p_set2_a: number
          p_set2_b: number
          p_set3_a?: number
          p_set3_b?: number
          p_tournament_match_id: string
        }
        Returns: string
      }
      club_submit_tournament_playoff_match_result: {
        Args: {
          p_playoff_match_id: string
          p_set1_a: number
          p_set1_b: number
          p_set2_a: number
          p_set2_b: number
          p_set3_a?: number
          p_set3_b?: number
        }
        Returns: string
      }
      club_sync_playoff_match_players: {
        Args: { p_playoff_match_id: string }
        Returns: undefined
      }
      club_sync_tournament_playoff_match_players: {
        Args: { p_playoff_match_id: string }
        Returns: undefined
      }
      club_update_court: {
        Args: {
          p_active?: boolean
          p_court_id: string
          p_is_indoor?: boolean
          p_name?: string
          p_surface_type?: string
        }
        Returns: string
      }
      club_update_league_info: {
        Args: {
          p_end_date?: string
          p_league_id: string
          p_start_date?: string
          p_target_city_ids?: string[]
        }
        Returns: undefined
      }
      club_update_league_status: {
        Args: { p_league_id: string; p_status: string }
        Returns: undefined
      }
      club_update_profile: {
        Args: {
          p_access_type?: string
          p_address?: string
          p_avatar_url?: string
          p_club_id: string
          p_contact_first_name?: string
          p_contact_last_name?: string
          p_contact_phone?: string
          p_courts_count?: number
          p_description?: string
          p_has_glass?: boolean
          p_has_synthetic_grass?: boolean
          p_name?: string
        }
        Returns: string
      }
      club_update_tournament_info: {
        Args: {
          p_end_date?: string
          p_start_date?: string
          p_target_city_ids?: string[]
          p_tournament_id: string
        }
        Returns: undefined
      }
      club_update_tournament_status: {
        Args: { p_status: string; p_tournament_id: string }
        Returns: undefined
      }
      club_upsert_booking_settings: {
        Args: {
          p_buffer_minutes?: number
          p_club_id: string
          p_opening_hours?: Json
          p_slot_duration_minutes?: number
          p_timezone?: string
        }
        Returns: string
      }
      coach_accept_invitation: {
        Args: { p_coach_player_id: string }
        Returns: undefined
      }
      coach_cancel_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      coach_confirm_booking: {
        Args: { p_booking_id: string }
        Returns: undefined
      }
      coach_create_booking: {
        Args: {
          p_club_id: string
          p_court_id?: string
          p_duration_minutes: number
          p_notes_coach?: string
          p_player_id: string
          p_scheduled_at: string
        }
        Returns: string
      }
      coach_enable_profile: { Args: never; Returns: Json }
      coach_get_my_players: { Args: never; Returns: Json }
      coach_get_public_profile: { Args: { p_coach_id: string }; Returns: Json }
      coach_invite_player: { Args: { p_player_id: string }; Returns: string }
      coach_reject_booking: {
        Args: { p_booking_id: string; p_reason?: string }
        Returns: undefined
      }
      coach_set_availability: { Args: { p_slots: Json }; Returns: undefined }
      coach_update_profile: {
        Args: {
          p_bio?: string
          p_especialidad?: string
          p_primary_club_id?: string
          p_tarifa_por_hora?: number
          p_tarifa_publica?: boolean
        }
        Returns: Json
      }
      current_player_id: { Args: never; Returns: string }
      current_player_match_ids: {
        Args: never
        Returns: {
          match_id: string
        }[]
      }
      current_uid: { Args: never; Returns: string }
      debug_auth_context: { Args: never; Returns: Json }
      get_available_coaches: {
        Args: {
          p_city_id?: string
          p_club_id?: string
          p_especialidad?: string
          p_limit?: number
          p_offset?: number
        }
        Returns: Json
      }
      get_player_badges: { Args: { p_player_id: string }; Returns: Json }
      get_player_calendar: {
        Args: { p_date_from: string; p_date_to: string }
        Returns: {
          club_name: string
          court_name: string
          end_at: string
          id: string
          metadata: Json
          start_at: string
          status: string
          title: string
          type: string
        }[]
      }
      get_player_global_ranking: {
        Args: { p_player_id: string }
        Returns: Json
      }
      get_player_index_history: {
        Args: { p_limit?: number; p_player_id: string }
        Returns: Json
      }
      get_player_last_match: {
        Args: never
        Returns: {
          club_name: string
          match_at: string
          match_id: string
          my_team: string
          rival_name: string
          winner_team: string
        }[]
      }
      get_player_top_rivals: {
        Args: { p_limit?: number; p_player_id: string }
        Returns: Json
      }
      get_players_directory: {
        Args: {
          p_activity?: string
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_order_by?: string
          p_query?: string
          p_viewer_city_id?: string
        }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      job_autocomplete_matches: { Args: never; Returns: undefined }
      notification_create: {
        Args: {
          p_club_id?: string
          p_dedupe_key?: string
          p_entity_id?: string
          p_payload?: Json
          p_priority?: number
          p_type?: string
          p_user_id?: string
        }
        Returns: string
      }
      notification_list: {
        Args: { p_limit?: number; p_target?: string }
        Returns: {
          created_at: string
          entity_id: string
          id: string
          payload: Json
          priority: number
          read_at: string
          type: string
        }[]
      }
      notification_mark_all_read: {
        Args: { p_target?: string }
        Returns: number
      }
      notification_mark_read: {
        Args: { p_notification_id: string }
        Returns: string
      }
      notification_unread_count: {
        Args: { p_target?: string }
        Returns: number
      }
      player_cancel_booking: { Args: { p_booking_id: string }; Returns: string }
      player_cancel_match: { Args: { p_match_id: string }; Returns: string }
      player_claim_club: {
        Args: { p_club_id: string; p_email: string; p_phone: string }
        Returns: string
      }
      player_claim_profile: {
        Args: { p_target_player_id: string }
        Returns: string
      }
      player_claim_profile_v2: {
        Args: { p_match_id?: string; p_target_player_id: string }
        Returns: string
      }
      player_complete_onboarding: {
        Args: {
          p_avatar_url?: string
          p_birth_year?: number
          p_category: number
          p_city?: string
          p_city_id?: string
          p_country_code?: string
          p_display_name: string
          p_email?: string
          p_first_name: string
          p_last_name: string
          p_phone: string
          p_position: Database["public"]["Enums"]["player_position"]
          p_region_code?: string
          p_region_name?: string
        }
        Returns: string
      }
      player_create_club_candidate: {
        Args: {
          p_address?: string
          p_city?: string
          p_city_id?: string
          p_country_code?: string
          p_courts_count?: number
          p_name: string
          p_region_code?: string
          p_region_name?: string
          p_responsible_email?: string
          p_responsible_first_name?: string
          p_responsible_last_name?: string
          p_responsible_phone?: string
          p_surface_types?: Json
        }
        Returns: string
      }
      player_create_guest_player: {
        Args: {
          p_city?: string
          p_city_id?: string
          p_country_code?: string
          p_display_name: string
          p_first_name?: string
          p_last_name?: string
          p_phone?: string
          p_position?: Database["public"]["Enums"]["player_position"]
          p_region_code?: string
          p_region_name?: string
        }
        Returns: string
      }
      player_create_match: {
        Args: {
          p_club_name: string
          p_match_at: string
          p_max_players?: number
          p_notes?: string
          p_status?: Database["public"]["Enums"]["match_status"]
        }
        Returns: string
      }
      player_create_match_unified: {
        Args: {
          p_booking_id?: string
          p_club_id?: string
          p_club_name?: string
          p_court_id?: string
          p_match_at: string
          p_notes?: string
          p_player_ids: string[]
          p_source?: string
        }
        Returns: string
      }
      player_create_match_with_players:
        | {
            Args: {
              p_club_id?: string
              p_club_name: string
              p_match_at: string
              p_max_players?: number
              p_notes?: string
              p_opp1_id: string
              p_opp2_id: string
              p_partner_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_club_name: string
              p_match_at: string
              p_max_players?: number
              p_notes?: string
              p_opp1_id: string
              p_opp2_id: string
              p_partner_id: string
              p_status?: Database["public"]["Enums"]["match_status"]
            }
            Returns: string
          }
      player_find_claim_candidates: {
        Args: {
          p_city?: string
          p_first_name: string
          p_last_name: string
          p_limit?: number
        }
        Returns: {
          city: string
          city_match: boolean
          display_name: string
          id: string
          region_name: string
        }[]
      }
      player_find_similar_players: {
        Args: { p_query: string }
        Returns: {
          avatar_url: string | null
          birth_year: number | null
          category: string
          city: string | null
          city_id: string | null
          city_normalized: string | null
          club_owner_enabled_at: string | null
          coach_enabled_at: string | null
          country_code: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          display_name: string
          email: string | null
          first_name: string
          id: string
          is_club_owner: boolean | null
          is_coach: boolean
          is_guest: boolean
          last_name: string
          normalized_name: string
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          onboarding_version: number
          pasala_index: number | null
          pasala_index_updated_at: string | null
          phone: string | null
          position: Database["public"]["Enums"]["player_position"]
          region_code: string | null
          region_name: string | null
          status: Database["public"]["Enums"]["player_status"]
          updated_at: string
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "players"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      player_get_competitive_stats: {
        Args: never
        Returns: {
          best_teammate_id: string
          best_teammate_name: string
          matches_together: number
          matches_vs_higher: number
          winrate_together: number
          winrate_vs_higher: number
          wins_together: number
          wins_vs_higher: number
        }[]
      }
      player_get_my_club_rankings: {
        Args: { p_limit?: number }
        Returns: {
          club_id: string
          club_name: string
          last_match_at: string
          losses: number
          matches_played: number
          points: number
          rank: number
          wins: number
        }[]
      }
      player_get_open_events: {
        Args: never
        Returns: {
          club_id: string
          club_name: string
          end_date: string
          entity_id: string
          entity_name: string
          entity_type: string
          registration_id: string
          registration_partner_name: string
          registration_partner_player_id: string
          registration_role: string
          registration_status: string
          season_label: string
          start_date: string
        }[]
      }
      player_get_profile_metrics: {
        Args: { p_player_id: string }
        Returns: Json
      }
      player_get_share_stats: {
        Args: { p_user_id?: string }
        Returns: {
          ignored_last_3: boolean
          last_share_at: string
          shares_last_30d: number
          shares_total: number
        }[]
      }
      player_request_booking: {
        Args: {
          p_club_id: string
          p_court_id: string
          p_end_at: string
          p_note?: string
          p_start_at: string
        }
        Returns: string
      }
      player_request_coach_booking: {
        Args: {
          p_coach_id: string
          p_duration_minutes: number
          p_notes_player?: string
          p_scheduled_at: string
        }
        Returns: string
      }
      player_request_league_registration:
        | { Args: { p_league_id: string }; Returns: string }
        | {
            Args: { p_league_id: string; p_teammate_player_id: string }
            Returns: string
          }
      player_request_tournament_registration:
        | { Args: { p_tournament_id: string }; Returns: string }
        | {
            Args: { p_teammate_player_id: string; p_tournament_id: string }
            Returns: string
          }
      player_search_clubs: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          city: string
          city_id: string
          claimed: boolean
          country_code: string
          id: string
          name: string
          region_code: string
          region_name: string
          score: number
        }[]
      }
      player_search_players: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          city: string
          city_id: string
          display_name: string
          id: string
          is_guest: boolean
          region_code: string
          region_name: string
          score: number
        }[]
      }
      player_set_match_club: {
        Args: {
          p_club_id: string
          p_club_name_raw?: string
          p_match_id: string
        }
        Returns: string
      }
      player_submit_match_result: {
        Args: {
          p_match_id: string
          p_set1_a: number
          p_set1_b: number
          p_set2_a: number
          p_set2_b: number
          p_set3_a?: number
          p_set3_b?: number
        }
        Returns: string
      }
      player_update_match:
        | {
            Args: {
              p_club_name: string
              p_match_at: string
              p_match_id: string
              p_notes?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_club_id?: string
              p_club_name: string
              p_match_at: string
              p_match_id: string
              p_notes?: string
            }
            Returns: string
          }
      player_update_match_roster: {
        Args: {
          p_match_id: string
          p_opp1_id: string
          p_opp2_id: string
          p_partner_id: string
        }
        Returns: string
      }
      player_update_profile: {
        Args: {
          p_avatar_url?: string
          p_birth_year?: number
          p_category?: number
          p_city?: string
          p_city_id?: string
          p_country_code?: string
          p_display_name: string
          p_email?: string
          p_phone?: string
          p_player_id: string
          p_position: Database["public"]["Enums"]["player_position"]
          p_region_code?: string
          p_region_name?: string
        }
        Returns: string
      }
      q6_can_manage_club: {
        Args: { p_club_id: string; p_uid: string }
        Returns: boolean
      }
      q6_is_admin: { Args: { p_uid: string }; Returns: boolean }
      q6_notify_event_open: {
        Args: {
          p_city_ids: string[]
          p_club_name: string
          p_entity_id: string
          p_entity_name: string
          p_entity_type: string
          p_start_date: string
        }
        Returns: number
      }
      recalculate_indexes_for_match: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      record_share_event: {
        Args: { p_channel?: string; p_match_id: string }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      match_status: "scheduled" | "completed" | "cancelled"
      player_position: "drive" | "reves" | "cualquiera"
      player_status: "active" | "inactive"
      team_type: "A" | "B"
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
      match_status: ["scheduled", "completed", "cancelled"],
      player_position: ["drive", "reves", "cualquiera"],
      player_status: ["active", "inactive"],
      team_type: ["A", "B"],
    },
  },
} as const
