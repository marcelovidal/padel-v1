import { createClient } from "@/lib/supabase/server";

export type CoachProfile = {
  id: string;
  player_id: string;
  primary_club_id: string | null;
  additional_club_ids: string[] | null;
  bio: string | null;
  especialidad: string | null;
  tarifa_por_hora: number | null;
  tarifa_publica: boolean;
  activo: boolean;
  created_at: string;
};

export type CoachPlayerState =
  | "en_forma"
  | "estable"
  | "bajando"
  | "inactivo"
  | "en_racha";

export type CoachStudentRow = {
  id: string;
  coach_player_id: string;
  display_name: string;
  avatar_url: string | null;
  category: number | null;
  pasala_index: number | null;
  index_delta_30d: number | null;
  last_match_at: string | null;
  player_state: CoachPlayerState;
  challenge_count: number;
};

export type CoachPublicProfile = {
  id: string;
  player_id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  region_code: string | null;
  region_name: string | null;
  category: number | null;
  pasala_index: number | null;
  bio: string | null;
  especialidad: string | null;
  primary_club_id: string | null;
  primary_club_name: string | null;
  tarifa_por_hora: number | null;
  tarifa_publica: boolean;
  availability: {
    day_of_week: number;
    start_time: string;
    end_time: string;
    slot_duration_minutes: number;
    club_id: string;
  }[];
};

export type AvailableCoach = {
  id: string;
  player_id: string;
  display_name: string;
  avatar_url: string | null;
  city: string | null;
  city_id: string | null;
  region_code: string | null;
  region_name: string | null;
  category: number | null;
  pasala_index: number | null;
  bio: string | null;
  especialidad: string | null;
  primary_club_id: string | null;
  primary_club_name: string | null;
  tarifa_por_hora: number | null;
  availability: { day_of_week: number; start_time: string; end_time: string }[] | null;
};

export type CoachNote = {
  id: string;
  coach_id: string;
  player_id: string;
  note: string;
  note_type: "observacion" | "objetivo" | "alerta" | "logro";
  created_at: string;
};

export type CoachChallenge = {
  id: string;
  coach_id: string;
  player_id: string;
  title: string;
  description: string | null;
  target_metric: string | null;
  target_value: number | null;
  deadline: string | null;
  status: "active" | "completed" | "expired";
  created_at: string;
};

export type TrainingSession = {
  id: string;
  coach_id: string;
  player_id: string;
  coach_booking_id: string | null;
  session_date: string;
  duration_minutes: number | null;
  session_type: "individual" | "grupal";
  notes: string | null;
  created_at: string;
};

export type CoachBooking = {
  id: string;
  coach_id: string;
  player_id: string;
  club_id: string;
  court_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  notes_player: string | null;
  notes_coach: string | null;
  tarifa_aplicada: number | null;
  created_at: string;
};

export type CoachBookingEnriched = CoachBooking & {
  player: { display_name: string; avatar_url: string | null } | null;
  club:   { name: string } | null;
  court:  { name: string } | null;
};

export class CoachRepository {
  private async getClient() {
    return await createClient();
  }

