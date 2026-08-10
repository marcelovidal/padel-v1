import { ClubAdminsRepository, ClubAdminRow } from "@/repositories/club-admins.repository";

export class ClubAdminsService {
  private repository: ClubAdminsRepository;

  constructor() {
    this.repository = new ClubAdminsRepository();
  }

  async listAdmins(clubId: string): Promise<ClubAdminRow[]> {
    return this.repository.listByClub(clubId);
  }

  async addAdmin(clubId: string, playerId: string): Promise<string> {
    return this.repository.add(clubId, playerId);
  }

  async removeAdmin(clubId: string, playerId: string): Promise<string> {
    return this.repository.remove(clubId, playerId);
  }
}
