import {
  CoachRepository,
  type CoachProfile,
  type CoachStudentRow,
  type CoachPublicProfile,
  type AvailableCoach,
  type CoachNote,
  type CoachChallenge,
  type TrainingSession,
  type CoachBookingEnriched,
} from "@/repositories/coach.repository";

export class CoachService {
  private repo = new CoachRepository();

  async enableProfile(): Promise<CoachProfile> {
    return this.repo.enableProfile();
  }

  async updateProfile(params: {
    bio?: string;
    especialidad?: string;
    primaryClubId?: string;
    tarifaPorHora?: number;
    tarifaPublica?: boolean;
  }): Promise<CoachProfile> {
    return this.repo.updateProfile({
      bio:             params.bio,
      especialidad:    params.especialidad,
      primary_club_id: params.primaryClubId,
      tarifa_por_hora: params.tarifaPorHora,
      tarifa_publica:  params.tarifaPublica,
    });
  }

  async setAvailability(slots: {
    clubId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes?: number;
  }[]): Promise<void> {
    return this.repo.setAvailability(
      slots.map((s) => ({
        club_id:                s.clubId,
        day_of_week:            s.dayOfWeek,
        start_time:             s.startTime,
        end_time:               s.endTime,
        slot_duration_minutes:  s.slotDurationMinutes,
      }))
    );
  }

  async invitePlayer(playerId: string): Promise<string> {
    return this.repo.invitePlayer(playerId);
  }

  async acceptInvitation(coachPlayerId: string): Promise<void> {
    return this.repo.acceptInvitation(coachPlayerId);
  }

  async getMyPlayers(): Promise<CoachStudentRow[]> {
    return this.repo.getMyPlayers();
  }

  async getPublicProfile(coachId: string): Promise<CoachPublicProfile> {
    return this.repo.getPublicProfile(coachId);
  }

  async getAvailableCoaches(params?: {
    clubId?: string;
    cityId?: string;
    especialidad?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; coaches: AvailableCoach[] }> {
    return this.repo.getAvailableCoaches(params);
  }

  async getProfileByPlayerId(playerId: string): Promise<CoachProfile | null> {
    return this.repo.getProfileByPlayerId(playerId);
  }

  async getNotes(coachId: string, playerId: string): Promise<CoachNote[]> {
    return this.repo.getNotes(coachId, playerId);
  }

  async addNote(params: {
    coachId: string;
    playerId: string;
    note: string;
    noteType: CoachNote["note_type"];
  }): Promise<CoachNote> {
    return this.repo.addNote(params);
  }

  async getChallenges(coachId: string, playerId?: string): Promise<CoachChallenge[]> {
    return this.repo.getChallenges(coachId, playerId);
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
    return this.repo.addChallenge(params);
  }

  async updateChallengeStatus(
    challengeId: string,
    status: CoachChallenge["status"]
  ): Promise<void> {
    return this.repo.updateChallengeStatus(challengeId, status);
  }

  async getSessions(coachId: string, playerId?: string): Promise<TrainingSession[]> {
    return this.repo.getSessions(coachId, playerId);
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
    return this.repo.addSession(params);
  }

  async getBookings(coachId: string) {
    return this.repo.getBookings(coachId);
  }

  async getBookingsEnriched(coachId: string): Promise<CoachBookingEnriched[]> {
    return this.repo.getBookingsEnriched(coachId);
  }

  async createBooking(params: {
    playerId: string;
    scheduledAt: string;
    durationMinutes: number;
    clubId: string;
    courtId?: string | null;
    notesCoach?: string | null;
  }): Promise<string> {
    return this.repo.createBooking(params);
  }

  async confirmBooking(bookingId: string): Promise<void> {
    return this.repo.confirmBooking(bookingId);
  }

  async rejectBooking(bookingId: string, reason?: string): Promise<void> {
    return this.repo.rejectBooking(bookingId, reason);
  }

  async cancelBooking(bookingId: string): Promise<void> {
    return this.repo.cancelBooking(bookingId);
  }

  async requestBooking(params: {
    coachId: string;
    scheduledAt: string;
    durationMinutes: number;
    notesPlayer?: string | null;
  }): Promise<string> {
    return this.repo.requestBooking(params);
  }

  async getCoachPlayersStatus(coachId: string): Promise<{ player_id: string; status: string }[]> {
    return this.repo.getCoachPlayersStatus(coachId);
  }
}
