import { createClient } from "@/lib/supabase/server";

/**
 * Administradores de un club (tabla club_admins).
 *
 * OJO: no confundir con club-admin.repository.ts, que es de super admin
 * (deteccion de duplicados y merge de clubes). Este es el rol de gestion
 * de un club concreto.
 */
export type ClubAdminRow = {
  player_id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
  added_by_player_id: string | null;
  added_by_name: string | null;
  is_self: boolean;
};

export class ClubAdminsRepository {
  private async getClient() {
    return await createClient();
  }

  async listByClub(clubId: string): Promise<ClubAdminRow[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_list_admins", {
      p_club_id: clubId,
    });

    if (error) throw error;

    return ((data || []) as any[]).map((row) => ({
      player_id: row.player_id,
      display_name: row.display_name ?? "Jugador",
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      avatar_url: row.avatar_url ?? null,
      city: row.city ?? null,
      created_at: row.created_at,
      added_by_player_id: row.added_by_player_id ?? null,
      added_by_name: row.added_by_name ?? null,
      is_self: !!row.is_self,
    }));
  }

  async add(clubId: string, playerId: string): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_add_admin", {
      p_club_id: clubId,
      p_player_id: playerId,
    });

    if (error) throw error;
    return String(data);
  }

  async remove(clubId: string, playerId: string): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_remove_admin", {
      p_club_id: clubId,
      p_player_id: playerId,
    });

    if (error) throw error;
    return String(data);
  }
}
