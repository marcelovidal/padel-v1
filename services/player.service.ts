import { PlayerRepository } from "@/repositories/player.repository";
import { CreatePlayerInput, UpdatePlayerInput } from "@/schemas/player.schema";
import { MatchRepository } from "@/repositories/match.repository";
import { AssessmentRepository } from "@/repositories/assessment.repository";
import { createClient } from "@/lib/supabase/server";

export class PlayerService {
  private repository: PlayerRepository;

  constructor() {
    this.repository = new PlayerRepository();
    this.matchRepository = new MatchRepository();
    this.assessmentRepository = new AssessmentRepository();
  }

  private matchRepository: MatchRepository;
  private assessmentRepository: AssessmentRepository;

  async getPlayerMatchSummary(playerId: string) {
    const matches = await this.matchRepository.findByPlayerId(playerId);
    let wins = 0;
    let losses = 0;
    let totalWithResult = 0;

    for (const m of matches) {
      if (m.match_results && m.match_results.winner_team) {
        totalWithResult++;
        if (m.match_results.winner_team === m.team) wins++;
        else losses++;
      }
    }

    return { wins, losses, totalWithResult };
  }

  async getPlayerShotAverages(playerId: string) {
    const assessments = await this.assessmentRepository.findByPlayer(playerId);
    const fields = [
      'volea', 'globo', 'remate', 'bandeja', 'vibora', 'bajada_pared', 'saque', 'recepcion_saque'
    ];
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    for (const f of fields) { sums[f] = 0; counts[f] = 0; }

    for (const a of assessments) {
      for (const f of fields) {
        const v = (a as any)[f];
        if (v !== null && v !== undefined) {
          sums[f] += Number(v);
          counts[f] += 1;
        }
      }
    }

    const averages: Record<string, number | null> = {};
    for (const f of fields) {
      averages[f] = counts[f] > 0 ? Number((sums[f] / counts[f]).toFixed(1)) : null;
    }
    return averages;
  }

  async getPlayerMatches(playerId: string) {
    const matches = await this.matchRepository.findByPlayerId(playerId);
    const assessments = await this.assessmentRepository.findByPlayer(playerId);
    const assessmentsMap = new Map(assessments.map((a) => [a.match_id, a]));
    // (debug logs removed)
    function formatSets(sets: any): string | null {
      if (!sets) return null;
      if (!Array.isArray(sets)) return null;
      try {
        return sets
          .map((s: any) => {
            const a = s.a ?? s.A ?? s.teamA ?? s[0];
            const b = s.b ?? s.B ?? s.teamB ?? s[1];
            return `${a ?? ""}-${b ?? ""}`;
          })
          .join(", ");
      } catch (e) {
        return null;
      }
    }

    const mapped = matches.map((m) => {
      const team = (m as any).team as any;
      const matchResults = (m as any).match_results ?? null;
      const winner_team = matchResults ? matchResults.winner_team : null;
      const setsFormatted = matchResults ? formatSets(matchResults.sets) : null;
      const winnerLabel = winner_team == null ? "-" : winner_team === team ? "Sí" : "No";
      const playersByTeam = (m as any).playersByTeam ?? { A: [], B: [] };
      const setsRaw = matchResults ? matchResults.sets : null;

      return {
        id: m.id,
        match_at: m.match_at,
        club_name: m.club_name,
        status: m.status,
        team,
        winner_team: winner_team as any,
        sets: setsRaw,
        setsFormatted: setsFormatted ?? "-",
        winnerLabel,
        playersByTeam,
        hasAssessment: assessmentsMap.has(m.id),
      };
    });

    // (debug logs removed)

    return mapped;
  }

  async getAllPlayers() {
    return this.repository.findAll();
  }

  async getPlayerById(id: string) {
    return this.repository.findById(id);
  }

  async searchPlayers(query: string) {
    if (!query.trim()) {
      return this.repository.findAll();
    }
    return this.repository.search(query);
  }

  async createPlayer(input: CreatePlayerInput) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    // Validar que email sea único si se proporciona
    if (input.email) {
      const existing = await this.repository.search(input.email);
      const emailExists = existing.some(
        (p) => p.email?.toLowerCase() === input.email?.toLowerCase()
      );
      if (emailExists) {
        throw new Error("El email ya está en uso");
      }
    }

    // Validar que phone sea único
    const existingByPhone = await this.repository.search(input.phone);
    const phoneExists = existingByPhone.some(
      (p) => p.phone === input.phone
    );
    if (phoneExists) {
      throw new Error("El teléfono ya está en uso");
    }

    const displayName = `${input.first_name} ${input.last_name}`.trim();

