import {
  ClubAdminRepository,
  ClubDuplicateCluster,
  ClubMergeResult,
} from "@/repositories/club-admin.repository";

export class ClubAdminService {
  private repository: ClubAdminRepository;

  constructor() {
    this.repository = new ClubAdminRepository();
  }

  async findDuplicates(query?: string | null, limit: number = 50): Promise<ClubDuplicateCluster[]> {
    return this.repository.findDuplicates(query, limit);
  }

  async mergeClubs(sourceId: string, targetId: string, note?: string | null): Promise<ClubMergeResult> {
    return this.repository.mergeClubs(sourceId, targetId, note);
  }

  async attachAlias(input: {
    clubId: string;
    aliasName: string;
    cityId?: string | null;
    regionCode?: string | null;
    countryCode?: string | null;
  }): Promise<string> {
    return this.repository.attachAlias(input);
  }
}
