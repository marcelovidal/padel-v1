import { createClient } from "@/lib/supabase/server";

import { Database } from "@/types/database";

export type LeagueRow = {
  id: string;
  club_id: string;
  name: string;
  season_label: string | null;
  description: string | null;
  status: "draft" | "active" | "finished";
  created_at: string;
  updated_at: string;
};

export type LeagueDivisionRow = {
  id: string;
  league_id: string;
  name: string;
  category_mode: "SINGLE" | "SUM" | "OPEN";
  category_value_int: number | null;
  allow_override: boolean;
  created_at: string;
  updated_at: string;
};

export type LeagueTeamRow = {
  id: string;
  division_id: string;
  player_id_a: string;
  player_id_b: string;
  entry_category_int: number | null;
  seed_strength: number | null;
  created_at: string;
  updated_at: string;
  player_a?: { id: string; display_name: string; category: number | null } | null;
  player_b?: { id: string; display_name: string; category: number | null } | null;
};

export type LeagueGroupRow = {
  id: string;
  division_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type LeagueMatchRow = {
  id: string;
  group_id: string;
  round_index: number;
  team_a_id: string;
  team_b_id: string;
  match_id: string;
  scheduled_at: string | null;
  court_id: string | null;
  created_at: string;
  updated_at: string;
};

export type LeaguePlayoffMatchRow = {
  id: string;
  division_id: string;
  stage: "quarterfinal" | "semifinal" | "final";
  stage_order: number;
  match_order: number;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_team_id: string | null;
  source_match_a_id: string | null;
  source_match_b_id: string | null;
  match_id: string;
  scheduled_at: string | null;
  court_id: string | null;
  created_at: string;
  updated_at: string;
};

export type GroupTableRow = {
  team_id: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  sets_won: number;
  sets_lost: number;
  last_match_at: string | null;
};

export type MyClubRankingRow = {
  club_id: string;
  club_name: string;
  points: number;
  rank: number;
  matches_played: number;
  wins: number;
  losses: number;
  last_match_at: string | null;
};

export class LeaguesRepository {
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

  async listClubLeagues(clubId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("club_leagues")
      .select("id,club_id,name,season_label,description,status,created_at,updated_at")
      .eq("club_id", clubId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []) as LeagueRow[];
  }

  async getLeagueById(leagueId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("club_leagues")
      .select("id,club_id,name,season_label,description,status,created_at,updated_at")
      .eq("id", leagueId)
      .maybeSingle();
    if (error) throw error;
    return (data || null) as LeagueRow | null;
  }

  async listDivisions(leagueId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("league_divisions")
      .select("id,league_id,name,category_mode,category_value_int,allow_override,created_at,updated_at")
      .eq("league_id", leagueId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as LeagueDivisionRow[];
  }

  async listTeams(divisionId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("league_teams")
      .select(
        "id,division_id,player_id_a,player_id_b,entry_category_int,seed_strength,created_at,updated_at,player_a:players!league_teams_player_id_a_fkey(id,display_name,category),player_b:players!league_teams_player_id_b_fkey(id,display_name,category)"
      )
      .eq("division_id", divisionId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as LeagueTeamRow[];
  }

  async listGroups(divisionId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("league_groups")
      .select("id,division_id,name,sort_order,created_at,updated_at")
      .eq("division_id", divisionId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data || []) as LeagueGroupRow[];
  }

  async listGroupTeams(groupId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("league_group_teams")
      .select("group_id,team_id,seed_order,league_teams(id,division_id,player_id_a,player_id_b)")
      .eq("group_id", groupId)
      .order("seed_order", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data || []) as any[];
  }

  async listLeagueMatches(leagueId: string) {
    // Service client required to read nested match_results for club management views.
    const supabase = await this.getServiceClient();
    const { data, error } = await (supabase as any)
      .from("league_matches")
      .select(
        "id,group_id,round_index,team_a_id,team_b_id,match_id,scheduled_at,court_id,created_at,updated_at,league_groups!inner(id,name,division_id,league_divisions!inner(id,league_id)),matches(id,match_at,status,match_results(match_id,sets,winner_team,recorded_at)),team_a:league_teams!league_matches_team_a_id_fkey(id,player_id_a,player_id_b),team_b:league_teams!league_matches_team_b_id_fkey(id,player_id_a,player_id_b),court:club_courts(id,name)"
      )
      .eq("league_groups.league_divisions.league_id", leagueId)
      .order("round_index", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as any[];
  }

  async listDivisionPlayoffMatches(divisionId: string) {
    const supabase = await this.getServiceClient();
    const { data, error } = await (supabase as any)
      .from("league_playoff_matches")
      .select(
        "id,division_id,stage,stage_order,match_order,team_a_id,team_b_id,winner_team_id,source_match_a_id,source_match_b_id,match_id,scheduled_at,court_id,created_at,updated_at,matches(id,match_at,status,match_results(match_id,sets,winner_team,recorded_at)),court:club_courts(id,name)"
      )
      .eq("division_id", divisionId)
      .order("stage_order", { ascending: true })
      .order("match_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as any[];
  }

  async createLeague(input: {
    club_id: string;
    name: string;
    season_label?: string;
    description?: string;
    status?: "draft" | "active" | "finished";
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_create_league", {
      p_club_id: input.club_id,
      p_name: input.name,
      p_season_label: input.season_label || null,
      p_description: input.description || null,
      p_status: input.status || "draft",
    });
    if (error) throw error;
    return data as string;
  }

  async createDivision(input: {
    league_id: string;
    name: string;
    category_mode: "SINGLE" | "SUM" | "OPEN";
    category_value_int?: number | null;
    allow_override?: boolean;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_create_league_division", {
      p_league_id: input.league_id,
      p_name: input.name,
      p_category_mode: input.category_mode,
      p_category_value_int:
        typeof input.category_value_int === "number" ? input.category_value_int : null,
      p_allow_override: !!input.allow_override,
    });
    if (error) throw error;
    return data as string;
  }

  async registerTeam(input: {
    division_id: string;
    player_id_a: string;
    player_id_b: string;
    entry_category_int?: number | null;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_register_league_team", {
      p_division_id: input.division_id,
      p_player_id_a: input.player_id_a,
      p_player_id_b: input.player_id_b,
      p_entry_category_int:
        typeof input.entry_category_int === "number" ? input.entry_category_int : null,
    });
    if (error) throw error;
    return data as string;
  }

  async updateLeagueStatus(leagueId: string, status: "draft" | "active" | "finished") {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("club_update_league_status", {
      p_league_id: leagueId,
      p_status: status,
    });
    if (error) throw error;
  }

  async removeTeam(teamId: string) {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("club_remove_league_team", {
      p_team_id: teamId,
    });
    if (error) throw error;
  }

  async autoCreateGroups(divisionId: string, groupCount?: number, targetSize?: number) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_auto_create_groups", {
      p_division_id: divisionId,
      p_group_count: typeof groupCount === "number" ? groupCount : null,
      p_target_size: typeof targetSize === "number" ? targetSize : 4,
    });
    if (error) throw error;
    return Number(data || 0);
  }

  async reopenDivisionFixtureForEdit(divisionId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_reopen_division_fixture_for_edit", {
      p_division_id: divisionId,
    });
    if (error) throw error;
    return (data || null) as {
      division_id: string;
      league_id: string;
      removed_matches: number;
      removed_bookings: number;
      removed_match_players: number;
      removed_results: number;
    } | null;
  }

  async assignTeamToGroup(groupId: string, teamId: string, seedOrder?: number | null) {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("club_assign_team_to_group", {
      p_group_id: groupId,
      p_team_id: teamId,
      p_seed_order: typeof seedOrder === "number" ? seedOrder : null,
    });
    if (error) throw error;
  }

  async generateGroupFixture(groupId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_generate_group_fixture", {
      p_group_id: groupId,
    });
    if (error) throw error;
    return Number(data || 0);
  }

  async scheduleLeagueMatch(input: {
    league_match_id: string;
    court_id: string;
    match_at: string;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_schedule_league_match", {
      p_league_match_id: input.league_match_id,
      p_court_id: input.court_id,
      p_match_at: input.match_at,
    });
    if (error) throw error;
    return data as {
      league_match_id: string;
      match_id: string;
      booking_id: string;
      scheduled_at: string;
      court_id: string;
    };
  }

  async submitLeagueMatchResult(input: {
    league_match_id: string;
    set1_a: number;
    set1_b: number;
    set2_a: number;
    set2_b: number;
    set3_a?: number | null;
    set3_b?: number | null;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_submit_league_match_result", {
      p_league_match_id: input.league_match_id,
      p_set1_a: input.set1_a,
      p_set1_b: input.set1_b,
      p_set2_a: input.set2_a,
      p_set2_b: input.set2_b,
      p_set3_a: input.set3_a ?? null,
      p_set3_b: input.set3_b ?? null,
    });
    if (error) throw error;
    return data as string;
  }

  async generateDivisionPlayoffs(divisionId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_generate_division_playoffs", {
      p_division_id: divisionId,
    });
    if (error) throw error;
    return Number(data || 0);
  }

  async schedulePlayoffMatch(input: {
    playoff_match_id: string;
    court_id: string;
    match_at: string;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_schedule_playoff_match", {
      p_playoff_match_id: input.playoff_match_id,
      p_court_id: input.court_id,
      p_match_at: input.match_at,
    });
    if (error) throw error;
    return data as {
      playoff_match_id: string;
      match_id: string;
      booking_id: string;
      scheduled_at: string;
      court_id: string;
    };
  }

  async submitPlayoffMatchResult(input: {
    playoff_match_id: string;
    set1_a: number;
    set1_b: number;
    set2_a: number;
    set2_b: number;
    set3_a?: number | null;
    set3_b?: number | null;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_submit_playoff_match_result", {
      p_playoff_match_id: input.playoff_match_id,
      p_set1_a: input.set1_a,
      p_set1_b: input.set1_b,
      p_set2_a: input.set2_a,
      p_set2_b: input.set2_b,
      p_set3_a: input.set3_a ?? null,
      p_set3_b: input.set3_b ?? null,
    });
    if (error) throw error;
    return data as string;
  }

  async getGroupTable(groupId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_get_group_table", {
      p_group_id: groupId,
    });
    if (error) throw error;
    return (data || []) as GroupTableRow[];
  }

  async listPublicClubLeagues(clubId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("club_leagues")
      .select("id,club_id,name,season_label,description,status,created_at,updated_at")
      .eq("club_id", clubId)
      .eq("status", "active")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []) as LeagueRow[];
  }

  async getMyClubRankings(limit: number = 5) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_get_my_club_rankings", {
      p_limit: limit,
    });
    if (error) throw error;
    return (data || []) as MyClubRankingRow[];
  }
}