  async enableProfile(): Promise<CoachProfile> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("coach_enable_profile");
    if (error) throw error;
    return data as CoachProfile;
  }

  async updateProfile(params: {
    bio?: string;
    especialidad?: string;
    primary_club_id?: string;
    tarifa_por_hora?: number;
    tarifa_publica?: boolean;
  }): Promise<CoachProfile> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("coach_update_profile", {
      p_bio:             params.bio             ?? null,
      p_especialidad:    params.especialidad     ?? null,
      p_primary_club_id: params.primary_club_id  ?? null,
      p_tarifa_por_hora: params.tarifa_por_hora  ?? null,
      p_tarifa_publica:  params.tarifa_publica   ?? null,
    });
    if (error) throw error;
    return data as CoachProfile;
  }

  async setAvailability(slots: {
    club_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    slot_duration_minutes?: number;
  }[]): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("coach_set_availability", {
      p_slots: slots,
    });
    if (error) throw error;
  }

  async invitePlayer(playerId: string): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("coach_invite_player", {
      p_player_id: playerId,
    });
    if (error) throw error;
    return data as string;
  }

  async acceptInvitation(coachPlayerId: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("coach_accept_invitation", {
      p_coach_player_id: coachPlayerId,
    });
    if (error) throw error;
  }

  async getMyPlayers(): Promise<CoachStudentRow[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("coach_get_my_players");
    if (error) throw error;
    return (data as CoachStudentRow[]) ?? [];
  }

  async getPublicProfile(coachId: string): Promise<CoachPublicProfile> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("coach_get_public_profile", {
      p_coach_id: coachId,
    });
    if (error) throw error;
    return data as CoachPublicProfile;
  }

  async getAvailableCoaches(params?: {
    clubId?: string;
    cityId?: string;
    especialidad?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; coaches: AvailableCoach[] }> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("get_available_coaches", {
      p_club_id:      params?.clubId      ?? null,
      p_city_id:      params?.cityId      ?? null,
      p_especialidad: params?.especialidad ?? null,
      p_limit:        params?.limit        ?? 24,
      p_offset:       params?.offset       ?? 0,
    });
    if (error) throw error;
    return data as { total: number; coaches: AvailableCoach[] };
  }

  async getProfileByPlayerId(playerId: string): Promise<CoachProfile | null> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("coach_profiles")
      .select("*")
      .eq("player_id", playerId)
      .single();
    if (error && error.code !== "PGRST116") throw error;
    return data as CoachProfile | null;
  }

  async getNotes(coachId: string, playerId: string): Promise<CoachNote[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("player_coach_notes")
      .select("*")
      .eq("coach_id", coachId)
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data as CoachNote[]) ?? [];
  }

  async addNote(params: {
    coachId: string;
    playerId: string;
    note: string;
    noteType: CoachNote["note_type"];
  }): Promise<CoachNote> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("player_coach_notes")
      .insert({
        coach_id:  params.coachId,
        player_id: params.playerId,
        note:      params.note,
        note_type: params.noteType,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CoachNote;
  }

  async getChallenges(coachId: string, playerId?: string): Promise<CoachChallenge[]> {
    const supabase = await this.getClient();
    let q = (supabase as any)
      .from("player_challenges")
      .select("*")
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false });
    if (playerId) q = q.eq("player_id", playerId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as CoachChallenge[]) ?? [];
  }

  async addChallenge(params: {
    coachId: string;
    playerId: string;
    title: string;
    description?: string;
    targetMetric?: string;
    targetValue?: number;
    deadline?: string;
  }): Promise<CoachChallenge> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("player_challenges")
      .insert({
        coach_id:      params.coachId,
        player_id:     params.playerId,
        title:         params.title,
        description:   params.description   ?? null,
        target_metric: params.targetMetric  ?? null,
        target_value:  params.targetValue   ?? null,
        deadline:      params.deadline      ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as CoachChallenge;
  }

  async updateChallengeStatus(
    challengeId: string,
    status: CoachChallenge["status"]
  ): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await (supabase as any)
      .from("player_challenges")
      .update({ status })
      .eq("id", challengeId);
    if (error) throw error;
  }

  async getSessions(coachId: string, playerId?: string): Promise<TrainingSession[]> {
    const supabase = await this.getClient();
    let q = (supabase as any)
      .from("training_sessions")
      .select("*")
      .eq("coach_id", coachId)
      .order("session_date", { ascending: false });
    if (playerId) q = q.eq("player_id", playerId);
    const { data, error } = await q;
    if (error) throw error;
    return (data as TrainingSession[]) ?? [];
  }

  async addSession(params: {
    coachId: string;
    playerId: string;
    sessionDate: string;
    durationMinutes?: number;
    sessionType?: "individual" | "grupal";
    notes?: string;
    coachBookingId?: string;
  }): Promise<TrainingSession> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("training_sessions")
      .insert({
        coach_id:         params.coachId,
        player_id:        params.playerId,
        session_date:     params.sessionDate,
        duration_minutes: params.durationMinutes  ?? null,
        session_type:     params.sessionType       ?? "individual",
        notes:            params.notes             ?? null,
        coach_booking_id: params.coachBookingId    ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data as TrainingSession;
  }

  async getBookings(coachId: string): Promise<CoachBooking[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("coach_bookings")
      .select("*")
      .eq("coach_id", coachId)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return (data as CoachBooking[]) ?? [];
  }

  async getBookingsEnriched(coachId: string): Promise<CoachBookingEnriched[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("coach_bookings")
      .select(`
        *,
        player:players!player_id ( display_name, avatar_url ),
        club:clubs!club_id ( name ),
        court:club_courts!court_id ( name )
      `)
      .eq("coach_id", coachId)
      .order("scheduled_at", { ascending: true });
    if (error) throw error;
    return (data as CoachBookingEnriched[]) ?? [];
  }

  async createBooking(params: {
    playerId: string;
    scheduledAt: string;
    durationMinutes: number;
    clubId: string;
    courtId?: string | null;
    notesCoach?: string | null;
  }): Promise<string> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any).rpc("coach_create_booking", {
      p_player_id:        params.playerId,
      p_scheduled_at:     params.scheduledAt,
      p_duration_minutes: params.durationMinutes,
      p_club_id:          params.clubId,
      p_court_id:         params.courtId ?? null,
      p_notes_coach:      params.notesCoach ?? null,
    });
    if (error) throw error;
    return data as string;
  }

  async confirmBooking(bookingId: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("coach_confirm_booking", {
      p_booking_id: bookingId,
    });
    if (error) throw error;
  }

  async rejectBooking(bookingId: string, reason?: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("coach_reject_booking", {
      p_booking_id: bookingId,
      p_reason:     reason ?? null,
    });
    if (error) throw error;
  }

  async cancelBooking(bookingId: string): Promise<void> {
    const supabase = await this.getClient();
    const { error } = await (supabase as any).rpc("coach_cancel_booking", {
      p_booking_id: bookingId,
    });
    if (error) throw error;
  }

  async getCoachPlayersStatus(coachId: string): Promise<{ player_id: string; status: string }[]> {
    const supabase = await this.getClient();
    const { data, error } = await (supabase as any)
      .from("coach_players")
      .select("player_id, status")
      .eq("coach_id", coachId);
    if (error) throw error;
    return (data ?? []) as { player_id: string; status: string }[];
  }
}
