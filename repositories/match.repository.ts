import { createClient } from "@/lib/supabase/server";
import { Database, TeamType } from "@/types/database";
import { normalizeMatchResult } from "@/lib/match/matchUtils";

type Match = Database["public"]["Tables"]["matches"]["Row"];
type MatchInsert = Database["public"]["Tables"]["matches"]["Insert"];
type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];
type MatchPlayer = Database["public"]["Tables"]["match_players"]["Row"];
type MatchPlayerInsert = Database["public"]["Tables"]["match_players"]["Insert"];
type MatchResult = Database["public"]["Tables"]["match_results"]["Row"];
type MatchResultInsert = Database["public"]["Tables"]["match_results"]["Insert"];
type MatchResultUpdate = Database["public"]["Tables"]["match_results"]["Update"];

export interface MatchWithPlayers extends Match {
  match_players: Array<MatchPlayer & { players: { first_name: string; last_name: string; avatar_url: string | null } | null }>;
  match_results: MatchResult | null;
}

type ShareChannel = "whatsapp" | "copylink" | "webshare";

export class MatchRepository {
  private async getClient() {
    return await createClient();
  }

  private async getServiceClient() {
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    return createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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
            last_name,
            avatar_url
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

    if (!data) return null;

    const match = data as any;
    const normalizedResult = Array.isArray(match.match_results)
      ? (match.match_results[0] || null)
      : (match.match_results || null);

    // Apply normalization to sets
    const finalResult = normalizeMatchResult(normalizedResult);

    return {
      ...match,
      match_results: finalResult
    } as MatchWithPlayers;
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
        throw new Error("El jugador ya estÃ¡ asignado a este partido");
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

    // Apply normalization
    return normalizeMatchResult(data) as any;
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

    // Apply normalization
    return normalizeMatchResult(data) as any;
  }

