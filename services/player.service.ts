import { PlayerRepository } from "@/repositories/player.repository";
import { CreatePlayerInput, UpdatePlayerInput } from "@/schemas/player.schema";
import { MatchRepository } from "@/repositories/match.repository";
import { AssessmentRepository } from "@/repositories/assessment.repository";

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
      'volea','globo','remate','bandeja','vibora','bajada_pared','saque','recepcion_saque'
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

    return matches.map((m) => {
      const team = (m as any).team as any;
      const matchResults = (m as any).match_results ?? null;
      const winner_team = matchResults ? matchResults.winner_team : null;
      const setsFormatted = matchResults ? formatSets(matchResults.sets) : null;
      const winnerLabel = winner_team == null ? "-" : winner_team === team ? "Sí" : "No";

      return {
        id: m.id,
        match_at: m.match_at,
        club_name: m.club_name,
        status: m.status,
        team,
        winner_team: winner_team as any,
        setsFormatted: setsFormatted ?? "-",
        winnerLabel,
        hasAssessment: assessmentsMap.has(m.id),
      };
    });
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

    return this.repository.create(input);
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
}


