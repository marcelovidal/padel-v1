import {
  RegistrationsRepository,
  OpenEvent,
  RegistrationRow,
  PhoneCandidate,
  PublicRegistrationInput,
  PublicRegistrationResult,
} from "@/repositories/registrations.repository";

export type {
  OpenEvent,
  RegistrationRow,
  PhoneCandidate,
  PublicRegistrationInput,
  PublicRegistrationResult,
};

export class RegistrationsService {
  private repo = new RegistrationsRepository();

  async getOpenEvents(): Promise<OpenEvent[]> {
    return this.repo.getOpenEvents();
  }

  // ─── Inscripcion publica, sin cuenta ──────────────────────────────────────

  async findPlayersByPhone(phone: string): Promise<PhoneCandidate[]> {
    return this.repo.findPlayersByPhone(phone);
  }

  async requestPublicRegistration(
    kind: "tournament" | "league",
    eventId: string,
    input: PublicRegistrationInput
  ): Promise<PublicRegistrationResult> {
    return kind === "tournament"
      ? this.repo.requestPublicTournamentRegistration(eventId, input)
      : this.repo.requestPublicLeagueRegistration(eventId, input);
  }

  async countPlayersInCities(cityIds: string[]): Promise<number> {
    return this.repo.countPlayersInCities(cityIds);
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
