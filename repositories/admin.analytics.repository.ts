import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnalyticsKpis = {
  active_players_30d: number;
  active_players_30d_prev: number;
  matches_month: number;
  matches_month_prev: number;
  bookings_month: number;
  bookings_month_prev: number;
  active_tournaments: number;
  active_leagues: number;
  share_cards_30d: number;
  share_cards_30d_prev: number;
  guest_total: number;
  guest_converted: number;
};

export type AnalyticsGrowth = {
  total_players: number;
  total_registered: number;
  total_guests: number;
  guests_converted: number;
  new_players_7d: number;
  new_players_30d: number;
  total_clubs: number;
  claimed_clubs: number;
  unclaimed_clubs: number;
  players_by_province: Array<{ province: string; count: number }>;
};

export type ActivationSeriesPoint = {
  date: string;
  reg_cum: number;
  guest_cum: number;
  onb_cum: number;
  reg_daily: number;
  guest_daily: number;
  onb_daily: number;
};

export type ActivationFunnel = {
  total_registered: number;
  onboarding_count: number;
  onboarding_pct: number;
  played_match_count: number;
  played_match_pct: number;
  assessment_count: number;
  assessment_pct: number;
  never_active_count: number;
  never_active_pct: number;
};

export type WeeklyPoint = { week: string; count: number };
export type MonthlyPoint = { month: string; count: number };

export type AnalyticsRetention = {
  active_7d: number;
  active_30d: number;
  active_90d: number;
  matches_by_week: WeeklyPoint[];
  assessments_by_week: WeeklyPoint[];
  bookings_by_week: WeeklyPoint[];
  tournaments_by_month: MonthlyPoint[];
  leagues_by_month: MonthlyPoint[];
};

export type FeatureAdoptionItem = {
  feature: string;
  count: number;
  pct: number;
};

export type AnalyticsFeatureAdoption = {
  base_active_players: number;
  features: FeatureAdoptionItem[];
};

