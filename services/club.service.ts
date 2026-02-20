import { ClubRepository } from "@/repositories/club.repository";

export class ClubService {
  private repository: ClubRepository;

  constructor() {
    this.repository = new ClubRepository();
  }

  async getClubById(clubId: string) {
    return this.repository.findById(clubId);
  }

  async searchClubs(query: string, limit: number = 20) {
    return this.repository.search(query, limit);
  }

  async createClub(input: {
    name: string;
    country_code?: string;
    region_code?: string;
    region_name?: string;
    city?: string;
    city_id?: string;
  }) {
    return this.repository.create(input);
  }

  async requestClubClaim(input: {
    clubId: string;
    message?: string;
    contactPhone?: string;
  }) {
    return this.repository.requestClaim(input);
  }
}
