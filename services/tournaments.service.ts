import { TournamentsRepository } from "@/repositories/tournaments.repository";

export class TournamentsService {
  private repository: TournamentsRepository;

  constructor() {
    this.repository = new TournamentsRepository();
  }

  async listClubTournaments(clubId: string) {
    return this.repository.listClubTournaments(clubId);
  }

  async getTournamentById(tournamentId: string) {
    return this.repository.getTournamentById(tournamentId);
  }

  async listTeams(tournamentId: string) {
    return this.repository.listTeams(tournamentId);
  }

  async listGroups(tournamentId: string) {
    return this.repository.listGroups(tournamentId);
  }

  async listGroupTeams(groupId: string) {
    return this.repository.listGroupTeams(groupId);
  }

  async listTournamentMatches(tournamentId: string) {
    return this.repository.listTournamentMatches(tournamentId);
  }

  async listTournamentPlayoffMatches(tournamentId: string) {
    return this.repository.listTournamentPlayoffMatches(tournamentId);
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
    return this.repository.createTournament(input);
  }

  async updateTournamentStatus(tournamentId: string, status: "draft" | "active" | "finished") {
    return this.repository.updateTournamentStatus(tournamentId, status);
  }

  async registerTeam(input: {
    tournament_id: string;
    player_id_a: string;
    player_id_b: string;
    entry_category_int?: number | null;
  }) {
    return this.repository.registerTeam(input);
  }

  async removeTeam(teamId: string) {
    return this.repository.removeTeam(teamId);
  }

  async autoCreateGroups(tournamentId: string, groupCount?: number, targetSize?: number) {
    return this.repository.autoCreateGroups(tournamentId, groupCount, targetSize);
  }

  async assignTeamToGroup(groupId: string, teamId: string, seedOrder?: number | null) {
    return this.repository.assignTeamToGroup(groupId, teamId, seedOrder);
  }

  async generateGroupFixture(groupId: string) {
    return this.repository.generateGroupFixture(groupId);
  }

  async reopenFixtureForEdit(tournamentId: string) {
    return this.repository.reopenFixtureForEdit(tournamentId);
  }

  async scheduleTournamentMatch(input: {
    tournament_match_id: string;
    court_id: string;
    match_at: string;
  }) {
    return this.repository.scheduleTournamentMatch(input);
  }

  async submitTournamentMatchResult(input: {
    tournament_match_id: string;
    set1_a: number; set1_b: number;
    set2_a: number; set2_b: number;
    set3_a?: number | null; set3_b?: number | null;
  }) {
    return this.repository.submitTournamentMatchResult(input);
  }

  async generatePlayoffs(tournamentId: string) {
    return this.repository.generatePlayoffs(tournamentId);
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
    set1_a: number; set1_b: number;
    set2_a: number; set2_b: number;
    set3_a?: number | null; set3_b?: number | null;
  }) {
    return this.repository.submitPlayoffMatchResult(input);
  }

  async getGroupTable(groupId: string) {
    return this.repository.getGroupTable(groupId);
  }
}