export type ClubMetricsRow = {
  id: string;
  name: string;
  city: string;
  region: string;
  claim_status: string;
  active_players: number;
  avg_matches_week: number;
  active_tournaments: number;
  active_leagues: number;
  last_match_at: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function n(v: unknown): number {
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

// ─── Repository ───────────────────────────────────────────────────────────────

export class AdminAnalyticsRepository {
  private async getClient() {
    return await createClient();
  }

  async getKpis(): Promise<AnalyticsKpis> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("admin_analytics_kpis");
    if (error) throw error;
    const raw = (data || {}) as any;
    return {
      active_players_30d:      n(raw.active_players_30d),
      active_players_30d_prev: n(raw.active_players_30d_prev),
      matches_month:           n(raw.matches_month),
      matches_month_prev:      n(raw.matches_month_prev),
      bookings_month:          n(raw.bookings_month),
      bookings_month_prev:     n(raw.bookings_month_prev),
      active_tournaments:      n(raw.active_tournaments),
      active_leagues:          n(raw.active_leagues),
      share_cards_30d:         n(raw.share_cards_30d),
      share_cards_30d_prev:    n(raw.share_cards_30d_prev),
      guest_total:             n(raw.guest_total),
      guest_converted:         n(raw.guest_converted),
    };
  }

  async getGrowthStats(): Promise<AnalyticsGrowth> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("admin_analytics_growth");
    if (error) throw error;
    const raw = (data || {}) as any;
    return {
      total_players:    n(raw.total_players),
      total_registered: n(raw.total_registered),
      total_guests:     n(raw.total_guests),
      guests_converted: n(raw.guests_converted),
      new_players_7d:   n(raw.new_players_7d),
      new_players_30d:  n(raw.new_players_30d),
      total_clubs:      n(raw.total_clubs),
      claimed_clubs:    n(raw.claimed_clubs),
      unclaimed_clubs:  n(raw.unclaimed_clubs),
      players_by_province: Array.isArray(raw.players_by_province)
        ? raw.players_by_province.map((p: any) => ({ province: String(p.province), count: n(p.count) }))
        : [],
    };
  }

  async getActivationSeries(days: number): Promise<ActivationSeriesPoint[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("admin_analytics_activation_series", { p_days: days });
    if (error) throw error;
    if (!Array.isArray(data)) return [];
    return data.map((row: any) => ({
      date:        String(row.date),
      reg_cum:     n(row.reg_cum),
      guest_cum:   n(row.guest_cum),
      onb_cum:     n(row.onb_cum),
      reg_daily:   n(row.reg_daily),
      guest_daily: n(row.guest_daily),
      onb_daily:   n(row.onb_daily),
    }));
  }

  async getActivationFunnel(): Promise<ActivationFunnel> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("admin_analytics_activation_funnel");
    if (error) throw error;
    const raw = (data || {}) as any;
    return {
      total_registered:   n(raw.total_registered),
      onboarding_count:   n(raw.onboarding_count),
      onboarding_pct:     n(raw.onboarding_pct),
      played_match_count: n(raw.played_match_count),
      played_match_pct:   n(raw.played_match_pct),
      assessment_count:   n(raw.assessment_count),
      assessment_pct:     n(raw.assessment_pct),
      never_active_count: n(raw.never_active_count),
      never_active_pct:   n(raw.never_active_pct),
    };
  }

  async getRetention(): Promise<AnalyticsRetention> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("admin_analytics_retention");
    if (error) throw error;
    const raw = (data || {}) as any;
    const toWeekly = (arr: any[]): WeeklyPoint[] =>
      Array.isArray(arr) ? arr.map((x: any) => ({ week: String(x.week), count: n(x.count) })) : [];
    const toMonthly = (arr: any[]): MonthlyPoint[] =>
      Array.isArray(arr) ? arr.map((x: any) => ({ month: String(x.month), count: n(x.count) })) : [];
    return {
      active_7d:             n(raw.active_7d),
      active_30d:            n(raw.active_30d),
      active_90d:            n(raw.active_90d),
      matches_by_week:       toWeekly(raw.matches_by_week),
      assessments_by_week:   toWeekly(raw.assessments_by_week),
      bookings_by_week:      toWeekly(raw.bookings_by_week),
      tournaments_by_month:  toMonthly(raw.tournaments_by_month),
      leagues_by_month:      toMonthly(raw.leagues_by_month),
    };
  }

  async getFeatureAdoption(): Promise<AnalyticsFeatureAdoption> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("admin_analytics_feature_adoption");
    if (error) throw error;
    const raw = (data || {}) as any;
    return {
      base_active_players: n(raw.base_active_players),
      features: Array.isArray(raw.features)
        ? raw.features.map((f: any) => ({ feature: String(f.feature), count: n(f.count), pct: n(f.pct) }))
        : [],
    };
  }

  async getGeoHealth(): Promise<{
    total_onboarded: number;
    with_city_id: number;
    pending_resolution: number; // city text saved but city_id null
    no_geo_data: number;        // neither city nor city_id
    resolution_pct: number;
    unresolved_sample: Array<{ display_name: string; city: string; region_name: string; registered_at: string }>;
  }> {
    const supabase = await this.getClient();

    const { data: rows, error } = await (supabase as any)
      .from("players")
      .select("id, display_name, city, city_id, region_name, created_at, onboarding_completed")
      .eq("onboarding_completed", true);

    if (error) throw error;
    const players: any[] = rows ?? [];

    const total = players.length;
    const withId = players.filter((p) => !!p.city_id).length;
    const pending = players.filter((p) => !p.city_id && !!p.city).length;
    const noGeo = players.filter((p) => !p.city_id && !p.city).length;

    const sample = players
      .filter((p) => !p.city_id && !!p.city)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10)
      .map((p) => ({
        display_name: p.display_name ?? "",
        city: p.city ?? "",
        region_name: p.region_name ?? "",
        registered_at: p.created_at ?? "",
      }));

    return {
      total_onboarded: total,
      with_city_id: withId,
      pending_resolution: pending,
      no_geo_data: noGeo,
      resolution_pct: total > 0 ? (withId / total) * 100 : 100,
      unresolved_sample: sample,
    };
  }

  async getClubMetrics(): Promise<ClubMetricsRow[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("admin_analytics_club_metrics");
    if (error) throw error;
    if (!Array.isArray(data)) return [];
    return data.map((row: any) => ({
      id:                String(row.id),
      name:              String(row.name),
      city:              String(row.city ?? ""),
      region:            String(row.region ?? ""),
      claim_status:      String(row.claim_status),
      active_players:    n(row.active_players),
      avg_matches_week:  n(row.avg_matches_week),
      active_tournaments: n(row.active_tournaments),
      active_leagues:    n(row.active_leagues),
      last_match_at:     row.last_match_at ? String(row.last_match_at) : null,
    }));
  }
}
