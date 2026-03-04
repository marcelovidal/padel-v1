export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type PlayerPosition = "drive" | "reves" | "cualquiera";
export type PlayerStatus = "active" | "inactive";
export type MatchStatus = "scheduled" | "completed" | "cancelled";
export type MatchSource = "direct" | "booking";
export type TeamType = "A" | "B";
export type ClubClaimStatus = "unclaimed" | "pending" | "claimed" | "rejected";
export type ClubClaimRequestStatus = "pending" | "approved" | "rejected";
export type ClubAccessType = "abierta" | "cerrada";
export type CourtSurfaceType = "synthetic" | "hard" | "clay" | "other";
export type BookingStatus = "requested" | "confirmed" | "rejected" | "cancelled";

export type Player = Database["public"]["Tables"]["players"]["Row"];
export type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
export type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: "admin";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: "admin";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: "admin";
          created_at?: string;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          user_id: string | null;
          phone: string;
          category: number | null;
          position: PlayerPosition;
          status: PlayerStatus;
          display_name: string;
          normalized_name: string;
          created_by: string;
          is_guest: boolean;
          country_code: string;
          region_code: string | null;
          city: string | null;
          city_normalized: string | null;
          city_id: string | null;
          region_name: string | null;
          birth_year: number | null;
          avatar_url: string | null;
          onboarding_completed: boolean;
          onboarding_completed_at: string | null;
          onboarding_version: number;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          user_id?: string | null;
          phone: string;
          category?: number | null;
          position?: PlayerPosition;
          status?: PlayerStatus;
          display_name: string;
          normalized_name: string;
          created_by: string;
          is_guest?: boolean;
          country_code?: string;
          region_code?: string | null;
          city?: string | null;
          city_normalized?: string | null;
          city_id?: string | null;
          region_name?: string | null;
          birth_year?: number | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          onboarding_completed_at?: string | null;
          onboarding_version?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          user_id?: string | null;
          phone?: string;
          category?: number | null;
          position?: PlayerPosition;
          status?: PlayerStatus;
          display_name?: string;
          normalized_name?: string;
          created_by?: string;
          is_guest?: boolean;
          country_code?: string;
          region_code?: string | null;
          city?: string | null;
          city_normalized?: string | null;
          city_id?: string | null;
          region_name?: string | null;
          birth_year?: number | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          onboarding_completed_at?: string | null;
          onboarding_version?: number;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      matches: {
        Row: {
          id: string;
          match_at: string; // CambiÃƒÆ’Ã‚Â³ de datetime a match_at
          club_name: string;
          club_name_raw: string | null;
          club_id: string | null;
          max_players: number;
          notes: string | null;
          status: MatchStatus;
          created_by: string | null; // Nuevo campo
          match_source: MatchSource;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_at: string; // CambiÃƒÆ’Ã‚Â³ de datetime a match_at
          club_name: string;
          club_name_raw?: string | null;
          club_id?: string | null;
          max_players?: number;
          notes?: string | null;
          status?: MatchStatus;
          created_by?: string | null; // Nuevo campo
          match_source?: MatchSource;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_at?: string; // CambiÃƒÆ’Ã‚Â³ de datetime a match_at
          club_name?: string;
          club_name_raw?: string | null;
          club_id?: string | null;
          max_players?: number;
          notes?: string | null;
          status?: MatchStatus;
          created_by?: string | null; // Nuevo campo
          match_source?: MatchSource;
          created_at?: string;
          updated_at?: string;
        };
      };
      match_players: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          team: TeamType;
          // position_in_match eliminado en el schema corregido
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          team: TeamType;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_id?: string;
          team?: TeamType;
          created_at?: string;
        };
      };
      match_results: {
        Row: {
          id: string;
          match_id: string;
          sets: Json;
          winner_team: TeamType;
          recorded_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          sets: Json;
          winner_team: TeamType;
          recorded_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          sets?: Json;
          winner_team?: TeamType;
          recorded_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      player_match_assessments: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          volea: number | null;
          globo: number | null;
          remate: number | null;
          bandeja: number | null;
          vibora: number | null;
          bajada_pared: number | null;
          saque: number | null;
          recepcion_saque: number | null;
          comments: string | null;
          submitted_by: string | null; // references profiles.id
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id: string;
          volea: number | null;
          globo: number | null;
          remate: number | null;
          bandeja: number | null;
          vibora: number | null;
          bajada_pared: number | null;
          saque: number | null;
          recepcion_saque: number | null;
          comments?: string | null;
          submitted_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          player_id?: string;
          volea?: number | null;
          globo?: number | null;
          remate?: number | null;
          bandeja?: number | null;
          vibora?: number | null;
          bajada_pared?: number | null;
          saque?: number | null;
          recepcion_saque?: number | null;
          comments?: string | null;
          submitted_by?: string | null;
          created_at?: string;
        };
      };
      share_events: {
        Row: {
          id: string;
          user_id: string;
          match_id: string | null;
          channel: string;
          context: "match" | "directory" | "profile";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id?: string | null;
          channel?: string;
          context?: "match" | "directory" | "profile";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          match_id?: string | null;
          channel?: string;
          context?: "match" | "directory" | "profile";
          created_at?: string;
        };
      };
      clubs: {
        Row: {
          id: string;
          name: string;
          normalized_name: string;
          country_code: string;
          region_code: string | null;
          region_name: string | null;
          city: string | null;
          city_id: string | null;
          created_by: string | null;
          claimed_by: string | null;
          claimed: boolean;
          claim_status: ClubClaimStatus;
          claimed_at: string | null;
          address: string | null;
          description: string | null;
          access_type: ClubAccessType | null;
          courts_count: number | null;
          surface_types: Json;
          has_glass: boolean;
          has_synthetic_grass: boolean;
          responsible_first_name: string | null;
          responsible_last_name: string | null;
          responsible_phone: string | null;
          responsible_email: string | null;
          contact_first_name: string | null;
          contact_last_name: string | null;
          contact_phone: string | null;
          avatar_url: string | null;
          onboarding_completed: boolean;
          onboarding_completed_at: string | null;
          merged_into: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          normalized_name: string;
          country_code?: string;
          region_code?: string | null;
          region_name?: string | null;
          city?: string | null;
          city_id?: string | null;
          created_by?: string | null;
          claimed_by?: string | null;
          claimed?: boolean;
          claim_status?: ClubClaimStatus;
          claimed_at?: string | null;
          address?: string | null;
          description?: string | null;
          access_type?: ClubAccessType | null;
          courts_count?: number | null;
          surface_types?: Json;
          has_glass?: boolean;
          has_synthetic_grass?: boolean;
          responsible_first_name?: string | null;
          responsible_last_name?: string | null;
          responsible_phone?: string | null;
          responsible_email?: string | null;
          contact_first_name?: string | null;
          contact_last_name?: string | null;
          contact_phone?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          onboarding_completed_at?: string | null;
          merged_into?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          normalized_name?: string;
          country_code?: string;
          region_code?: string | null;
          region_name?: string | null;
          city?: string | null;
          city_id?: string | null;
          created_by?: string | null;
          claimed_by?: string | null;
          claimed?: boolean;
          claim_status?: ClubClaimStatus;
          claimed_at?: string | null;
          address?: string | null;
          description?: string | null;
          access_type?: ClubAccessType | null;
          courts_count?: number | null;
          surface_types?: Json;
          has_glass?: boolean;
          has_synthetic_grass?: boolean;
          responsible_first_name?: string | null;
          responsible_last_name?: string | null;
          responsible_phone?: string | null;
          responsible_email?: string | null;
          contact_first_name?: string | null;
          contact_last_name?: string | null;
          contact_phone?: string | null;
          avatar_url?: string | null;
          onboarding_completed?: boolean;
          onboarding_completed_at?: string | null;
          merged_into?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
      };
      club_aliases: {
        Row: {
          id: string;
          club_id: string;
          alias_name: string;
          alias_normalized: string;
          city_id: string | null;
          region_code: string | null;
          country_code: string;
          region_code_key: string;
          city_id_key: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          alias_name: string;
          alias_normalized: string;
          city_id?: string | null;
          region_code?: string | null;
          country_code?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          alias_name?: string;
          alias_normalized?: string;
          city_id?: string | null;
          region_code?: string | null;
          country_code?: string;
          created_by?: string | null;
          created_at?: string;
        };
      };
      club_merge_log: {
        Row: {
          id: string;
          source_club_id: string;
          target_club_id: string;
          merged_by: string;
          merged_at: string;
          affected_matches_count: number;
          note: string | null;
        };
        Insert: {
          id?: string;
          source_club_id: string;
          target_club_id: string;
          merged_by: string;
          merged_at?: string;
          affected_matches_count?: number;
          note?: string | null;
        };
        Update: {
          id?: string;
          source_club_id?: string;
          target_club_id?: string;
          merged_by?: string;
          merged_at?: string;
          affected_matches_count?: number;
          note?: string | null;
        };
      };
      club_claim_requests: {
        Row: {
          id: string;
          club_id: string;
          requested_by: string;
          requester_first_name: string;
          requester_last_name: string;
          requester_phone: string;
          requester_email: string;
          status: ClubClaimRequestStatus;
          message: string | null;
          contact_phone: string | null;
          created_at: string;
          resolved_at: string | null;
          resolved_by: string | null;
        };
        Insert: {
          id?: string;
          club_id: string;
          requested_by: string;
          requester_first_name: string;
          requester_last_name: string;
          requester_phone: string;
          requester_email: string;
          status?: ClubClaimRequestStatus;
          message?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
        Update: {
          id?: string;
          club_id?: string;
          requested_by?: string;
          requester_first_name?: string;
          requester_last_name?: string;
          requester_phone?: string;
          requester_email?: string;
          status?: ClubClaimRequestStatus;
          message?: string | null;
          contact_phone?: string | null;
          created_at?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
        };
      };
      match_club_events: {
        Row: {
          id: string;
          match_id: string;
          actor_user_id: string | null;
          old_club_id: string | null;
          new_club_id: string | null;
          old_club_name_raw: string | null;
          new_club_name_raw: string | null;
          source: "player" | "admin" | "backfill";
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          actor_user_id?: string | null;
          old_club_id?: string | null;
          new_club_id?: string | null;
          old_club_name_raw?: string | null;
          new_club_name_raw?: string | null;
          source: "player" | "admin" | "backfill";
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          actor_user_id?: string | null;
          old_club_id?: string | null;
          new_club_id?: string | null;
          old_club_name_raw?: string | null;
          new_club_name_raw?: string | null;
          source?: "player" | "admin" | "backfill";
          created_at?: string;
        };
      };
      club_claim_log: {
        Row: {
          id: string;
          club_id: string;
          claimed_by: string;
          claimed_at: string;
          method: string;
          note: string | null;
        };
        Insert: {
          id?: string;
          club_id: string;
          claimed_by: string;
          claimed_at?: string;
          method: string;
          note?: string | null;
        };
        Update: {
          id?: string;
          club_id?: string;
          claimed_by?: string;
          claimed_at?: string;
          method?: string;
          note?: string | null;
        };
      };
      club_courts: {
        Row: {
          id: string;
          club_id: string;
          name: string;
          surface_type: CourtSurfaceType;
          is_indoor: boolean;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          name: string;
          surface_type?: CourtSurfaceType;
          is_indoor?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          name?: string;
          surface_type?: CourtSurfaceType;
          is_indoor?: boolean;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      club_booking_settings: {
        Row: {
          club_id: string;
          timezone: string;
          slot_duration_minutes: number;
          buffer_minutes: number;
          opening_hours: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          club_id: string;
          timezone?: string;
          slot_duration_minutes?: number;
          buffer_minutes?: number;
          opening_hours?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          club_id?: string;
          timezone?: string;
          slot_duration_minutes?: number;
          buffer_minutes?: number;
          opening_hours?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      court_bookings: {
        Row: {
          id: string;
          club_id: string;
          court_id: string;
          requested_by_player_id: string | null;
          requested_by_user_id: string | null;
          start_at: string;
          end_at: string;
          status: BookingStatus;
          note: string | null;
          rejection_reason: string | null;
          match_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          club_id: string;
          court_id: string;
          requested_by_player_id?: string | null;
          requested_by_user_id?: string | null;
          start_at: string;
          end_at: string;
          status?: BookingStatus;
          note?: string | null;
          rejection_reason?: string | null;
          match_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          club_id?: string;
          court_id?: string;
          requested_by_player_id?: string | null;
          requested_by_user_id?: string | null;
          start_at?: string;
          end_at?: string;
          status?: BookingStatus;
          note?: string | null;
          rejection_reason?: string | null;
          match_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

