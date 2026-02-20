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

export type ClubClaimRequestListItem = {
  id: string;
  club_id: string;
  requested_by: string;
  status: "pending" | "approved" | "rejected";
  message: string | null;
  requester_first_name: string;
  requester_last_name: string;
  requester_phone: string;
  requester_email: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  clubs: {
    id: string;
    name: string;
    city: string | null;
    region_name: string | null;
    region_code: string | null;
    claim_status: ClubClaimStatus;
  } | null;
};

export type ClaimedClubListItem = {
  id: string;
  name: string;
  city: string | null;
  region_name: string | null;
  region_code: string | null;
  claim_status: ClubClaimStatus;
  claimed_at: string | null;
  claimed_by: string | null;
  avatar_url: string | null;
};

export type ClubManagedMatchListItem = {
  id: string;
  match_at: string;
  club_name: string;
  club_id: string;
  status: "scheduled" | "completed" | "cancelled";
  max_players: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  players_count: number;
  playersByTeam: {
    A: Array<{ id: string; first_name: string; last_name: string; avatar_url: string | null }>;
    B: Array<{ id: string; first_name: string; last_name: string; avatar_url: string | null }>;
  };
  match_results: { sets: Array<{ a: number | null; b: number | null }>; winner_team: "A" | "B" } | null;
};

export type UnclaimedClubListItem = {
  id: string;
  name: string;
  city: string | null;
  region_name: string | null;
  region_code: string | null;
  created_by: string | null;
  claim_status: ClubClaimStatus;
  created_at: string;
};

export type ClubLeadListItem = {
  id: string;
  suggested_name: string;
  city: string | null;
  region_name: string | null;
  region_code: string | null;
  status: "pending" | "approved" | "rejected";
  source: string;
  created_at: string;
  suggested_by: string;
};

export class ClubRepository {
  private async getClient() {
    return await createClient();
  }

  async findById(clubId: string): Promise<ClubRow | null> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("clubs")
      .select("id,name,normalized_name,country_code,region_code,region_name,city,city_id,created_by,claimed_by,claim_status,claimed_at,address,description,access_type,courts_count,has_glass,has_synthetic_grass,contact_first_name,contact_last_name,contact_phone,avatar_url,onboarding_completed,onboarding_completed_at,created_at,updated_at,deleted_at")
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
    requester_first_name: string;
    requester_last_name: string;
    requester_phone: string;
    requester_email: string;
    message?: string;
  }): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_request_claim", {
      p_club_id: input.clubId,
      p_requester_first_name: input.requester_first_name,
      p_requester_last_name: input.requester_last_name,
      p_requester_phone: input.requester_phone,
      p_requester_email: input.requester_email,
      p_message: input.message || null,
    });

    if (error) throw error;
    return data as string;
  }

  async listPendingClaimRequests(limit: number = 100): Promise<ClubClaimRequestListItem[]> {
    return this.listClaimRequestsByStatus("pending", limit);
  }

  async listClaimRequestsByStatus(
    status: "pending" | "approved" | "rejected",
    limit: number = 100
  ): Promise<ClubClaimRequestListItem[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("club_claim_requests")
      .select(`
        id,
        club_id,
        requested_by,
        status,
        message,
        requester_first_name,
        requester_last_name,
        requester_phone,
        requester_email,
        created_at,
        resolved_at,
        resolved_by,
        clubs (
          id,
          name,
          city,
          region_name,
          region_code,
          claim_status
        )
      `)
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" })
      .limit(limit);

    if (error) throw error;
    return (data || []) as ClubClaimRequestListItem[];
  }

  async listClaimedClubs(limit: number = 100): Promise<ClaimedClubListItem[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("clubs")
      .select("id,name,city,region_name,region_code,claim_status,claimed_at,claimed_by,avatar_url")
      .eq("claim_status", "claimed")
      .is("deleted_at", null)
      .order("claimed_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as ClaimedClubListItem[];
  }

  async listUnclaimedClubs(limit: number = 100): Promise<UnclaimedClubListItem[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("clubs")
      .select("id,name,city,region_name,region_code,created_by,claim_status,created_at")
      .eq("claim_status", "unclaimed")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as UnclaimedClubListItem[];
  }

  async listClubLeads(status?: "pending" | "approved" | "rejected", limit: number = 100): Promise<ClubLeadListItem[]> {
    const supabase = await this.getClient();
    let query: any = (supabase as any)
      .from("club_leads")
      .select("id,suggested_name,city,region_name,region_code,status,source,created_at,suggested_by")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ClubLeadListItem[];
  }

  async resolveClaimRequest(requestId: string, action: "approved" | "rejected"): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_resolve_claim", {
      p_request_id: requestId,
      p_decision: action,
    });

    if (error) throw error;
    return data as string;
  }

  async updateClubProfile(input: {
    club_id: string;
    name?: string;
    address?: string;
    description?: string;
    access_type?: ClubAccessType;
    courts_count?: number;
    has_glass?: boolean;
    has_synthetic_grass?: boolean;
    contact_first_name?: string;
    contact_last_name?: string;
    contact_phone?: string;
    avatar_url?: string;
  }): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_update_profile", {
      p_club_id: input.club_id,
      p_name: input.name || null,
      p_address: input.address || null,
      p_description: input.description || null,
      p_access_type: input.access_type || null,
      p_courts_count: typeof input.courts_count === "number" ? input.courts_count : null,
      p_has_glass: input.has_glass ?? false,
      p_has_synthetic_grass: input.has_synthetic_grass ?? false,
      p_contact_first_name: input.contact_first_name || null,
      p_contact_last_name: input.contact_last_name || null,
      p_contact_phone: input.contact_phone || null,
      p_avatar_url: input.avatar_url || null,
    });

    if (error) throw error;
    return data as string;
  }

  async listMyClubMatches(limit: number = 100): Promise<ClubManagedMatchListItem[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_list_my_matches", {
      p_limit: limit,
    });

    if (error) throw error;
    return ((data || []) as any[]).map((row) => ({
      id: row.id,
      match_at: row.match_at,
      club_name: row.club_name,
      club_id: row.club_id,
      status: row.status,
      max_players: row.max_players,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      players_count: row.players_count || 0,
      playersByTeam: {
        A: Array.isArray(row.players_by_team?.A) ? row.players_by_team.A : [],
        B: Array.isArray(row.players_by_team?.B) ? row.players_by_team.B : [],
      },
      match_results: row.match_results || null,
    }));
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
    avatar_url?: string;
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
      p_avatar_url: input.avatar_url || null,
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
