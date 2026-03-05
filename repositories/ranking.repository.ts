import { createClient } from "@/lib/supabase/server";

export type ClubRankingRow = {
  player_id: string;
  display_name: string;
  category: string | null;
  points: number;
  wins: number;
  losses: number;
  matches_played: number;
  sets_won: number;
  sets_lost: number;
  last_match_at: string | null;
  rank: number;
};

export type PlayerClubRankingRow = {
  club_id: string;
  club_name: string;
  points: number;
  rank: number;
  matches_played: number;
  wins: number;
  losses: number;
  last_match_at: string | null;
};

export class RankingRepository {
  private async getClient() {
    return await createClient();
  }

  async recalculateClubRanking(clubId: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("club_recalculate_rankings", {
      p_club_id: clubId,
    });
    if (error) throw error;
  }

  async getClubRanking(clubId: string, limit: number = 50, offset: number = 0): Promise<ClubRankingRow[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_get_ranking", {
      p_club_id: clubId,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return ((data || []) as any[]).map((row) => ({
      player_id: String(row.player_id),
      display_name: String(row.display_name || "Jugador"),
      category: row.category == null ? null : String(row.category),
      points: Number(row.points || 0),
      wins: Number(row.wins || 0),
      losses: Number(row.losses || 0),
      matches_played: Number(row.matches_played || 0),
      sets_won: Number(row.sets_won || 0),
      sets_lost: Number(row.sets_lost || 0),
      last_match_at: row.last_match_at || null,
      rank: Number(row.rank || 0),
    }));
  }

  async getMyClubRankings(limit: number = 10): Promise<PlayerClubRankingRow[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_get_my_club_rankings", {
      p_limit: limit,
    });
    if (error) throw error;
    return ((data || []) as any[]).map((row) => ({
      club_id: String(row.club_id),
      club_name: String(row.club_name || "Club"),
      points: Number(row.points || 0),
      rank: Number(row.rank || 0),
      matches_played: Number(row.matches_played || 0),
      wins: Number(row.wins || 0),
      losses: Number(row.losses || 0),
      last_match_at: row.last_match_at || null,
    }));
  }
}
