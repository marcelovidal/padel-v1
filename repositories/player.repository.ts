import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type Player = Database["public"]["Tables"]["players"]["Row"];
type PlayerInsert = Database["public"]["Tables"]["players"]["Insert"];
type PlayerUpdate = Database["public"]["Tables"]["players"]["Update"];

export class PlayerRepository {
  private async getClient() {
    return await createClient();
  }

  async findAll(): Promise<Player[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findAllActive(): Promise<Player[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("first_name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findById(id: string): Promise<Player | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async findByUserId(userId: string): Promise<Player | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }

  async search(query: string): Promise<Player[]> {
    const supabase = await this.getClient();
    const searchTerm = `%${query}%`;

    // Usar múltiples filtros OR con ilike
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .is("deleted_at", null)
      .or(
        `first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async create(player: PlayerInsert): Promise<Player> {
    const supabase = await this.getClient();
    // TODO: remove `as any` by using a properly typed Supabase client (createServerClient<Database>)
    const sb: any = supabase as any;
    const { data, error } = await sb
      .from("players")
      .insert(player as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: PlayerUpdate): Promise<Player> {
    const supabase = await this.getClient();
    // TODO: remove `as any` by using a properly typed Supabase client (createServerClient<Database>)
    const sb: any = supabase as any;
    const { data, error } = await sb
      .from("players")
      .update(updates as any)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deactivate(id: string): Promise<Player> {
    return this.update(id, { status: "inactive" });
  }

  async softDelete(id: string): Promise<void> {
    const supabase = await this.getClient();
    // TODO: remove `as any` by using a properly typed Supabase client (createServerClient<Database>)
    const sb: any = supabase as any;
    const { error } = await sb
      .from("players")
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) throw error;
  }
  async createGuestPlayer(input: {
    display_name: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    position?: "drive" | "reves" | "cualquiera";
    city?: string;
    city_id?: string;
    region_code?: string;
    region_name?: string;
  }): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_create_guest_player", {
      p_display_name: input.display_name,
      p_first_name: input.first_name,
      p_last_name: input.last_name,
      p_phone: input.phone,
      p_position: input.position,
      p_city: input.city,
      p_city_id: input.city_id,
      p_region_code: input.region_code,
      p_region_name: input.region_name,
      p_country_code: 'AR'
    });

    if (error) throw error;
    return data; // returns the new player_id
  }

  async findSimilarPlayers(query: string): Promise<Player[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_find_similar_players", {
      p_query: query,
    });

    if (error) throw error;
    return data || [];
  }

  async claimProfile(playerId: string): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_claim_profile", {
      p_target_player_id: playerId,
    });

    if (error) throw error;
    return data;
  }

  async searchPlayersWeighted(query: string, limit: number = 20): Promise<any[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_search_players", {
      p_query: query,
      p_limit: limit,
    });

    if (error) throw error;
    return data || [];
  }

  async updatePlayerProfile(input: {
    player_id: string;
    display_name: string;
    position: "drive" | "reves" | "cualquiera";
    city?: string;
    city_id?: string;
    region_code?: string;
    region_name?: string;
    country_code?: string;
  }): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_update_profile", {
      p_player_id: input.player_id,
      p_display_name: input.display_name,
      p_position: input.position,
      p_city: input.city,
      p_city_id: input.city_id,
      p_region_code: input.region_code,
      p_region_name: input.region_name,
      p_country_code: input.country_code || 'AR'
    });

    if (error) throw error;
    return data;
  }

  async getProfileMetrics(playerId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc('player_get_profile_metrics', { p_player_id: playerId });
    if (error) throw error;
    return data;
  }

  async getCompetitiveStats() {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc('player_get_competitive_stats');
    if (error) throw error;
    return data?.[0] || null;
  }
}
