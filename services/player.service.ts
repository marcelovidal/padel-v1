import { PlayerRepository } from "@/repositories/player.repository";
import { CreatePlayerInput, UpdatePlayerInput } from "@/schemas/player.schema";

export class PlayerService {
  private repository: PlayerRepository;

  constructor() {
    this.repository = new PlayerRepository();
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


