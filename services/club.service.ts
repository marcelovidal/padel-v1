import { ClubRepository } from "@/repositories/club.repository";
import { ClubAccessType } from "@/types/database";

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

  async completeClubOnboarding(input: {
    name: string;
    country_code?: string;
    region_code?: string;
    region_name?: string;
    city?: string;
    city_id?: string;
    address?: string;
    description?: string;
    access_type?: ClubAccessType;
    courts_count?: number;
    has_glass?: boolean;
    has_synthetic_grass?: boolean;
    contact_first_name?: string;
    contact_last_name?: string;
    contact_phone?: string;
  }) {
    return this.repository.completeOnboarding(input);
  }

  async findClubClaimCandidates(input: {
    name: string;
    city_id?: string;
    region_code?: string;
    exclude_club_id?: string;
    limit?: number;
  }) {
    return this.repository.findClaimCandidates(input);
  }
}
