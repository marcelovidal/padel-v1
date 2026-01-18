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
}
