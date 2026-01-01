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
          phone: string; // NOT NULL en el schema corregido
          position: PlayerPosition;
          status: PlayerStatus;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone: string; // NOT NULL
          position?: PlayerPosition;
          status?: PlayerStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string;
          position?: PlayerPosition;
          status?: PlayerStatus;
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
    };
  };
}

