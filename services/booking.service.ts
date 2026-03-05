import {
  BookingRepository,
  BookingStatus,
  CourtSurfaceType,
} from "@/repositories/booking.repository";

export class BookingService {
  private repository: BookingRepository;

  constructor() {
    this.repository = new BookingRepository();
  }

  async listClubCourts(clubId: string) {
    return this.repository.listClubCourts(clubId);
  }

  async listActiveClubCourts(clubId: string) {
    return this.repository.listActiveClubCourts(clubId);
  }

  async getClubBookingSettings(clubId: string) {
    return this.repository.getClubBookingSettings(clubId);
  }

  async listClubBookings(clubId: string, status?: BookingStatus) {
    return this.repository.listClubBookings(clubId, status);
  }

  async listMyBookings() {
    return this.repository.listMyBookings();
  }

  async getBookingById(bookingId: string) {
    return this.repository.getBookingById(bookingId);
  }

  async upsertSettings(input: {
    club_id: string;
    timezone: string;
    slot_duration_minutes: number;
    buffer_minutes: number;
    opening_hours: Record<string, unknown>;
  }) {
    return this.repository.upsertSettings(input);
  }

  async createCourt(input: {
    club_id: string;
    name: string;
    surface_type: CourtSurfaceType;
    is_indoor: boolean;
  }) {
    return this.repository.createCourt(input);
  }

  async setCourtSchedule(input: {
    court_id: string;
    opening_time: string;
    closing_time: string;
    slot_interval_minutes?: number | null;
  }) {
    return this.repository.setCourtSchedule(input);
  }

  async updateCourt(input: {
    court_id: string;
    name?: string;
    surface_type?: CourtSurfaceType;
    is_indoor?: boolean;
    active?: boolean;
  }) {
    return this.repository.updateCourt(input);
  }

  async requestBooking(input: {
    club_id: string;
    court_id: string;
    start_at: string;
    end_at: string;
    note?: string;
  }) {
    return this.repository.requestBooking(input);
  }

  async confirmBooking(bookingId: string) {
    return this.repository.confirmBooking(bookingId);
  }

  async confirmBookingAndCreateMatch(bookingId: string) {
    return this.repository.confirmBookingAndCreateMatch(bookingId);
  }

  async rejectBooking(bookingId: string, reason?: string) {
    return this.repository.rejectBooking(bookingId, reason);
  }

  async cancelBooking(bookingId: string) {
    return this.repository.cancelBooking(bookingId);
  }

  async createMatchFromBooking(bookingId: string) {
    return this.repository.createMatchFromBooking(bookingId);
  }

  async createClubConfirmedBookingMatch(input: {
    club_id: string;
    court_id: string;
    player_id: string;
    start_at: string;
    end_at: string;
    note?: string;
  }) {
    return this.repository.createClubConfirmedBookingMatch(input);
  }
}
