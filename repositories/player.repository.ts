import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type Player = Database["public"]["Tables"]["players"]["Row"];
type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

export class PlayerRepository {
  private async getClient() {
    return await createClient();
  }

  private async getServiceClient() {
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    return createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async findAll(): Promise<Player[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findAllActive(): Promise<Player[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("first_name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findById(id: string): Promise<Player | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async findByUserId(userId: string): Promise<Player | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async search(query: string): Promise<Player[]> {
    const supabase = await this.getClient();
    const searchTerm = `%${query}%`;

    // Usar múltiples filtros OR con ilike
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .is("deleted_at", null)
      .or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async create(player: PlayerInsert): Promise<Player> {
    const supabase = await this.getClient();
    // TODO: remove `as any` by using a properly typed Supabase client (createServerClient<Database>)
    const sb: any = supabase as any;
    const { data, error } = await sb
      .from("players")
      .insert(player as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: PlayerUpdate): Promise<Player> {
    const supabase = await this.getClient();
    // TODO: remove `as any` by using a properly typed Supabase client (createServerClient<Database>)
    const sb: any = supabase as any;
    const { data, error } = await sb
      .from("players")
      .update(updates as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deactivate(id: string): Promise<Player> {
    return this.update(id, { status: "inactive" });
  }

  async softDelete(id: string): Promise<void> {
    const supabase = await this.getClient();
    // TODO: remove `as any` by using a properly typed Supabase client (createServerClient<Database>)
    const sb: any = supabase as any;
    const { error } = await sb
      .from("players")
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) throw error;
  }
  async createGuestPlayer(input: {
    display_name: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    position?: "drive" | "reves" | "cualquiera";
    city?: string;
    city_id?: string;
    region_code?: string;
    region_name?: string;
  }): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_create_guest_player", {
      p_display_name: input.display_name,
      p_first_name: input.first_name,
      p_last_name: input.last_name,
      p_phone: input.phone,
      p_position: input.position,
      p_city: input.city,
      p_city_id: input.city_id,
      p_region_code: input.region_code,
      p_region_name: input.region_name,
      p_country_code: 'AR'
    });

    if (error) throw error;
    return data; // returns the new player_id
  }

  async findSimilarPlayers(query: string): Promise<Player[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_find_similar_players", {
      p_query: query,
    });

    if (error) throw error;
    return data || [];
  }

  async claimProfile(playerId: string): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_claim_profile", {
      p_target_player_id: playerId,
    });

    if (error) throw error;
    return data;
  }

  async claimProfileV2(targetPlayerId: string, matchId?: string): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_claim_profile_v2", {
      p_target_player_id: targetPlayerId,
      p_match_id: matchId || null,
    });

    if (error) throw error;
    return data;
  }

  async searchPlayersWeighted(query: string, limit: number = 20): Promise<any[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_search_players", {
      p_query: query,
      p_limit: limit,
    });

    if (error) throw error;

    const ranked = (data || []) as Array<{
      id: string;
      score: number;
      display_name: string;
      city: string | null;
      city_id: string | null;
      region_code: string | null;
      region_name: string | null;
      is_guest: boolean;
    }>;

    if (ranked.length === 0) return [];

    const ids = ranked.map((r) => r.id);
    const { data: details, error: detailsError } = await (supabase as any)
      .from("players")
      .select("id, display_name, city, city_id, region_code, region_name, is_guest, position, category, avatar_url, user_id, status, deleted_at")
      .in("id", ids)
      .eq("status", "active")
      .is("deleted_at", null);

    if (detailsError) throw detailsError;

    const byId = new Map((details || []).map((p: any) => [p.id, p]));

    return ranked.flatMap((r) => {
      const d: any = byId.get(r.id);
      if (!d) return [];
      return [
        {
          id: r.id,
          display_name: d.display_name ?? r.display_name,
          city: d.city ?? r.city,
          city_id: d.city_id ?? r.city_id,
          region_code: d.region_code ?? r.region_code,
          region_name: d.region_name ?? r.region_name,
          is_guest: typeof d.is_guest === "boolean" ? d.is_guest : r.is_guest,
          position: d.position ?? null,
          category: d.category ?? null,
          avatar_url: d.avatar_url ?? null,
          user_id: d.user_id ?? null,
          score: r.score,
        },
      ];
    });
  }

  async getPlayersActivitySnapshot(playerIds: string[]) {
    if (playerIds.length === 0) return {} as Record<string, {
      played: number;
      matches_last_30d: number;
      last_match_at: string | null;
      avg_matches_per_week_30d: number;
    }>;

    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("matches")
      .select("id, match_at, status, match_results(match_id), match_players!inner(player_id)")
      .in("match_players.player_id", playerIds)
      .eq("status", "completed")
      .order("match_at", { ascending: false });

    if (error) throw error;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const byPlayer = new Map<string, {
      played: number;
      matches_last_30d: number;
      last_match_at: string | null;
      avg_matches_per_week_30d: number;
    }>();

    for (const pid of playerIds) {
      byPlayer.set(pid, {
        played: 0,
        matches_last_30d: 0,
        last_match_at: null,
        avg_matches_per_week_30d: 0,
      });
    }

    for (const row of (data || []) as any[]) {
      const hasResult = Array.isArray(row.match_results)
        ? row.match_results.length > 0
        : !!row.match_results;

      if (!hasResult) continue;

      const matchAt = row.match_at ? new Date(row.match_at) : null;
      const playersInMatch = Array.isArray(row.match_players) ? row.match_players : [];

      for (const mp of playersInMatch) {
        const pid = mp?.player_id as string | undefined;
        if (!pid || !byPlayer.has(pid)) continue;

        const current = byPlayer.get(pid)!;
        current.played += 1;

        if (matchAt && (current.last_match_at === null || new Date(current.last_match_at) < matchAt)) {
          current.last_match_at = row.match_at;
        }

        if (matchAt && matchAt >= cutoff) {
          current.matches_last_30d += 1;
        }
      }
    }

    for (const entry of byPlayer.values()) {
      entry.avg_matches_per_week_30d = Number((entry.matches_last_30d / 4).toFixed(2));
    }

    return Object.fromEntries(byPlayer.entries());
  }

  async getClubPlayerSignals(clubId: string, playerIds: string[]) {
    const empty: Record<
      string,
      {
        club_matches_played: number;
        club_matches_last_30d: number;
        last_club_match_at: string | null;
        club_avg_matches_per_week_30d: number;
        club_bookings_count: number;
        has_active_club_registration: boolean;
        is_club_player: boolean;
      }
    > = {};

    if (!clubId || playerIds.length === 0) return empty;

    const supabase = await this.getClient();
    const byPlayer = new Map<
      string,
      {
        club_matches_played: number;
        club_matches_last_30d: number;
        last_club_match_at: string | null;
        club_avg_matches_per_week_30d: number;
        club_bookings_count: number;
        has_active_club_registration: boolean;
        is_club_player: boolean;
      }
    >();

    for (const playerId of playerIds) {
      byPlayer.set(playerId, {
        club_matches_played: 0,
        club_matches_last_30d: 0,
        last_club_match_at: null,
        club_avg_matches_per_week_30d: 0,
        club_bookings_count: 0,
        has_active_club_registration: false,
        is_club_player: false,
      });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { data: clubMatchRows, error: clubMatchError } = await (supabase as any)
      .from("matches")
      .select("id,match_at,status,match_results(match_id),match_players!inner(player_id)")
      .eq("club_id", clubId)
      .eq("status", "completed")
      .in("match_players.player_id", playerIds)
      .order("match_at", { ascending: false });

    if (clubMatchError) throw clubMatchError;

    for (const row of (clubMatchRows || []) as any[]) {
      const hasResult = Array.isArray(row.match_results)
        ? row.match_results.length > 0
        : !!row.match_results;
      if (!hasResult) continue;

      const matchAt = row.match_at ? new Date(row.match_at) : null;
      const playersInMatch = Array.isArray(row.match_players) ? row.match_players : [];

      for (const mp of playersInMatch) {
        const playerId = mp?.player_id as string | undefined;
        if (!playerId) continue;
        const current = byPlayer.get(playerId);
        if (!current) continue;

        current.club_matches_played += 1;
        if (matchAt && (current.last_club_match_at === null || new Date(current.last_club_match_at) < matchAt)) {
          current.last_club_match_at = row.match_at;
        }
        if (matchAt && matchAt >= cutoff) {
          current.club_matches_last_30d += 1;
        }
      }
    }

    const { data: clubBookingRows, error: clubBookingError } = await (supabase as any)
      .from("court_bookings")
      .select("requested_by_player_id,status")
      .eq("club_id", clubId)
      .in("requested_by_player_id", playerIds);

    if (clubBookingError) throw clubBookingError;

    for (const row of (clubBookingRows || []) as any[]) {
      const playerId = row?.requested_by_player_id as string | null;
      if (!playerId) continue;
      if (row?.status === "rejected") continue;

      const current = byPlayer.get(playerId);
      if (!current) continue;
      current.club_bookings_count += 1;
    }

    const registeredPlayers = new Set<string>();

    const { data: activeTournamentRows, error: activeTournamentError } = await (supabase as any)
      .from("club_tournaments")
      .select("id")
      .eq("club_id", clubId)
      .eq("status", "active");

    if (activeTournamentError) throw activeTournamentError;

    const activeTournamentIds = (activeTournamentRows || []).map((r: any) => r.id);
    if (activeTournamentIds.length > 0) {
      let tournamentRegs: any[] = [];

      const { data: tournamentRegsWithTeammate, error: tournamentRegsWithTeammateError } = await (supabase as any)
        .from("tournament_registrations")
        .select("player_id,teammate_player_id,status")
        .in("tournament_id", activeTournamentIds)
        .in("status", ["pending", "confirmed"]);

      if (tournamentRegsWithTeammateError) {
        const { data: tournamentRegsFallback, error: tournamentRegsFallbackError } = await (supabase as any)
          .from("tournament_registrations")
          .select("player_id,status")
          .in("tournament_id", activeTournamentIds)
          .in("status", ["pending", "confirmed"]);
        if (tournamentRegsFallbackError) throw tournamentRegsFallbackError;
        tournamentRegs = tournamentRegsFallback || [];
      } else {
        tournamentRegs = tournamentRegsWithTeammate || [];
      }

      for (const row of tournamentRegs) {
        if (row?.player_id) registeredPlayers.add(row.player_id);
        if (row?.teammate_player_id) registeredPlayers.add(row.teammate_player_id);
      }
    }

    const { data: activeLeagueRows, error: activeLeagueError } = await (supabase as any)
      .from("club_leagues")
      .select("id")
      .eq("club_id", clubId)
      .eq("status", "active");

    if (activeLeagueError) throw activeLeagueError;

    const activeLeagueIds = (activeLeagueRows || []).map((r: any) => r.id);
    if (activeLeagueIds.length > 0) {
      let leagueRegs: any[] = [];

      const { data: leagueRegsWithTeammate, error: leagueRegsWithTeammateError } = await (supabase as any)
        .from("league_registrations")
        .select("player_id,teammate_player_id,status")
        .in("league_id", activeLeagueIds)
        .in("status", ["pending", "confirmed"]);

      if (leagueRegsWithTeammateError) {
        const { data: leagueRegsFallback, error: leagueRegsFallbackError } = await (supabase as any)
          .from("league_registrations")
          .select("player_id,status")
          .in("league_id", activeLeagueIds)
          .in("status", ["pending", "confirmed"]);
        if (leagueRegsFallbackError) throw leagueRegsFallbackError;
        leagueRegs = leagueRegsFallback || [];
      } else {
        leagueRegs = leagueRegsWithTeammate || [];
      }

      for (const row of leagueRegs) {
        if (row?.player_id) registeredPlayers.add(row.player_id);
        if (row?.teammate_player_id) registeredPlayers.add(row.teammate_player_id);
      }
    }

    for (const [playerId, current] of byPlayer.entries()) {
      current.club_avg_matches_per_week_30d = Number((current.club_matches_last_30d / 4).toFixed(2));
      current.has_active_club_registration = registeredPlayers.has(playerId);
      current.is_club_player =
        current.club_matches_played > 0 ||
        current.club_bookings_count > 0 ||
        current.has_active_club_registration;
    }

    return Object.fromEntries(byPlayer.entries());
  }

  async getPublicPlayerData(playerId: string): Promise<any | null> {
    const supabase = await this.getServiceClient();
    const { data, error } = await supabase
      .from("players")
      .select("id, display_name, avatar_url, city, region_name, region_code, category, position, is_guest, user_id, deleted_at")
      .eq("id", playerId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    const row: any = data;
    if (!row) return null;

    return {
      id: row.id,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
      city: row.city,
      region_name: row.region_name,
      region_code: row.region_code,
      category: row.category,
      position: row.position,
      is_guest: row.is_guest,
      is_claimable: !row.user_id,
    };
  }

  async updatePlayerProfile(input: {
    player_id: string;
    display_name: string;
    position: "drive" | "reves" | "cualquiera";
    city?: string;
    city_id?: string;
    region_code?: string;
    region_name?: string;
    country_code?: string;
    avatar_url?: string;
  }): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_update_profile", {
      p_player_id: input.player_id,
      p_display_name: input.display_name,
      p_position: input.position,
      p_city: input.city,
      p_city_id: input.city_id,
      p_region_code: input.region_code,
      p_region_name: input.region_name,
      p_country_code: input.country_code || 'AR',
      p_avatar_url: input.avatar_url
    });

    if (error) throw error;
    return data;
  }

  async getProfileMetrics(playerId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc('player_get_profile_metrics', { p_player_id: playerId });
    if (error) throw error;
    return data;
  }

  async getPublicHeroStats(playerId: string) {
    const supabase = await this.getServiceClient();

    const defaultMetrics = {
      pasala_index: null,
      win_rate_score: 0,
      rival_level_score: 50,
      perf_score: 50,
      recent_score: 0,
      volume_score: 0,
      played: 0,
      wins: 0,
      win_rate: 0,
      current_streak: "-",
    };

    let metrics: any = defaultMetrics;
    let globalRank: { rank: number | null; total: number | null } = { rank: null, total: null };

    try {
      const { data } = await (supabase as any).rpc("player_get_profile_metrics", { p_player_id: playerId });
      if (data && typeof data === "object") {
        metrics = {
          ...defaultMetrics,
          ...data,
          current_streak: String((data as any).current_streak || "-"),
        };
      }
    } catch {
      // Keep safe defaults for public profile if RPC is unavailable
    }

    try {
      const { data } = await (supabase as any).rpc("get_player_global_ranking", { p_player_id: playerId });
      if (data && typeof data === "object") {
        globalRank = {
          rank: (data as any).rank ?? null,
          total: (data as any).total ?? null,
        };
      }
    } catch {
      // Keep null ranking when RPC is unavailable
    }

    return { metrics, globalRank };
  }

  async getCompetitiveStats() {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc('player_get_competitive_stats');
    if (error) throw error;
    return data?.[0] || null;
  }

  async completeOnboarding(input: {
    display_name: string;
    first_name: string;
    last_name: string;
    phone: string;
    position: "drive" | "reves" | "cualquiera";
    category: number;
    country_code?: string;
    region_code?: string;
    region_name?: string;
    city?: string;
    city_id?: string;
    birth_year?: number;
    avatar_url?: string;
  }): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_complete_onboarding", {
      p_display_name: input.display_name,
      p_first_name: input.first_name,
      p_last_name: input.last_name,
      p_phone: input.phone,
      p_position: input.position,
      p_category: input.category,
      p_country_code: input.country_code || 'AR',
      p_region_code: input.region_code,
      p_region_name: input.region_name,
      p_city: input.city,
      p_city_id: input.city_id,
      p_birth_year: input.birth_year,
      p_avatar_url: input.avatar_url
    });

    if (error) throw error;
    return data;
  }

  async findClaimCandidates(input: {
    first_name: string;
    last_name: string;
    city?: string;
    limit?: number;
  }): Promise<
    Array<{
      id: string;
      display_name: string;
      city: string | null;
      region_name: string | null;
      city_match: boolean;
    }>
  > {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_find_claim_candidates", {
      p_first_name: input.first_name,
      p_last_name: input.last_name,
      p_city: input.city || null,
      p_limit: input.limit ?? 5,
    });

    if (error) throw error;
    return (data || []) as Array<{
      id: string;
      display_name: string;
      city: string | null;
      region_name: string | null;
      city_match: boolean;
    }>;
  }
}
