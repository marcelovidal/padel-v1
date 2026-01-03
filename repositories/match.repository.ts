import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type Match = Database["public"]["Tables"]["matches"]["Row"];
type MatchInsert = Database["public"]["Tables"]["matches"]["Insert"];
type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];
type MatchPlayer = Database["public"]["Tables"]["match_players"]["Row"];
type MatchPlayerInsert = Database["public"]["Tables"]["match_players"]["Insert"];
type MatchResult = Database["public"]["Tables"]["match_results"]["Row"];
type MatchResultInsert = Database["public"]["Tables"]["match_results"]["Insert"];
type MatchResultUpdate = Database["public"]["Tables"]["match_results"]["Update"];

export interface MatchWithPlayers extends Match {
  match_players: Array<MatchPlayer & { players: { first_name: string; last_name: string } | null }>;
  match_results: MatchResult | null;
}

export class MatchRepository {
  private async getClient() {
    return await createClient();
  }

  async findAll(): Promise<Match[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("matches")
      .select("*")
      .order("match_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findById(id: string): Promise<MatchWithPlayers | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("matches")
      .select(`
        *,
        match_players (
          *,
          players (
            first_name,
            last_name
          )
        ),
        match_results (*)
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as MatchWithPlayers;
  }

  async create(match: MatchInsert): Promise<Match> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("matches")
      .insert(match)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: MatchUpdate): Promise<Match> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("matches")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMatchPlayers(matchId: string): Promise<MatchPlayer[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("match_players")
      .select("*")
      .eq("match_id", matchId);

    if (error) throw error;
    return data || [];
  }

  async addPlayerToMatch(input: MatchPlayerInsert): Promise<MatchPlayer> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("match_players")
      .insert(input)
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new Error("El jugador ya está asignado a este partido");
      }
      throw error;
    }
    return data;
  }

  async removePlayerFromMatch(matchId: string, playerId: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await supabase
      .from("match_players")
      .delete()
      .eq("match_id", matchId)
      .eq("player_id", playerId);

    if (error) throw error;
  }

  async getMatchResult(matchId: string): Promise<MatchResult | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("match_results")
      .select("*")
      .eq("match_id", matchId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async upsertMatchResult(input: MatchResultInsert): Promise<MatchResult> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("match_results")
      .upsert(input, { onConflict: "match_id" })
      .select()
      .single();

    if (error) throw error;

    // Si el trigger no existe, actualizar status manualmente
    await supabase
      .from("matches")
      .update({ status: "completed" })
      .eq("id", input.match_id);

    return data;
  }
}

