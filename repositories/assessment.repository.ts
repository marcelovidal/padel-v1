import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type Assessment = Database["public"]["Tables"]["player_match_assessments"]["Row"];
type AssessmentInsert = Database["public"]["Tables"]["player_match_assessments"]["Insert"];

export class AssessmentRepository {
  private async getClient() {
    return await createClient();
  }

  async create(input: AssessmentInsert): Promise<Assessment> {
    const supabase = await this.getClient();
    // Keep parity with other repositories (temporary `any` cast until client is fully typed)
    const sb: any = supabase as any;
    const { data, error } = await sb
      .from("player_match_assessments")
      .insert(input as any)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findByPlayer(playerId: string): Promise<Assessment[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("player_match_assessments")
      .select("*")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findByMatch(matchId: string): Promise<Assessment[]> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("player_match_assessments")
      .select("*")
      .eq("match_id", matchId);

    if (error) throw error;
    return data || [];
  }

  async findByMatchAndPlayer(matchId: string, playerId: string): Promise<Assessment | null> {
    const supabase = await this.getClient();
    const { data, error } = await supabase
      .from("player_match_assessments")
      .select("*")
      .eq("match_id", matchId)
      .eq("player_id", playerId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data;
  }
}
