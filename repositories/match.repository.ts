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
    // First, get match_ids and teams from match_players
    const { data: mpData, error: mpError } = await supabase
      .from("match_players")
      .select("match_id, team")
      .eq("player_id", playerId);

    if (mpError) throw mpError;

    const players = mpData || [];
    const matchIds = players.map((p: any) => p.match_id);
    if (matchIds.length === 0) return [];

    // Fetch matches directly, including match_results
    const { data: matchesData, error: matchesError } = await supabase
      .from("matches")
      .select(`
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
      `)
      .in("id", matchIds)
      .order("match_at", { ascending: false });

    if (matchesError) throw matchesError;

    const matchesArr = matchesData || [];

    // Fetch match_results explicitly to avoid nested-relation inconsistencies
    const { data: resultsData, error: resultsError } = await supabase
      .from("match_results")
      .select("*")
      .in("match_id", matchIds);

    if (resultsError) throw resultsError;

    const resultsArr = resultsData || [];
    const resultByMatch = new Map(resultsArr.map((r: any) => [r.match_id, r]));

    // Fetch all match_players for these matches, including player basic info
    const { data: allMatchPlayers, error: mpAllError } = await supabase
      .from("match_players")
      .select(`match_id, team, players ( id, first_name, last_name )`)
      .in("match_id", matchIds);

    if (mpAllError) throw mpAllError;

    const playersArr = (allMatchPlayers || []) as any[];

    // Build playersByMatch: { matchId: { A: [...], B: [...] } }
    const playersByMatch = new Map<string, { A: any[]; B: any[] }>();
    for (const p of playersArr) {
      const mid = p.match_id;
      if (!playersByMatch.has(mid)) playersByMatch.set(mid, { A: [], B: [] });
      const bucket = playersByMatch.get(mid)!;
      const playerInfo = p.players ? { id: p.players.id, first_name: p.players.first_name, last_name: p.players.last_name } : null;
      if (p.team === "A") bucket.A.push(playerInfo);
      else bucket.B.push(playerInfo);
    }

    // Map team from match_players (original query) to each match
    const teamByMatch = new Map(players.map((p: any) => [p.match_id, p.team]));

    const items = matchesArr.map((match: any) => {
      const mr = resultByMatch.get(match.id) ?? null;
      const playersByTeam = playersByMatch.get(match.id) ?? { A: [], B: [] };
      return {
        ...match,
        team: teamByMatch.get(match.id) as TeamType,
        match_results: mr as MatchResult | null,
        playersByTeam,
      };
    });

    return items;
  }

  async findAllWithPlayersAndResults(opts?: { limit?: number; offset?: number }) {
    const supabase = await this.getClient();
    let q: any = supabase
      .from("matches")
      .select(`
        id,
        match_at,
        club_name,
        max_players,
        notes,
        status,
        created_by,
        created_at,
        updated_at
      `)
      .order("match_at", { ascending: false });

    if (opts?.limit && typeof opts.offset === "number") {
      const from = opts.offset;
      const to = opts.offset + opts.limit - 1;
      q = q.range(from, to);
    } else if (opts?.limit) {
      q = q.limit(opts.limit);
    }

    const { data: matchesData, error: matchesError } = await q;
    if (matchesError) throw matchesError;
    const matchesArr = matchesData || [];
    const matchIds = matchesArr.map((m: any) => m.id);
    if (matchIds.length === 0) return [];

    // Fetch match_results
    const { data: resultsData, error: resultsError } = await supabase
      .from("match_results")
      .select("*")
      .in("match_id", matchIds);
    if (resultsError) throw resultsError;
    const resultsArr = resultsData || [];
    const resultByMatch = new Map(resultsArr.map((r: any) => [r.match_id, r]));

    // Fetch match_players with player basic info
    const { data: allMatchPlayers, error: mpAllError } = await supabase
      .from("match_players")
      .select(`match_id, team, players ( id, first_name, last_name )`)
      .in("match_id", matchIds);
    if (mpAllError) throw mpAllError;
    const playersArr = (allMatchPlayers || []) as any[];

    const playersByMatch = new Map<string, { A: any[]; B: any[] }>();
    for (const p of playersArr) {
      const mid = p.match_id;
      if (!playersByMatch.has(mid)) playersByMatch.set(mid, { A: [], B: [] });
      const bucket = playersByMatch.get(mid)!;
      const playerInfo = p.players ? { id: p.players.id, first_name: p.players.first_name, last_name: p.players.last_name } : null;
      if (p.team === "A") bucket.A.push(playerInfo);
      else bucket.B.push(playerInfo);
    }

    const items = matchesArr.map((match: any) => {
      return {
        ...match,
        match_results: resultByMatch.get(match.id) ?? null,
        playersByTeam: playersByMatch.get(match.id) ?? { A: [], B: [] },
      };
    });

    return items;
  }
}

