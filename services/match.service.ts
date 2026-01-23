import { MatchRepository, MatchWithPlayers } from "@/repositories/match.repository";
import {
  CreateMatchInput,
  UpdateMatchInput,
  AddPlayerToMatchInput,
  CreateMatchResultInput,
} from "@/schemas/match.schema";
import { createClient } from "@/lib/supabase/server";
import { computeWinner } from "@/lib/match/computeWinner";

export class MatchService {
  private repository: MatchRepository;

  constructor() {
    this.repository = new MatchRepository();
  }

  async getAllMatches() {
    return this.repository.findAll();
  }

  async getMatchesList(opts?: { limit?: number; offset?: number }) {
    return this.repository.findAllWithPlayersAndResults(opts);
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

    // Compute winner from provided sets (do not trust form winner_team)
    // TODO: narrow types so this cast is unnecessary when Supabase/DB types are fixed
    const computed = computeWinner(input.sets as any[]);

    if (computed.errors.length > 0) {
      throw new Error(computed.errors.join("; "));
    }

    if (!computed.winnerTeam) {
      throw new Error("No se pudo determinar el ganador a partir de los sets proporcionados");
    }

    return this.repository.upsertMatchResult({
      match_id: input.match_id,
      // TODO: remove `as any` once repository typings align with Database types
      sets: computed.normalizedSets as any,
      winner_team: computed.winnerTeam,
    });
  }
}

