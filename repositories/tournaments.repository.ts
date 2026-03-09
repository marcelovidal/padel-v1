import { createClient } from "@/lib/supabase/server";

export type TournamentRow = {
  id: string;
  club_id: string;
  name: string;
  season_label: string | null;
  description: string | null;
  status: "draft" | "active" | "finished";
  target_category_int: number;
  allow_lower_category: boolean;
  created_at: string;
  updated_at: string;
};

export type TournamentTeamRow = {
  id: string;
  tournament_id: string;
  player_id_a: string;
  player_id_b: string;
  entry_category_int: number | null;
  created_at: string;
  updated_at: string;
  player_a?: { id: string; display_name: string; category: number | null } | null;
  player_b?: { id: string; display_name: string; category: number | null } | null;
};

export type TournamentGroupRow = {
  id: string;
  tournament_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TournamentPlayoffMatchRow = {
  id: string;
  tournament_id: string;
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

export type TournamentGroupTableRow = {
  team_id: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  sets_won: number;
  sets_lost: number;
  last_match_at: string | null;
};

export class TournamentsRepository {
  private async getClient() {
    return await createClient();
  }

  private async getServiceClient() {
    const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
    return createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async listClubTournaments(clubId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("club_tournaments")
      .select("id,club_id,name,season_label,description,status,target_category_int,allow_lower_category,created_at,updated_at")
      .eq("club_id", clubId)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data || []) as TournamentRow[];
  }

  async getTournamentById(tournamentId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("club_tournaments")
      .select("id,club_id,name,season_label,description,status,target_category_int,allow_lower_category,start_date,end_date,target_city_ids,created_at,updated_at")
      .eq("id", tournamentId)
      .maybeSingle();
    if (error) throw error;
    return (data || null) as TournamentRow | null;
  }

  async listTeams(tournamentId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("tournament_teams")
      .select(
        "id,tournament_id,player_id_a,player_id_b,entry_category_int,created_at,updated_at,player_a:players!tournament_teams_player_id_a_fkey(id,display_name,category),player_b:players!tournament_teams_player_id_b_fkey(id,display_name,category)"
      )
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as TournamentTeamRow[];
  }

  async listGroups(tournamentId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("tournament_groups")
      .select("id,tournament_id,name,sort_order,created_at,updated_at")
      .eq("tournament_id", tournamentId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data || []) as TournamentGroupRow[];
  }

  async listGroupTeams(groupId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("tournament_group_teams")
      .select("group_id,team_id,seed_order,tournament_teams(id,tournament_id,player_id_a,player_id_b)")
      .eq("group_id", groupId)
      .order("seed_order", { ascending: true, nullsFirst: false });
    if (error) throw error;
    return (data || []) as any[];
  }

  async listTournamentMatches(tournamentId: string) {
    const supabase = await this.getServiceClient();
    const { data, error } = await (supabase as any)
      .from("tournament_matches")
      .select(
        "id,group_id,round_index,team_a_id,team_b_id,match_id,scheduled_at,court_id,created_at,updated_at,tournament_groups!inner(id,name,tournament_id),matches(id,match_at,status,match_results(match_id,sets,winner_team,recorded_at)),team_a:tournament_teams!tournament_matches_team_a_id_fkey(id,player_id_a,player_id_b),team_b:tournament_teams!tournament_matches_team_b_id_fkey(id,player_id_a,player_id_b),court:club_courts(id,name)"
      )
      .eq("tournament_groups.tournament_id", tournamentId)
      .order("round_index", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as any[];
  }

  async listTournamentPlayoffMatches(tournamentId: string) {
    const supabase = await this.getServiceClient();
    const { data, error } = await (supabase as any)
      .from("tournament_playoff_matches")
      .select(
        "id,tournament_id,stage,stage_order,match_order,team_a_id,team_b_id,winner_team_id,source_match_a_id,source_match_b_id,match_id,scheduled_at,court_id,created_at,updated_at,matches(id,match_at,status,match_results(match_id,sets,winner_team,recorded_at)),court:club_courts(id,name)"
      )
      .eq("tournament_id", tournamentId)
      .order("stage_order", { ascending: true })
      .order("match_order", { ascending: true });
    if (error) throw error;
    return (data || []) as TournamentPlayoffMatchRow[];
  }

  async createTournament(input: {
    club_id: string;
    name: string;
    target_category_int: number;
    allow_lower_category?: boolean;
    season_label?: string;
    description?: string;
    status?: "draft" | "active" | "finished";
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_create_tournament", {
      p_club_id: input.club_id,
      p_name: input.name,
      p_target_category_int: input.target_category_int,
      p_allow_lower_category: input.allow_lower_category ?? false,
      p_season_label: input.season_label || null,
      p_description: input.description || null,
      p_status: input.status || "draft",
    });
    if (error) throw error;
    return data as string;
  }

  async updateTournamentStatus(tournamentId: string, status: "draft" | "active" | "finished") {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("club_update_tournament_status", {
      p_tournament_id: tournamentId,
      p_status: status,
    });
    if (error) throw error;
  }

  async registerTeam(input: {
    tournament_id: string;
    player_id_a: string;
    player_id_b: string;
    entry_category_int?: number | null;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_register_tournament_team", {
      p_tournament_id: input.tournament_id,
      p_player_id_a: input.player_id_a,
      p_player_id_b: input.player_id_b,
      p_entry_category_int: typeof input.entry_category_int === "number" ? input.entry_category_int : null,
    });
    if (error) throw error;
    return data as string;
  }

  async removeTeam(teamId: string) {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("club_remove_tournament_team", {
      p_team_id: teamId,
    });
    if (error) throw error;
  }

  async autoCreateGroups(tournamentId: string, groupCount?: number, targetSize?: number) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_auto_create_tournament_groups", {
      p_tournament_id: tournamentId,
      p_group_count: typeof groupCount === "number" ? groupCount : null,
      p_target_size: typeof targetSize === "number" ? targetSize : 4,
    });
    if (error) throw error;
    return Number(data || 0);
  }

  async assignTeamToGroup(groupId: string, teamId: string, seedOrder?: number | null) {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("club_assign_tournament_team_to_group", {
      p_group_id: groupId,
      p_team_id: teamId,
      p_seed_order: typeof seedOrder === "number" ? seedOrder : null,
    });
    if (error) throw error;
  }

  async generateGroupFixture(groupId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_generate_tournament_group_fixture", {
      p_group_id: groupId,
    });
    if (error) throw error;
    return Number(data || 0);
  }

  async reopenFixtureForEdit(tournamentId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_reopen_tournament_fixture_for_edit", {
      p_tournament_id: tournamentId,
    });
    if (error) throw error;
    return (data || null) as {
      tournament_id: string;
      removed_matches: number;
      removed_bookings: number;
      removed_match_players: number;
      removed_results: number;
    } | null;
  }

  async scheduleTournamentMatch(input: {
    tournament_match_id: string;
    court_id: string;
    match_at: string;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_schedule_tournament_match", {
      p_tournament_match_id: input.tournament_match_id,
      p_court_id: input.court_id,
      p_match_at: input.match_at,
    });
    if (error) throw error;
    return data as { tournament_match_id: string; match_id: string; booking_id: string; scheduled_at: string; court_id: string };
  }

  async submitTournamentMatchResult(input: {
    tournament_match_id: string;
    set1_a: number; set1_b: number;
    set2_a: number; set2_b: number;
    set3_a?: number | null; set3_b?: number | null;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_submit_tournament_match_result", {
      p_tournament_match_id: input.tournament_match_id,
      p_set1_a: input.set1_a, p_set1_b: input.set1_b,
      p_set2_a: input.set2_a, p_set2_b: input.set2_b,
      p_set3_a: input.set3_a ?? null, p_set3_b: input.set3_b ?? null,
    });
    if (error) throw error;
    return data as string;
  }

  async generatePlayoffs(tournamentId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_generate_tournament_playoffs", {
      p_tournament_id: tournamentId,
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
    const { data, error } = await (supabase as any).rpc("club_schedule_tournament_playoff_match", {
      p_playoff_match_id: input.playoff_match_id,
      p_court_id: input.court_id,
      p_match_at: input.match_at,
    });
    if (error) throw error;
    return data as { playoff_match_id: string; match_id: string; booking_id: string; scheduled_at: string; court_id: string };
  }

  async submitPlayoffMatchResult(input: {
    playoff_match_id: string;
    set1_a: number; set1_b: number;
    set2_a: number; set2_b: number;
    set3_a?: number | null; set3_b?: number | null;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_submit_tournament_playoff_match_result", {
      p_playoff_match_id: input.playoff_match_id,
      p_set1_a: input.set1_a, p_set1_b: input.set1_b,
      p_set2_a: input.set2_a, p_set2_b: input.set2_b,
      p_set3_a: input.set3_a ?? null, p_set3_b: input.set3_b ?? null,
    });
    if (error) throw error;
    return data as string;
  }

  async getGroupTable(groupId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_get_tournament_group_table", {
      p_group_id: groupId,
    });
    if (error) throw error;
    return (data || []) as TournamentGroupTableRow[];
  }
}
