import { MatchRepository, MatchWithPlayers } from "@/repositories/match.repository";
import {
  CreateMatchInput,
  UpdateMatchInput,
  AddPlayerToMatchInput,
  CreateMatchResultInput,
} from "@/schemas/match.schema";
import { createClient } from "@/lib/supabase/server";

export class MatchService {
  private repository: MatchRepository;

  constructor() {
    this.repository = new MatchRepository();
  }

  async getAllMatches() {
    return this.repository.findAll();
  }

  async getMatchById(id: string) {
    return this.repository.findById(id);
  }

  async createMatch(input: CreateMatchInput) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("Usuario no autenticado");
    }

    return this.repository.create({
      ...input,
      status: "scheduled",
      created_by: user.id,
    });
  }

  async updateMatch(input: UpdateMatchInput) {
    const { id, ...updates } = input;
    return this.repository.update(id, updates);
  }

  async addPlayerToMatch(input: AddPlayerToMatchInput) {
    // Verificar que el partido existe
    const match = await this.repository.findById(input.match_id);
    if (!match) {
      throw new Error("Partido no encontrado");
    }

    // Verificar límite de jugadores
    const players = await this.repository.getMatchPlayers(input.match_id);
    if (players.length >= match.max_players) {
      throw new Error(`El partido ya tiene el máximo de ${match.max_players} jugadores`);
    }

    return this.repository.addPlayerToMatch(input);
  }

  async removePlayerFromMatch(matchId: string, playerId: string) {
    return this.repository.removePlayerFromMatch(matchId, playerId);
  }

  async getMatchResult(matchId: string) {
    return this.repository.getMatchResult(matchId);
  }

  async upsertMatchResult(input: CreateMatchResultInput) {
    // Validar que el partido existe
    const match = await this.repository.findById(input.match_id);
    if (!match) {
      throw new Error("Partido no encontrado");
    }

    // Validar que los sets tienen estructura correcta
    if (input.sets.length === 0 || input.sets.length > 5) {
      throw new Error("Debe haber entre 1 y 5 sets");
    }

    // Validar que winner_team coincide con los sets ganados
    // En pádel, un equipo gana si gana más sets que el otro
    const setsWonByA = input.sets.filter((set) => set.a > set.b).length;
    const setsWonByB = input.sets.filter((set) => set.b > set.a).length;

    if (input.winner_team === "A" && setsWonByA <= setsWonByB) {
      throw new Error("El equipo A debe haber ganado más sets para ser el ganador");
    }
    if (input.winner_team === "B" && setsWonByB <= setsWonByA) {
      throw new Error("El equipo B debe haber ganado más sets para ser el ganador");
    }

    return this.repository.upsertMatchResult({
      match_id: input.match_id,
      sets: input.sets as any,
      winner_team: input.winner_team,
    });
  }
}

