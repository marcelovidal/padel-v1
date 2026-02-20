import { createClient } from "@/lib/supabase/server";
import { Database, ClubClaimStatus } from "@/types/database";

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

export class ClubRepository {
  private async getClient() {
    return await createClient();
  }

  async findById(clubId: string): Promise<ClubRow | null> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("clubs")
      .select("id,name,normalized_name,country_code,region_code,region_name,city,city_id,created_by,claimed_by,claim_status,claimed_at,created_at,updated_at,deleted_at")
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
}
