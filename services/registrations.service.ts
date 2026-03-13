import { RegistrationsRepository, OpenEvent, RegistrationRow } from "@/repositories/registrations.repository";

export type { OpenEvent, RegistrationRow };

export class RegistrationsService {
  private repo = new RegistrationsRepository();

  async getOpenEvents(): Promise<OpenEvent[]> {
    return this.repo.getOpenEvents();
  }

  async requestTournamentRegistration(tournamentId: string, teammatePlayerId?: string): Promise<string> {
    return this.repo.requestTournamentRegistration(tournamentId, teammatePlayerId);
  }

  async requestLeagueRegistration(leagueId: string, teammatePlayerId?: string): Promise<string> {
    return this.repo.requestLeagueRegistration(leagueId, teammatePlayerId);
  }

  async getTournamentRegistrations(tournamentId: string): Promise<RegistrationRow[]> {
    return this.repo.getTournamentRegistrations(tournamentId);
  }

  async getLeagueRegistrations(leagueId: string): Promise<RegistrationRow[]> {
    return this.repo.getLeagueRegistrations(leagueId);
  }

  async resolveTournamentRegistration(registrationId: string, status: "confirmed" | "rejected"): Promise<void> {
    return this.repo.resolveTournamentRegistration(registrationId, status);
  }

  async resolveLeagueRegistration(registrationId: string, status: "confirmed" | "rejected"): Promise<void> {
    return this.repo.resolveLeagueRegistration(registrationId, status);
  }

  async updateTournamentInfo(input: {
    tournament_id: string;
    start_date?: string | null;
    end_date?: string | null;
    target_city_ids?: string[];
  }): Promise<void> {
    return this.repo.updateTournamentInfo(input);
  }

  async updateLeagueInfo(input: {
    league_id: string;
    start_date?: string | null;
    end_date?: string | null;
    target_city_ids?: string[];
  }): Promise<void> {
    return this.repo.updateLeagueInfo(input);
  }
}
