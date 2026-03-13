import { createClient } from "@/lib/supabase/server";

export interface OpenEvent {
  entity_type: "tournament" | "league";
  entity_id: string;
  entity_name: string;
  season_label: string | null;
  club_id: string;
  club_name: string;
  start_date: string | null;
  end_date: string | null;
  registration_id: string | null;
  registration_status: "pending" | "confirmed" | "rejected" | null;
  registration_role: "requester" | "teammate" | null;
  registration_partner_player_id: string | null;
  registration_partner_name: string | null;
}

export interface RegistrationRow {
  registration_id: string;
  player_id: string;
  player_name: string;
  player_category: number | null;
  player_city: string | null;
  teammate_player_id: string | null;
  teammate_name: string | null;
  teammate_category: number | null;
  teammate_city: string | null;
  status: "pending" | "confirmed" | "rejected";
  requested_at: string;
}

export class RegistrationsRepository {
  private async getClient() {
    return await createClient();
  }

  async getOpenEvents(): Promise<OpenEvent[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_get_open_events");
    if (error) throw error;
    return (data || []) as OpenEvent[];
  }

  async requestTournamentRegistration(tournamentId: string, teammatePlayerId?: string): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_request_tournament_registration", {
      p_tournament_id: tournamentId,
      p_teammate_player_id: teammatePlayerId ?? null,
    });
    if (error) throw error;
    return data as string;
  }

  async requestLeagueRegistration(leagueId: string, teammatePlayerId?: string): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_request_league_registration", {
      p_league_id: leagueId,
      p_teammate_player_id: teammatePlayerId ?? null,
    });
    if (error) throw error;
    return data as string;
  }

  async getTournamentRegistrations(tournamentId: string): Promise<RegistrationRow[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_get_tournament_registrations", {
      p_tournament_id: tournamentId,
    });
    if (!error) {
      return (data || []) as RegistrationRow[];
    }

    const { data: fallbackData, error: fallbackError } = await (supabase as any)
      .from("tournament_registrations")
      .select(
        `
          id,
          player_id,
          teammate_player_id,
          status,
          requested_at,
          players:player_id (
            display_name,
            category,
            city
          ),
          teammate:teammate_player_id (
            display_name,
            category,
            city
          )
        `
      )
      .eq("tournament_id", tournamentId);

    if (fallbackError) {
      throw error;
    }

    const rows = ((fallbackData || []) as any[]).map((row) => {
      const player = Array.isArray(row.players) ? row.players[0] : row.players;
      const teammate = Array.isArray(row.teammate) ? row.teammate[0] : row.teammate;
      return {
        registration_id: row.id,
        player_id: row.player_id,
        player_name: player?.display_name || "Jugador",
        player_category: typeof player?.category === "number" ? player.category : null,
        player_city: typeof player?.city === "string" ? player.city : null,
        teammate_player_id: row.teammate_player_id ?? null,
        teammate_name: typeof teammate?.display_name === "string" ? teammate.display_name : null,
        teammate_category: typeof teammate?.category === "number" ? teammate.category : null,
        teammate_city: typeof teammate?.city === "string" ? teammate.city : null,
        status: row.status,
        requested_at: row.requested_at,
      } as RegistrationRow;
    });

    return rows.sort((a, b) => {
      const statusOrder: Record<RegistrationRow["status"], number> = {
        pending: 0,
        confirmed: 1,
        rejected: 2,
      };
      const diff = statusOrder[a.status] - statusOrder[b.status];
      if (diff !== 0) return diff;
      return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
    });
  }

  async getLeagueRegistrations(leagueId: string): Promise<RegistrationRow[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_get_league_registrations", {
      p_league_id: leagueId,
    });
    if (!error) {
      return (data || []) as RegistrationRow[];
    }

    const { data: fallbackData, error: fallbackError } = await (supabase as any)
      .from("league_registrations")
      .select(
        `
          id,
          player_id,
          teammate_player_id,
          status,
          requested_at,
          players:player_id (
            display_name,
            category,
            city
          ),
          teammate:teammate_player_id (
            display_name,
            category,
            city
          )
        `
      )
      .eq("league_id", leagueId);

    if (fallbackError) {
      throw error;
    }

    const rows = ((fallbackData || []) as any[]).map((row) => {
      const player = Array.isArray(row.players) ? row.players[0] : row.players;
      const teammate = Array.isArray(row.teammate) ? row.teammate[0] : row.teammate;
      return {
        registration_id: row.id,
        player_id: row.player_id,
        player_name: player?.display_name || "Jugador",
        player_category: typeof player?.category === "number" ? player.category : null,
        player_city: typeof player?.city === "string" ? player.city : null,
        teammate_player_id: row.teammate_player_id ?? null,
        teammate_name: typeof teammate?.display_name === "string" ? teammate.display_name : null,
        teammate_category: typeof teammate?.category === "number" ? teammate.category : null,
        teammate_city: typeof teammate?.city === "string" ? teammate.city : null,
        status: row.status,
        requested_at: row.requested_at,
      } as RegistrationRow;
    });

    return rows.sort((a, b) => {
      const statusOrder: Record<RegistrationRow["status"], number> = {
        pending: 0,
        confirmed: 1,
        rejected: 2,
      };
      const diff = statusOrder[a.status] - statusOrder[b.status];
      if (diff !== 0) return diff;
      return new Date(a.requested_at).getTime() - new Date(b.requested_at).getTime();
    });
  }

  async resolveTournamentRegistration(registrationId: string, status: "confirmed" | "rejected"): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("club_resolve_tournament_registration", {
      p_registration_id: registrationId,
      p_status: status,
    });
    if (error) throw error;
  }

  async resolveLeagueRegistration(registrationId: string, status: "confirmed" | "rejected"): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("club_resolve_league_registration", {
      p_registration_id: registrationId,
      p_status: status,
    });
    if (error) throw error;
  }

  async updateTournamentInfo(input: {
    tournament_id: string;
    start_date?: string | null;
    end_date?: string | null;
    target_city_ids?: string[];
  }): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("club_update_tournament_info", {
      p_tournament_id:   input.tournament_id,
      p_start_date:      input.start_date ?? null,
      p_end_date:        input.end_date ?? null,
      p_target_city_ids: input.target_city_ids ?? null,
    });
    if (error) throw error;
  }

  async updateLeagueInfo(input: {
    league_id: string;
    start_date?: string | null;
    end_date?: string | null;
    target_city_ids?: string[];
  }): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("club_update_league_info", {
      p_league_id:       input.league_id,
      p_start_date:      input.start_date ?? null,
      p_end_date:        input.end_date ?? null,
      p_target_city_ids: input.target_city_ids ?? null,
    });
    if (error) throw error;
  }
}
