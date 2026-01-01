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
    const { data, error } = await supabase
      .from("players")
      .insert(player)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: PlayerUpdate): Promise<Player> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("players")
      .update(updates)
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
    const { error } = await supabase
      .from("players")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;
  }
}

