import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/database";

type PlayerRow = Database["public"]["Tables"]["players"]["Row"];

export class PlayerAuthService {
  async getSessionUser() {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  }

  async getPlayerByUserId(userId: string): Promise<PlayerRow | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("players")
      .select("id, first_name, last_name, category, user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data as PlayerRow | null;
  }

  // server-side sign out (clears session cookie)
  async signOut() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return true;
  }
}
