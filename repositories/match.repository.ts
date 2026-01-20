import { createClient } from "@/lib/supabase/server";
import { Database, TeamType } from "@/types/database";

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
    // TODO: remove `as any` by switching to a properly typed Supabase server client (createServerClient<Database>)
    const sb: any = supabase as any;
    const { data, error } = await sb
      .from("matches")
      .insert(match as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: MatchUpdate): Promise<Match> {
    const supabase = await this.getClient();
    // TODO: remove `as any` by switching to a properly typed Supabase server client (createServerClient<Database>)
    const sb: any = supabase as any;
    const { data, error } = await sb
      .from("matches")
      .update(updates as any)
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
    // TODO: remove `as any` by switching to a properly typed Supabase server client (createServerClient<Database>)
    const sb: any = supabase as any;
    const { data, error } = await sb
      .from("match_players")
      .insert(input as any)
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
    // TODO: remove `as any` by switching to a properly typed Supabase server client (createServerClient<Database>)
    const sb: any = supabase as any;
    const { data, error } = await sb
      .from("match_results")
      .upsert(input as any, { onConflict: "match_id" })
      .select()
      .single();

    if (error) throw error;

    // Si el trigger no existe, actualizar status manualmente
    // TODO: remove `as any` here once Database types flow through the Supabase client
    await sb
      .from("matches")
      .update({ status: "completed" } as any)
      .eq("id", input.match_id);

    return data;
  }

  async findByPlayerId(playerId: string): Promise<Array<Match & { team: TeamType; match_results: MatchResult | null }>> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("match_players")
      .select(`
        match_id,
        team,
        matches (
          id,
          match_at,
          club_name,
          max_players,
          notes,
          status,
          created_by,
          created_at,
          updated_at,
          match_results (*)
        ),
        match_results:matches!match_id(match_results (*))
      `)
      .eq("player_id", playerId)
      .order("match_at", { ascending: false, foreignTable: "matches" as any });

    if (error) throw error;

    // Normalize results: supabase returns nested structures; map to desired shape
    const items = (data || []).map((row: any) => {
      const match = row.matches as Match & { match_results?: any[] };
      // Normalize match_results: prefer explicit top-level alias if present
      const topLevel = Array.isArray(row.match_results) && row.match_results.length > 0 ? row.match_results[0] : null;
      const nested = Array.isArray(match?.match_results) && match.match_results.length > 0 ? match.match_results[0] : null;
      const mr = topLevel ?? nested ?? null;
      return {
        ...match,
        team: row.team as TeamType,
        match_results: mr as MatchResult | null,
      };
    });

    return items;
  }
}

