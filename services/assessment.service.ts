import { AssessmentRepository } from "@/repositories/assessment.repository";
import { MatchRepository } from "@/repositories/match.repository";
import { Database } from "@/types/database";

type AssessmentInsert = Database["public"]["Tables"]["player_match_assessments"]["Insert"];
type Assessment = Database["public"]["Tables"]["player_match_assessments"]["Row"];

export class AssessmentService {
  private repository: AssessmentRepository;
  private matchRepository: MatchRepository;

  constructor() {
    this.repository = new AssessmentRepository();
    this.matchRepository = new MatchRepository();
  }

  async createAssessment(input: AssessmentInsert): Promise<Assessment> {
    // Validar que el partido existe
    const match = await this.matchRepository.findById(input.match_id);
    if (!match) {
      throw new Error("Partido no encontrado");
    }

    // Validar que el partido está completado
    if (match.status !== "completed") {
      throw new Error("Solo se puede enviar una autoevaluación para partidos completados");
    }

    // Validar que el jugador participó en el partido
    const participated = match.match_players.some((mp) => mp.player_id === input.player_id);
    if (!participated) {
      throw new Error("El jugador no participó en este partido");
    }

    try {
      return await this.repository.create(input);
    } catch (error: any) {
      // Manejar unique violation (23505)
      if (error?.code === "23505") {
        throw new Error("Ya existe una autoevaluación para este jugador en este partido");
      }
      throw error;
    }
  }

  async getAssessmentsByPlayer(playerId: string) {
    return this.repository.findByPlayer(playerId);
  }

  async getAssessmentsByMatch(matchId: string) {
    return this.repository.findByMatch(matchId);
  }

  async getPendingAssessments(playerId: string) {
    // 1. Get all matches for the player
    const matches = await this.matchRepository.findByPlayerId(playerId);

    // 2. Filter for completed matches
    const completedMatches = matches.filter(
      (m) => m.status === "completed" || !!m.match_results // status might not be synced if trigger failed, fallback
    );

    if (completedMatches.length === 0) return [];

    // 3. Get existing assessments for this player
    const assessments = await this.repository.findByPlayer(playerId);
    const assessmentMatchIds = new Set(assessments.map((a) => a.match_id));

    // 4. Return matches without assessments
    return completedMatches.filter((m) => !assessmentMatchIds.has(m.id));
  }

  async getPlayerAverages(playerId: string) {
    const assessments = await this.repository.findByPlayer(playerId);

    const strokes = [
      'volea', 'globo', 'remate', 'bandeja', 'vibora',
      'bajada_pared', 'saque', 'recepcion_saque'
    ] as const;

    const totals: Record<string, { sum: number; count: number }> = {};
    strokes.forEach(s => totals[s] = { sum: 0, count: 0 });

    assessments.forEach(a => {
      strokes.forEach(s => {
        const val = a[s];
        if (val !== null && val !== undefined) {
          totals[s].sum += val;
          totals[s].count++;
        }
      });
    });

    const averages = strokes.map(s => ({
      attribute: s,
      label: s.replace('_', ' '), // simple format
      value: totals[s].count > 0 ? parseFloat((totals[s].sum / totals[s].count).toFixed(1)) : 0,
      count: totals[s].count
    }));

    return averages;
  }
}
