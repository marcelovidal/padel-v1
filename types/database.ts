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

export type Database = {
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
        Relationships: [];
      };

      players: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string;
          category: string | null;
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
          phone: string;
          category?: string | null;
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
          category?: string | null;
          position?: PlayerPosition;
          status?: PlayerStatus;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };

      matches: {
        Row: {
          id: string;
          match_at: string;
          club_name: string;
          max_players: number;
          notes: string | null;
          status: MatchStatus;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          match_at: string;
          club_name: string;
          max_players?: number;
          notes?: string | null;
          status?: MatchStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          match_at?: string;
          club_name?: string;
          max_players?: number;
          notes?: string | null;
          status?: MatchStatus;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      match_players: {
        Row: {
          id: string;
          match_id: string;
          player_id: string;
          team: TeamType;
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
        Relationships: [];
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
        Relationships: [];
      };
    };

    // Claves requeridas por supabase-js para inferencia tipada (aunque estén vacías)
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
