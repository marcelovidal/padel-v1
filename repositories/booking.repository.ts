import { createClient } from "@/lib/supabase/server";

export type CourtSurfaceType = "synthetic" | "hard" | "clay" | "other";
export type BookingStatus = "requested" | "confirmed" | "rejected" | "cancelled";

export type ClubCourtRow = {
  id: string;
  club_id: string;
  name: string;
  surface_type: CourtSurfaceType;
  is_indoor: boolean;
  active: boolean;
  opening_time: string;
  closing_time: string;
  slot_interval_minutes: number | null;
  created_at: string;
  updated_at: string;
};

export type ClubBookingSettingsRow = {
  club_id: string;
  timezone: string;
  slot_duration_minutes: number;
  buffer_minutes: number;
  opening_hours: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type CourtBookingRow = {
  id: string;
  club_id: string;
  court_id: string;
  requested_by_player_id: string | null;
  requested_by_user_id: string | null;
  start_at: string;
  end_at: string;
  status: BookingStatus;
  note: string | null;
  rejection_reason: string | null;
  match_id: string | null;
  created_at: string;
  updated_at: string;
  club_courts?: {
    id: string;
    name: string;
    surface_type: CourtSurfaceType;
    is_indoor: boolean;
  } | null;
  clubs?: {
    id: string;
    name: string;
    city: string | null;
    region_name: string | null;
  } | null;
};

export class BookingRepository {
  private async getClient() {
    return await createClient();
  }

  async listClubCourts(clubId: string): Promise<ClubCourtRow[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("club_courts")
      .select("id,club_id,name,surface_type,is_indoor,active,opening_time,closing_time,slot_interval_minutes,created_at,updated_at")
      .eq("club_id", clubId)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data || []) as ClubCourtRow[];
  }

  async listActiveClubCourts(clubId: string): Promise<ClubCourtRow[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("club_courts")
      .select("id,club_id,name,surface_type,is_indoor,active,opening_time,closing_time,slot_interval_minutes,created_at,updated_at")
      .eq("club_id", clubId)
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) throw error;
    return (data || []) as ClubCourtRow[];
  }

  async getClubBookingSettings(clubId: string): Promise<ClubBookingSettingsRow | null> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("club_booking_settings")
      .select("club_id,timezone,slot_duration_minutes,buffer_minutes,opening_hours,created_at,updated_at")
      .eq("club_id", clubId)
      .maybeSingle();

    if (error) throw error;
    return (data as ClubBookingSettingsRow | null) || null;
  }

  async listClubBookings(clubId: string, status?: BookingStatus): Promise<CourtBookingRow[]> {
    const supabase = await this.getClient();
    let query: any = (supabase as any)
      .from("court_bookings")
      .select(
        "id,club_id,court_id,requested_by_player_id,requested_by_user_id,start_at,end_at,status,note,rejection_reason,match_id,created_at,updated_at,club_courts(id,name,surface_type,is_indoor)"
      )
      .eq("club_id", clubId)
      .order("start_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as CourtBookingRow[];
  }

  async listMyBookings(): Promise<CourtBookingRow[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("court_bookings")
      .select(
        "id,club_id,court_id,requested_by_player_id,requested_by_user_id,start_at,end_at,status,note,rejection_reason,match_id,created_at,updated_at,club_courts(id,name,surface_type,is_indoor),clubs(id,name,city,region_name)"
      )
      .order("start_at", { ascending: false });

    if (error) throw error;
    return (data || []) as CourtBookingRow[];
  }

  async getBookingById(bookingId: string): Promise<CourtBookingRow | null> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("court_bookings")
      .select(
        "id,club_id,court_id,requested_by_player_id,requested_by_user_id,start_at,end_at,status,note,rejection_reason,match_id,created_at,updated_at,club_courts(id,name,surface_type,is_indoor),clubs(id,name,city,region_name)"
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (error) throw error;
    return (data as CourtBookingRow | null) || null;
  }

  async upsertSettings(input: {
    club_id: string;
    timezone: string;
    slot_duration_minutes: number;
    buffer_minutes: number;
    opening_hours: Record<string, unknown>;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_upsert_booking_settings", {
      p_club_id: input.club_id,
      p_timezone: input.timezone,
      p_slot_duration_minutes: input.slot_duration_minutes,
      p_buffer_minutes: input.buffer_minutes,
      p_opening_hours: input.opening_hours,
    });

    if (error) throw error;
    return data as string;
  }

  async createCourt(input: {
    club_id: string;
    name: string;
    surface_type: CourtSurfaceType;
    is_indoor: boolean;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_create_court", {
      p_club_id: input.club_id,
      p_name: input.name,
      p_surface_type: input.surface_type,
      p_is_indoor: input.is_indoor,
    });

    if (error) throw error;
    return data as string;
  }

  async setCourtSchedule(input: {
    court_id: string;
    opening_time: string;
    closing_time: string;
    slot_interval_minutes?: number | null;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_set_court_schedule", {
      p_court_id: input.court_id,
      p_opening_time: input.opening_time,
      p_closing_time: input.closing_time,
      p_slot_interval_minutes:
        typeof input.slot_interval_minutes === "number" ? input.slot_interval_minutes : null,
    });

    if (error) throw error;
    return data as string;
  }

  async updateCourt(input: {
    court_id: string;
    name?: string;
    surface_type?: CourtSurfaceType;
    is_indoor?: boolean;
    active?: boolean;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_update_court", {
      p_court_id: input.court_id,
      p_name: input.name || null,
      p_surface_type: input.surface_type || null,
      p_is_indoor: typeof input.is_indoor === "boolean" ? input.is_indoor : null,
      p_active: typeof input.active === "boolean" ? input.active : null,
    });

    if (error) throw error;
    return data as string;
  }

  async requestBooking(input: {
    club_id: string;
    court_id: string;
    start_at: string;
    end_at: string;
    note?: string;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_request_booking", {
      p_club_id: input.club_id,
      p_court_id: input.court_id,
      p_start_at: input.start_at,
      p_end_at: input.end_at,
      p_note: input.note || null,
    });

    if (error) throw error;
    return data as string;
  }

  async confirmBooking(bookingId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_confirm_booking", {
      p_booking_id: bookingId,
    });

    if (error) throw error;
    return data as string;
  }

  async rejectBooking(bookingId: string, reason?: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_reject_booking", {
      p_booking_id: bookingId,
      p_reason: reason || null,
    });

    if (error) throw error;
    return data as string;
  }

  async cancelBooking(bookingId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("player_cancel_booking", {
      p_booking_id: bookingId,
    });

    if (error) throw error;
    return data as string;
  }

  async createMatchFromBooking(bookingId: string) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("booking_create_match", {
      p_booking_id: bookingId,
    });

    if (error) throw error;
    return data as string;
  }

  async createClubConfirmedBookingMatch(input: {
    club_id: string;
    court_id: string;
    player_id: string;
    start_at: string;
    end_at: string;
    note?: string;
  }) {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("club_create_confirmed_booking_match", {
      p_club_id: input.club_id,
      p_court_id: input.court_id,
      p_player_id: input.player_id,
      p_start_at: input.start_at,
      p_end_at: input.end_at,
      p_note: input.note || null,
    });

    if (error) throw error;
    return (data || null) as { booking_id: string; match_id: string } | null;
  }
}