  async findByPlayerId(playerId: string, opts?: { limit?: number }): Promise<Array<Match & { team: TeamType; match_results: MatchResult | null; playersByTeam: { A: any[]; B: any[] } }>> {
    const supabase = await this.getClient();

    // 1. Efficiently find matches for player (pagination ready)
    let query = supabase
      .from("matches")
      .select(`
        id,
        match_at,
        club_name,
        club_id,
        max_players,
        notes,
        status,
        created_by,
        created_at,
        updated_at,
        match_results ( match_id, sets, winner_team, recorded_at ),
        match_players!inner (team, player_id)
      `)
      .eq("match_players.player_id", playerId)
      .order("match_at", { ascending: false });

    if (opts?.limit) {
      query = query.limit(opts.limit);
    }

    const { data: matchesData, error: matchesError } = await query;
    if (matchesError) throw matchesError;

    const matchesArr = matchesData || [];
    if (matchesArr.length === 0) return [];

    const matchIds = matchesArr.map((m: any) => m.id);

    // 2. Fetch full roster (match_players) for these matches
    // (The previous query only got the specific player's entry due to !inner)
    const { data: allMatchPlayers, error: mpAllError } = await supabase
      .from("match_players")
      .select(`match_id, team, player_id, players ( id, first_name, last_name, avatar_url )`)
      .in("match_id", matchIds);

    if (mpAllError) throw mpAllError;

    const playersArr = (allMatchPlayers || []) as any[];

    // 3. Build playersByMatch map
    const playersByMatch = new Map<string, { A: any[]; B: any[] }>();
    for (const p of playersArr) {
      const mid = p.match_id;
      if (!playersByMatch.has(mid)) playersByMatch.set(mid, { A: [], B: [] });
      const bucket = playersByMatch.get(mid)!;
      const playerInfo = p.players ? { id: p.players.id, first_name: p.players.first_name, last_name: p.players.last_name, avatar_url: p.players.avatar_url } : null;
      if (p.team === "A") bucket.A.push(playerInfo);
      else bucket.B.push(playerInfo);
    }

    // 4. Map results
    const items = matchesArr.map((match: any) => {
      // 'match_players' in 'match' object is an array because of the join, but it only contains our player
      // We need to extract the team from it.
      const myPlayerEntry = match.match_players && match.match_players[0];
      const team = myPlayerEntry ? myPlayerEntry.team : null;

      // NormalizaciÃ³n del resultado (Array -> Objeto)
      const rawResult = Array.isArray(match.match_results)
        ? match.match_results[0] ?? null
        : match.match_results ?? null;

      // Apply normalization to sets
      const normalizedResult = normalizeMatchResult(rawResult);

      return {
        id: match.id,
        match_at: match.match_at,
        club_name: match.club_name,
        club_id: match.club_id ?? null,
        max_players: match.max_players,
        notes: match.notes,
        status: match.status,
        created_by: match.created_by,
        created_at: match.created_at,
        updated_at: match.updated_at,
        team: team as TeamType,
        match_results: normalizedResult as any,
        playersByTeam: playersByMatch.get(match.id) ?? { A: [], B: [] },
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
        club_id,
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
      .select("match_id, sets, winner_team, recorded_at")
      .in("match_id", matchIds);
    if (resultsError) throw resultsError;
    const resultsArr = resultsData || [];

    // Build results map with normalization
    const resultByMatch = new Map(
      resultsArr.map((r: any) => [r.match_id, normalizeMatchResult(r)])
    );

    // Fetch match_players with player basic info
    const { data: allMatchPlayers, error: mpAllError } = await supabase
      .from("match_players")
      .select(`match_id, team, players ( id, first_name, last_name, avatar_url )`)
      .in("match_id", matchIds);
    if (mpAllError) throw mpAllError;
    const playersArr = (allMatchPlayers || []) as any[];

    const playersByMatch = new Map<string, { A: any[]; B: any[] }>();
    for (const p of playersArr) {
      const mid = p.match_id;
      if (!playersByMatch.has(mid)) playersByMatch.set(mid, { A: [], B: [] });
      const bucket = playersByMatch.get(mid)!;
      const playerInfo = p.players ? { id: p.players.id, first_name: p.players.first_name, last_name: p.players.last_name, avatar_url: p.players.avatar_url } : null;
      if (p.team === "A") bucket.A.push(playerInfo);
      else bucket.B.push(playerInfo);
    }

    const items = matchesArr.map((match: any) => {
      const matchResult = resultByMatch.get(match.id) ?? null;
      return {
        ...match,
        match_results: matchResult,
        hasResults: !!matchResult,
        playersByTeam: playersByMatch.get(match.id) ?? { A: [], B: [] },
      };
    });

    return items;
  }

  async recordShareEvent(input: {
    userId: string;
    channel?: ShareChannel;
    context?: "match" | "directory" | "profile";
    matchId?: string | null;
  }): Promise<void> {
    const supabase = await this.getClient();
    const payload = {
      match_id: input.matchId ?? null,
      user_id: input.userId,
      channel: input.channel || "whatsapp",
      context: input.context || "match",
    };

    let error: any = null;
    if (payload.match_id) {
      ({ error } = await (supabase as any)
        .from("share_events")
        .upsert(payload, {
          onConflict: "user_id,match_id,channel,context",
          ignoreDuplicates: true,
        }));
    } else {
      ({ error } = await (supabase as any)
        .from("share_events")
        .insert(payload));
    }

    if (error) throw error;
  }

  async getShareStats(userId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_get_share_stats", {
      p_user_id: userId
    });

    if (error) throw error;
    return data?.[0] || { shares_last_30d: 0, shares_total: 0, last_share_at: null, ignored_last_3: false };
  }

  async getPublicMatchData(id: string) {
    const supabase = await this.getServiceClient();
    const { data, error } = await supabase
      .from("matches")
      .select(`
        id,
        match_at,
        club_name,
        club_id,
        status,
        clubs (
          id,
          name,
          claim_status
        ),
        match_players (
          team,
          players (
            id,
            first_name,
            last_name,
            user_id
          )
        ),
        match_results (
          sets,
          winner_team
        )
      `)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    if (!data) return null;

    const match = data as any;
    const rawResult = Array.isArray(match.match_results)
      ? match.match_results[0] ?? null
      : match.match_results ?? null;

    // Apply normalization to sets
    const normalizedResult = normalizeMatchResult(rawResult);

    // Transform players to a simple roster for display
    const roster = match.match_players.map((mp: any) => ({
      team: mp.team,
      player_id: mp.players?.id || null,
      name: mp.players ? `${mp.players.first_name} ${mp.players.last_name}` : "Jugador",
      has_profile: !!mp.players?.user_id
    }));
    const clubData = match.clubs && !Array.isArray(match.clubs) ? match.clubs : Array.isArray(match.clubs) ? match.clubs[0] : null;

    return {
      id: match.id,
      match_at: match.match_at,
      club_id: match.club_id || clubData?.id || null,
      club_name: clubData?.name || match.club_name,
      status: match.status,
      results: normalizedResult,
      club: clubData
        ? {
            id: clubData.id,
            name: clubData.name,
            claim_status: clubData.claim_status,
          }
        : null,
      roster
    };
  }
}

