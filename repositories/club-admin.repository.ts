import { createClient } from "@/lib/supabase/server";

export type ClubDuplicateCandidate = {
  id: string;
  name: string;
  normalized_name: string;
  claim_status: string;
  claimed: boolean;
  matches_count: number;
};

export type ClubDuplicateCluster = {
  cluster_key: string;
  country_code: string;
  region_code: string | null;
  city_id: string | null;
  city: string | null;
  region_name: string | null;
  clubs: ClubDuplicateCandidate[];
  confidence: number;
  clubs_count: number;
  total_matches: number;
};

export type ClubMergeResult = {
  ok: boolean;
  idempotent: boolean;
  source_club_id: string;
  target_club_id: string;
  affected_matches_count: number;
  merge_log_id?: string;
};

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parseCandidates(value: unknown): ClubDuplicateCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({
    id: String(item?.id || ""),
    name: String(item?.name || ""),
    normalized_name: String(item?.normalized_name || ""),
    claim_status: String(item?.claim_status || "unclaimed"),
    claimed: !!item?.claimed,
    matches_count: toNumber(item?.matches_count, 0),
  }));
}

export class ClubAdminRepository {
  private async getClient() {
    return await createClient();
  }

  async findDuplicates(query?: string | null, limit: number = 50): Promise<ClubDuplicateCluster[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("admin_find_club_duplicates", {
      p_query: query?.trim() ? query.trim() : null,
      p_limit: limit,
    });

    if (error) throw error;

    return ((data || []) as any[]).map((row) => ({
      cluster_key: String(row.cluster_key),
      country_code: String(row.country_code || "AR"),
      region_code: row.region_code ?? null,
      city_id: row.city_id ?? null,
      city: row.city ?? null,
      region_name: row.region_name ?? null,
      clubs: parseCandidates(row.clubs),
      confidence: toNumber(row.confidence, 0),
      clubs_count: toNumber(row.clubs_count, 0),
      total_matches: toNumber(row.total_matches, 0),
    }));
  }

  async mergeClubs(sourceClubId: string, targetClubId: string, note?: string | null): Promise<ClubMergeResult> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("admin_merge_clubs", {
      p_source_club_id: sourceClubId,
      p_target_club_id: targetClubId,
      p_note: note?.trim() ? note.trim() : null,
    });

    if (error) throw error;

    const raw = (data || {}) as any;
    return {
      ok: !!raw.ok,
      idempotent: !!raw.idempotent,
      source_club_id: String(raw.source_club_id || sourceClubId),
      target_club_id: String(raw.target_club_id || targetClubId),
      affected_matches_count: toNumber(raw.affected_matches_count, 0),
      merge_log_id: raw.merge_log_id ? String(raw.merge_log_id) : undefined,
    };
  }

  async attachAlias(input: {
    clubId: string;
    aliasName: string;
    cityId?: string | null;
    regionCode?: string | null;
    countryCode?: string | null;
  }): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("admin_attach_alias_to_club", {
      p_club_id: input.clubId,
      p_alias_name: input.aliasName,
      p_city_id: input.cityId || null,
      p_region_code: input.regionCode || null,
      p_country_code: input.countryCode || "AR",
    });

    if (error) throw error;
    return String(data);
  }
}
