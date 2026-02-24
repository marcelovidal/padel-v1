import { AdminRepository } from "@/repositories/admin.repository";

export class AdminService {
  private repository: AdminRepository;

  constructor() {
    this.repository = new AdminRepository();
  }

  async getOverviewStats() {
    return this.repository.getOverviewStats();
  }
}
