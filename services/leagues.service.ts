import { LeaguesRepository } from "@/repositories/leagues.repository";

export class LeaguesService {
  private repository: LeaguesRepository;

  constructor() {
    this.repository = new LeaguesRepository();
  }

  async listClubLeagues(clubId: string) {
    return this.repository.listClubLeagues(clubId);
  }

  async getLeagueById(leagueId: string) {
    return this.repository.getLeagueById(leagueId);
  }

  async listDivisions(leagueId: string) {
    return this.repository.listDivisions(leagueId);
  }

  async listTeams(divisionId: string) {
    return this.repository.listTeams(divisionId);
  }

  async listGroups(divisionId: string) {
    return this.repository.listGroups(divisionId);
  }

  async listGroupTeams(groupId: string) {
    return this.repository.listGroupTeams(groupId);
  }

  async listLeagueMatches(leagueId: string) {
    return this.repository.listLeagueMatches(leagueId);
  }

  async listDivisionPlayoffMatches(divisionId: string) {
    return this.repository.listDivisionPlayoffMatches(divisionId);
  }

  async createLeague(input: {
    club_id: string;
    name: string;
    season_label?: string;
    description?: string;
    status?: "draft" | "active" | "finished";
  }) {
    return this.repository.createLeague(input);
  }

  async updateLeagueStatus(leagueId: string, status: "draft" | "active" | "finished") {
    return this.repository.updateLeagueStatus(leagueId, status);
  }

  async createDivision(input: {
    league_id: string;
    name: string;
    category_mode: "SINGLE" | "SUM" | "OPEN";
    category_value_int?: number | null;
    allow_override?: boolean;
  }) {
    return this.repository.createDivision(input);
  }

  async getOrCreateDefaultDivision(leagueId: string): Promise<string> {
    const divisions = await this.repository.listDivisions(leagueId);
    if (divisions.length > 0) return (divisions[0] as any).id as string;
    return this.repository.createDivision({
      league_id: leagueId,
      name: "Principal",
      category_mode: "OPEN",
      allow_override: true,
    }) as Promise<string>;
  }

  async registerTeam(input: {
    division_id: string;
    player_id_a: string;
    player_id_b: string;
    entry_category_int?: number | null;
  }) {
    return this.repository.registerTeam(input);
  }

  async removeTeam(teamId: string) {
    return this.repository.removeTeam(teamId);
  }

  async autoCreateGroups(divisionId: string, groupCount?: number, targetSize?: number) {
    return this.repository.autoCreateGroups(divisionId, groupCount, targetSize);
  }

  async reopenDivisionFixtureForEdit(divisionId: string) {
    return this.repository.reopenDivisionFixtureForEdit(divisionId);
  }

  async assignTeamToGroup(groupId: string, teamId: string, seedOrder?: number | null) {
    return this.repository.assignTeamToGroup(groupId, teamId, seedOrder);
  }

  async generateGroupFixture(groupId: string) {
    return this.repository.generateGroupFixture(groupId);
  }

  async scheduleLeagueMatch(input: {
    league_match_id: string;
    court_id: string;
    match_at: string;
  }) {
    return this.repository.scheduleLeagueMatch(input);
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
    return this.repository.submitLeagueMatchResult(input);
  }

  async generateDivisionPlayoffs(divisionId: string) {
    return this.repository.generateDivisionPlayoffs(divisionId);
  }

  async schedulePlayoffMatch(input: {
    playoff_match_id: string;
    court_id: string;
    match_at: string;
  }) {
    return this.repository.schedulePlayoffMatch(input);
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
    return this.repository.submitPlayoffMatchResult(input);
  }

  async getGroupTable(groupId: string) {
    return this.repository.getGroupTable(groupId);
  }

  async listPublicClubLeagues(clubId: string) {
    return this.repository.listPublicClubLeagues(clubId);
  }

  async getMyClubRankings(limit: number = 5) {
    return this.repository.getMyClubRankings(limit);
  }
}

