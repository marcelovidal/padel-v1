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
export type TeamType = "A" | "B";

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
          match_at: string; // Cambió de datetime a match_at
          club_name: string;
          max_players: number;
          notes: string | null;
          status: MatchStatus;
          created_by: string | null; // Nuevo campo
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_at: string; // Cambió de datetime a match_at
          club_name: string;
          max_players?: number;
          notes?: string | null;
          status?: MatchStatus;
          created_by?: string | null; // Nuevo campo
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_at?: string; // Cambió de datetime a match_at
          club_name?: string;
          max_players?: number;
          notes?: string | null;
          status?: MatchStatus;
          created_by?: string | null; // Nuevo campo
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
    };
  };
}

