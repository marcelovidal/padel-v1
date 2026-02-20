import { createClient } from "@/lib/supabase/server";
import { Database, ClubClaimStatus, ClubAccessType } from "@/types/database";

type ClubRow = Database["public"]["Tables"]["clubs"]["Row"];

export type ClubSearchResult = {
  id: string;
  name: string;
  city: string | null;
  city_id: string | null;
  region_code: string | null;
  region_name: string | null;
  country_code: string;
  claim_status: ClubClaimStatus;
  score: number;
};

export type ClubClaimCandidate = {
  id: string;
  name: string;
  city: string | null;
  region_name: string | null;
  claim_status: ClubClaimStatus;
  exact_name: boolean;
  location_match: boolean;
};

export class ClubRepository {
  private async getClient() {
    return await createClient();
  }

  async findById(clubId: string): Promise<ClubRow | null> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("clubs")
      .select("id,name,normalized_name,country_code,region_code,region_name,city,city_id,created_by,claimed_by,claim_status,claimed_at,address,description,access_type,courts_count,has_glass,has_synthetic_grass,contact_first_name,contact_last_name,contact_phone,onboarding_completed,onboarding_completed_at,created_at,updated_at,deleted_at")
      .eq("id", clubId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw error;
    return (data as ClubRow | null) ?? null;
  }

  async search(query: string, limit: number = 20): Promise<ClubSearchResult[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_search", {
      p_query: query,
      p_limit: limit,
    });

    if (error) throw error;
    return (data || []) as ClubSearchResult[];
  }

  async create(input: {
    name: string;
    country_code?: string;
    region_code?: string;
    region_name?: string;
    city?: string;
    city_id?: string;
  }): Promise<ClubRow> {
    const supabase = await this.getClient();
    const { data: clubId, error } = await (supabase as any).rpc("club_create", {
      p_name: input.name,
      p_country_code: input.country_code || "AR",
      p_region_code: input.region_code || null,
      p_region_name: input.region_name || null,
      p_city: input.city || null,
      p_city_id: input.city_id || null,
    });

    if (error) throw error;

    const club = await this.findById(clubId as string);
    if (!club) {
      throw new Error("CLUB_NOT_FOUND");
    }
    return club;
  }

  async requestClaim(input: {
    clubId: string;
    message?: string;
    contactPhone?: string;
  }): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_request_claim", {
      p_club_id: input.clubId,
      p_message: input.message || null,
      p_contact_phone: input.contactPhone || null,
    });

    if (error) throw error;
    return data as string;
  }

  async completeOnboarding(input: {
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
  }): Promise<ClubRow> {
    const supabase = await this.getClient();
    const { data: clubId, error } = await (supabase as any).rpc("club_complete_onboarding", {
      p_name: input.name,
      p_country_code: input.country_code || "AR",
      p_region_code: input.region_code || null,
      p_region_name: input.region_name || null,
      p_city: input.city || null,
      p_city_id: input.city_id || null,
      p_address: input.address || null,
      p_description: input.description || null,
      p_access_type: input.access_type || null,
      p_courts_count: typeof input.courts_count === "number" ? input.courts_count : null,
      p_has_glass: input.has_glass ?? false,
      p_has_synthetic_grass: input.has_synthetic_grass ?? false,
      p_contact_first_name: input.contact_first_name || null,
      p_contact_last_name: input.contact_last_name || null,
      p_contact_phone: input.contact_phone || null,
    });

    if (error) throw error;

    const club = await this.findById(clubId as string);
    if (!club) {
      throw new Error("CLUB_NOT_FOUND");
    }
    return club;
  }

  async findClaimCandidates(input: {
    name: string;
    city_id?: string;
    region_code?: string;
    exclude_club_id?: string;
    limit?: number;
  }): Promise<ClubClaimCandidate[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_find_claim_candidates", {
      p_name: input.name,
      p_city_id: input.city_id || null,
      p_region_code: input.region_code || null,
      p_exclude_club_id: input.exclude_club_id || null,
      p_limit: input.limit ?? 5,
    });

    if (error) throw error;
    return ((data || []) as any[]).map((row) => ({
      id: row.id,
      name: row.name,
      city: row.city ?? null,
      region_name: row.region_name ?? null,
      claim_status: row.claim_status,
      exact_name: !!row.exact_name,
      location_match: !!row.location_match,
    }));
  }
}
