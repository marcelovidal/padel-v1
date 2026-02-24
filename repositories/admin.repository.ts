import { createClient } from "@/lib/supabase/server";

export type AdminOverviewStats = {
  window: {
    days: number;
    generated_at: string | null;
  };
  users: {
    new_7d: number;
    new_30d: number;
    onboarding_completed_7d: number;
    onboarding_completed_30d: number;
    player_profiles_created_30d: number;
    onboarding_completion_rate_30d: number | null;
    active_players_30d: number;
  };
  matches: {
    created_7d: number;
    created_30d: number;
    with_result_7d: number;
    with_result_30d: number;
    result_completion_rate_30d: number | null;
  };
  clubs: {
    active_30d: number;
    claimed_total: number;
    pending_claims: number;
    claim_resolution_median_hours_30d: number | null;
  };
  growth: {
    matches_30d_vs_prev_30d_pct: number | null;
    active_players_30d_vs_prev_30d_pct: number | null;
    active_clubs_30d_vs_prev_30d_pct: number | null;
  };
  sharing: {
    match_shares_30d: number;
  };
};

const EMPTY_ADMIN_OVERVIEW: AdminOverviewStats = {
  window: { days: 30, generated_at: null },
  users: {
    new_7d: 0,
    new_30d: 0,
    onboarding_completed_7d: 0,
    onboarding_completed_30d: 0,
    player_profiles_created_30d: 0,
    onboarding_completion_rate_30d: null,
    active_players_30d: 0,
  },
  matches: {
    created_7d: 0,
    created_30d: 0,
    with_result_7d: 0,
    with_result_30d: 0,
    result_completion_rate_30d: null,
  },
  clubs: {
    active_30d: 0,
    claimed_total: 0,
    pending_claims: 0,
    claim_resolution_median_hours_30d: null,
  },
  growth: {
    matches_30d_vs_prev_30d_pct: null,
    active_players_30d_vs_prev_30d_pct: null,
    active_clubs_30d_vs_prev_30d_pct: null,
  },
  sharing: {
    match_shares_30d: 0,
  },
};

function n(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export class AdminRepository {
  private async getClient() {
    return await createClient();
  }

  async getOverviewStats(): Promise<AdminOverviewStats> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("admin_get_overview_stats");

    if (error) throw error;

    const raw = (data || {}) as any;

    return {
      window: {
        days: n(raw.window?.days || EMPTY_ADMIN_OVERVIEW.window.days),
        generated_at: raw.window?.generated_at ?? null,
      },
      users: {
        new_7d: n(raw.users?.new_7d),
        new_30d: n(raw.users?.new_30d),
        onboarding_completed_7d: n(raw.users?.onboarding_completed_7d),
        onboarding_completed_30d: n(raw.users?.onboarding_completed_30d),
        player_profiles_created_30d: n(raw.users?.player_profiles_created_30d),
        onboarding_completion_rate_30d: nullableNumber(raw.users?.onboarding_completion_rate_30d),
        active_players_30d: n(raw.users?.active_players_30d),
      },
      matches: {
        created_7d: n(raw.matches?.created_7d),
        created_30d: n(raw.matches?.created_30d),
        with_result_7d: n(raw.matches?.with_result_7d),
        with_result_30d: n(raw.matches?.with_result_30d),
        result_completion_rate_30d: nullableNumber(raw.matches?.result_completion_rate_30d),
      },
      clubs: {
        active_30d: n(raw.clubs?.active_30d),
        claimed_total: n(raw.clubs?.claimed_total),
        pending_claims: n(raw.clubs?.pending_claims),
        claim_resolution_median_hours_30d: nullableNumber(raw.clubs?.claim_resolution_median_hours_30d),
      },
      growth: {
        matches_30d_vs_prev_30d_pct: nullableNumber(raw.growth?.matches_30d_vs_prev_30d_pct),
        active_players_30d_vs_prev_30d_pct: nullableNumber(raw.growth?.active_players_30d_vs_prev_30d_pct),
        active_clubs_30d_vs_prev_30d_pct: nullableNumber(raw.growth?.active_clubs_30d_vs_prev_30d_pct),
      },
      sharing: {
        match_shares_30d: n(raw.sharing?.match_shares_30d),
      },
    };
  }
}