    return this.repository.create({
      ...input,
      display_name: displayName,
      normalized_name: displayName.toLowerCase(),
      created_by: user.id,
      is_guest: false
    } as any);
  }

  async updatePlayer(input: UpdatePlayerInput) {
    const { id, ...updates } = input;

    // Validar unicidad de email si se actualiza
    if (updates.email) {
      const existing = await this.repository.search(updates.email);
      const emailExists = existing.some(
        (p) => p.id !== id && p.email?.toLowerCase() === updates.email?.toLowerCase()
      );
      if (emailExists) {
        throw new Error("El email ya está en uso");
      }
    }

    // Validar unicidad de phone si se actualiza
    if (updates.phone) {
      const existing = await this.repository.search(updates.phone);
      const phoneExists = existing.some(
        (p) => p.id !== id && p.phone === updates.phone
      );
      if (phoneExists) {
        throw new Error("El teléfono ya está en uso");
      }
    }

    return this.repository.update(id, updates);
  }

  async deactivatePlayer(id: string) {
    return this.repository.deactivate(id);
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
    country_code?: string;
  }) {
    return this.repository.createGuestPlayer(input);
  }

  async findSimilarPlayers(query: string) {
    return this.repository.findSimilarPlayers(query);
  }

  async claimProfile(playerId: string) {
    return this.repository.claimProfile(playerId);
  }

  async claimProfileV2(targetPlayerId: string, matchId?: string) {
    return this.repository.claimProfileV2(targetPlayerId, matchId);
  }

  async searchPlayersWeighted(query: string, limit?: number) {
    return this.repository.searchPlayersWeighted(query, limit);
  }

  private getPlayerLevel(pasalaIndex: number | null): "ROOKIE" | "AMATEUR" | "COMPETITIVO" | "PRO" | "ELITE" {
    const score = Number(pasalaIndex ?? 0);
    if (score >= 85) return "ELITE";
    if (score >= 70) return "PRO";
    if (score >= 55) return "COMPETITIVO";
    if (score >= 40) return "AMATEUR";
    return "ROOKIE";
  }

  private getActivityLevel(played: number, matchesLast30d: number):
    | "muy_activo"
    | "activo"
    | "ocasional"
    | "inactivo"
    | "nuevo" {
    if (played < 5) return "nuevo";
    if (matchesLast30d >= 12) return "muy_activo";
    if (matchesLast30d >= 4) return "activo";
    if (matchesLast30d >= 1) return "ocasional";
    return "inactivo";
  }

  private mapActivityFilter(value?: string) {
    const normalized = (value || "").trim().toLowerCase();
    if (!normalized) return null;
    if (normalized === "hot" || normalized === "muy_activo") return "muy_activo";
    if (normalized === "active" || normalized === "activo") return "activo";
    if (normalized === "occasional" || normalized === "ocasional") return "ocasional";
    if (normalized === "new" || normalized === "nuevo") return "nuevo";
    if (normalized === "inactive" || normalized === "inactivo") return "inactivo";
    return null;
  }

  private sortDirectoryRows(rows: any[], orderBy?: string) {
    const sorted = [...rows];
    const sortKey = (orderBy || "relevance").trim().toLowerCase();

    sorted.sort((a: any, b: any) => {
      if (a.is_same_city !== b.is_same_city) return a.is_same_city ? -1 : 1;

      if (sortKey === "name_asc") {
        return String(a.display_name || "").localeCompare(String(b.display_name || ""), "es");
      }
      if (sortKey === "played_desc") {
        return Number(b.played || 0) - Number(a.played || 0);
      }
      if (sortKey === "win_rate_desc") {
        return Number(b.win_rate || 0) - Number(a.win_rate || 0);
      }
      if (sortKey === "recent") {
        const recentDiff = Number(b.matches_last_30d || 0) - Number(a.matches_last_30d || 0);
        if (recentDiff !== 0) return recentDiff;

        const aTime = a.last_match_at ? new Date(a.last_match_at).getTime() : 0;
        const bTime = b.last_match_at ? new Date(b.last_match_at).getTime() : 0;
        return bTime - aTime;
      }
      if (sortKey === "index_desc" || sortKey === "pasala_desc") {
        return Number(b.pasala_index || 0) - Number(a.pasala_index || 0);
      }

      const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return Number(b.pasala_index || 0) - Number(a.pasala_index || 0);
    });

    return sorted;
  }

  private async buildPlayersDirectoryRows(query: string, viewerCityId?: string | null, limit = 50) {
    const players = await this.repository.searchPlayersWeighted(query, limit);
    if (players.length === 0) return [];

    const playerIds = players.map((p: any) => p.id);
    const activityByPlayer = await this.repository.getPlayersActivitySnapshot(playerIds);

    const metricsRows = await Promise.all(
      playerIds.map(async (playerId) => {
        try {
          const metrics = await this.repository.getProfileMetrics(playerId);
          return [playerId, metrics] as const;
        } catch {
          return [playerId, null] as const;
        }
      })
    );

    const metricsByPlayer = new Map(metricsRows);

    return players.map((p: any) => {
      const activity = activityByPlayer[p.id] ?? {
        played: 0,
        matches_last_30d: 0,
        last_match_at: null,
        avg_matches_per_week_30d: 0,
      };

      const metrics: any = metricsByPlayer.get(p.id) || {};
      const pasalaIndex =
        metrics?.pasala_index == null ? null : Number(metrics.pasala_index);
      const winRate = Number(metrics?.win_rate ?? 0);
      const played = Number(activity.played ?? metrics?.played ?? 0);
      const streak = String(metrics?.current_streak || "-");
      const level = this.getPlayerLevel(pasalaIndex);
      const activityLevel = this.getActivityLevel(played, Number(activity.matches_last_30d || 0));

      return {
        ...p,
        pasala_index: pasalaIndex,
        level,
        win_rate: Number.isFinite(winRate) ? Number(winRate.toFixed(1)) : 0,
        played,
        current_streak: streak,
        matches_last_30d: Number(activity.matches_last_30d || 0),
        avg_matches_per_week_30d: Number(activity.avg_matches_per_week_30d || 0),
        last_match_at: activity.last_match_at,
        activity_level: activityLevel,
        activity_badge:
          activityLevel === "muy_activo"
            ? "hot"
            : activityLevel === "activo"
              ? "active"
              : activityLevel === "ocasional"
                ? "occasional"
                : activityLevel === "nuevo"
                  ? "new"
                  : "inactive",
        is_same_city: !!(viewerCityId && p.city_id && p.city_id === viewerCityId),
      };
    });
  }

  async getPlayersDirectory(query: string, viewerCityId?: string | null): Promise<any[]>;
  async getPlayersDirectory(params: {
    viewerCityId?: string | null;
    query?: string;
    category?: number | string | null;
    activity?: string;
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; players: any[] }>;
  async getPlayersDirectory(
    queryOrParams:
      | string
      | {
          viewerCityId?: string | null;
          query?: string;
          category?: number | string | null;
          activity?: string;
          orderBy?: string;
          limit?: number;
          offset?: number;
        },
    viewerCityId?: string | null
  ) {
    if (typeof queryOrParams === "string") {
      return this.buildPlayersDirectoryRows(queryOrParams, viewerCityId, 50);
    }

    const params = queryOrParams || {};
    const rows = await this.buildPlayersDirectoryRows(
      params.query ?? "",
      params.viewerCityId ?? null,
      200
    );

    const categoryFilter =
      params.category == null || params.category === ""
        ? null
        : Number(params.category);
    const activityFilter = this.mapActivityFilter(params.activity);

    const filtered = rows.filter((row: any) => {
      if (categoryFilter != null && Number(row.category || 0) !== categoryFilter) return false;
      if (activityFilter && row.activity_level !== activityFilter) return false;
      return true;
    });

    const sorted = this.sortDirectoryRows(filtered, params.orderBy);
    const total = sorted.length;

    const offset = Math.max(0, Number(params.offset ?? 0));
    const rawLimit = Number(params.limit ?? 24);
    const limit = Math.min(200, Math.max(1, rawLimit));
    const paged = sorted.slice(offset, offset + limit);

    return {
      total,
      players: paged,
    };
  }

  async getClubPlayersDirectory(params: {
    clubId: string;
    query?: string;
    category?: number | string | null;
    account?: "all" | "linked" | "guest";
    activity?: string;
    clubScope?: "all" | "club" | "external";
    registration?: "all" | "registered" | "unregistered";
    orderBy?:
      | "relevance"
      | "name_asc"
      | "name_desc"
      | "category_desc"
      | "category_asc"
      | "index_desc"
      | "win_rate_desc"
      | "played_desc"
      | "last_match_desc"
      | "bookings_desc"
      | "club_activity_desc";
    limit?: number;
    offset?: number;
  }) {
    const baseRows = await this.buildPlayersDirectoryRows(params.query ?? "", null, 200);
    if (baseRows.length === 0) return { total: 0, players: [] as any[] };

    const playerIds = baseRows.map((row: any) => row.id);
    const clubSignals = await this.repository.getClubPlayerSignals(params.clubId, playerIds);

    const enrichedRows = baseRows.map((row: any) => {
      const signal = clubSignals[row.id] ?? {
        club_matches_played: 0,
        club_matches_last_30d: 0,
        last_club_match_at: null,
        club_avg_matches_per_week_30d: 0,
        club_bookings_count: 0,
        has_active_club_registration: false,
        is_club_player: false,
      };

      return {
        ...row,
        ...signal,
      };
    });

    const categoryFilter =
      params.category == null || params.category === ""
        ? null
        : Number(params.category);
    const activityFilter = this.mapActivityFilter(params.activity);
    const accountFilter = params.account || "all";
    const clubScope = params.clubScope || "all";
    const registrationFilter = params.registration || "all";

    const filtered = enrichedRows.filter((row: any) => {
      if (categoryFilter != null && Number(row.category || 0) !== categoryFilter) return false;
      if (activityFilter && row.activity_level !== activityFilter) return false;

      if (accountFilter === "guest" && row.user_id !== null) return false;
      if (accountFilter === "linked" && row.user_id === null) return false;

      if (clubScope === "club" && !row.is_club_player) return false;
      if (clubScope === "external" && row.is_club_player) return false;

      if (registrationFilter === "registered" && !row.has_active_club_registration) return false;
      if (registrationFilter === "unregistered" && row.has_active_club_registration) return false;

      return true;
    });

    const sortKey = (params.orderBy || "relevance").trim().toLowerCase();
    filtered.sort((a: any, b: any) => {
      if (sortKey === "name_asc") {
        return String(a.display_name || "").localeCompare(String(b.display_name || ""), "es");
      }
      if (sortKey === "name_desc") {
        return String(b.display_name || "").localeCompare(String(a.display_name || ""), "es");
      }
      if (sortKey === "category_desc") {
        return Number(b.category || 0) - Number(a.category || 0);
      }
      if (sortKey === "category_asc") {
        return Number(a.category || 0) - Number(b.category || 0);
      }
      if (sortKey === "index_desc") {
        return Number(b.pasala_index || 0) - Number(a.pasala_index || 0);
      }
      if (sortKey === "win_rate_desc") {
        return Number(b.win_rate || 0) - Number(a.win_rate || 0);
      }
      if (sortKey === "played_desc") {
        return Number(b.played || 0) - Number(a.played || 0);
      }
      if (sortKey === "last_match_desc") {
        const aTime = a.last_club_match_at ? new Date(a.last_club_match_at).getTime() : 0;
        const bTime = b.last_club_match_at ? new Date(b.last_club_match_at).getTime() : 0;
        return bTime - aTime;
      }
      if (sortKey === "bookings_desc") {
        return Number(b.club_bookings_count || 0) - Number(a.club_bookings_count || 0);
      }
      if (sortKey === "club_activity_desc") {
        return Number(b.club_matches_last_30d || 0) - Number(a.club_matches_last_30d || 0);
      }

      if (a.is_club_player !== b.is_club_player) return a.is_club_player ? -1 : 1;
      return Number(b.score || 0) - Number(a.score || 0);
    });

    const total = filtered.length;
    const offset = Math.max(0, Number(params.offset ?? 0));
    const limit = Math.min(200, Math.max(1, Number(params.limit ?? 80)));

    return {
      total,
      players: filtered.slice(offset, offset + limit),
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
    phone?: string;
    email?: string;
    category?: number;
    birth_year?: number;
  }) {
    return this.repository.updatePlayerProfile(input);
  }

  async getProfileMetrics(playerId: string) {
    return this.repository.getProfileMetrics(playerId);
  }

  async getPublicHeroStats(playerId: string) {
    return this.repository.getPublicHeroStats(playerId);
  }

  async getCompetitiveStats() {
    return this.repository.getCompetitiveStats();
  }

  async getGlobalRanking(playerId: string) {
    return this.repository.getGlobalRanking(playerId);
  }

  async getTopRivals(playerId: string, limit = 5) {
    return this.repository.getTopRivals(playerId, limit);
  }

  async getIndexHistory(playerId: string, limit = 30) {
    return this.repository.getIndexHistory(playerId, limit);
  }

  async getPlayerBadges(playerId: string) {
    return this.repository.getPlayerBadges(playerId);
  }

  async getPlayerByUserId(userId: string) {
    return this.repository.findByUserId(userId);
  }

  async getPublicPlayerData(playerId: string) {
    return this.repository.getPublicPlayerData(playerId);
  }

  async completeOnboarding(input: any) {
    return this.repository.completeOnboarding(input);
  }

  async findClaimCandidates(input: {
    first_name: string;
    last_name: string;
    city?: string;
    limit?: number;
  }) {
    return this.repository.findClaimCandidates(input);
  }

  async uploadAvatar(file: File, userId: string) {
    const supabase = await createClient();
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError, data } = await supabase.storage
      .from('avatars')
      .upload(fileName, file);

    if (uploadError) throw uploadError;
    return data.path;
  }

  async getAvatarUrl(path: string) {
    if (!path) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(path, 3600);

    if (error) return null;
    return data.signedUrl;
  }

}
