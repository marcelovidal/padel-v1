import { RankingRepository } from "@/repositories/ranking.repository";

export class RankingService {
  private repository: RankingRepository;

  constructor() {
    this.repository = new RankingRepository();
  }

  async recalculateClubRanking(clubId: string) {
    return this.repository.recalculateClubRanking(clubId);
  }

  async getClubRanking(clubId: string, limit: number = 50, offset: number = 0) {
    return this.repository.getClubRanking(clubId, limit, offset);
  }

  async getMyClubRankings(limit: number = 10) {
    return this.repository.getMyClubRankings(limit);
  }
}
