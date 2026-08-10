"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { BookingService } from "@/services/booking.service";
import {
  bookingIdSchema,
  clubCreateBookingMatchSchema,
  bookingSettingsSchema,
  createCourtSchema,
  rejectBookingSchema,
  requestBookingSchema,
  updateCourtSchema,
} from "@/schemas/booking.schema";

type BookingActionErrorCode =
  | "NOT_AUTHENTICATED"
  | "NOT_ALLOWED"
  | "BOOKING_NOT_FOUND"
  | "INVALID_TIME_RANGE"
  | "BOOKING_MUST_BE_FUTURE"
  | "BOOKING_TOO_FAR"
  | "BOOKING_OVERLAP"
  | "BOOKING_NOT_CONFIRMED"
  | "PLAYER_NOT_FOUND"
  | "COURT_NOT_AVAILABLE"
  | "INVALID_STATUS"
  | "INVALID_COURT_HOURS"
  | "BOOKING_OUTSIDE_HOURS"
  | "BOOKING_INVALID_SLOT"
  | "BOOKING_INVALID_DURATION"
  | "RPC_NOT_FOUND"
  | "UNKNOWN";

function inferBookingErrorCode(error: any): BookingActionErrorCode {
  const raw = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ");

  if (raw.includes("NOT_AUTHENTICATED")) return "NOT_AUTHENTICATED";
  if (raw.includes("NOT_ALLOWED")) return "NOT_ALLOWED";
  if (raw.includes("BOOKING_NOT_FOUND")) return "BOOKING_NOT_FOUND";
  if (raw.includes("INVALID_TIME_RANGE")) return "INVALID_TIME_RANGE";
  if (raw.includes("BOOKING_MUST_BE_FUTURE")) return "BOOKING_MUST_BE_FUTURE";
  if (raw.includes("BOOKING_TOO_FAR")) return "BOOKING_TOO_FAR";
  if (raw.includes("BOOKING_OVERLAP")) return "BOOKING_OVERLAP";
  if (raw.includes("BOOKING_NOT_CONFIRMED")) return "BOOKING_NOT_CONFIRMED";
  if (raw.includes("PLAYER_NOT_FOUND")) return "PLAYER_NOT_FOUND";
  if (raw.includes("COURT_NOT_AVAILABLE")) return "COURT_NOT_AVAILABLE";
  if (raw.includes("INVALID_STATUS")) return "INVALID_STATUS";
  if (raw.includes("INVALID_COURT_HOURS")) return "INVALID_COURT_HOURS";
  if (raw.includes("BOOKING_OUTSIDE_HOURS")) return "BOOKING_OUTSIDE_HOURS";
  if (raw.includes("BOOKING_INVALID_SLOT")) return "BOOKING_INVALID_SLOT";
  if (raw.includes("BOOKING_INVALID_DURATION")) return "BOOKING_INVALID_DURATION";
  if (raw.includes("PGRST202") || raw.includes("Could not find the function")) return "RPC_NOT_FOUND";
  return "UNKNOWN";
}

function errorMessageFor(code: BookingActionErrorCode) {
  switch (code) {
    case "NOT_AUTHENTICATED":
      return "Necesitas iniciar sesion para continuar.";
    case "NOT_ALLOWED":
      return "No tienes permisos para esta accion.";
    case "BOOKING_NOT_FOUND":
      return "La reserva no existe o ya no esta disponible.";
    case "INVALID_TIME_RANGE":
      return "El rango horario no es valido.";
    case "BOOKING_MUST_BE_FUTURE":
      return "La reserva debe ser en el futuro.";
    case "BOOKING_TOO_FAR":
      return "No puedes reservar con tanta anticipacion.";
    case "BOOKING_OVERLAP":
      return "La cancha ya tiene una reserva confirmada en ese horario.";
    case "BOOKING_NOT_CONFIRMED":
      return "Solo puedes crear partido desde una reserva confirmada.";
    case "PLAYER_NOT_FOUND":
      return "El jugador seleccionado no es valido o no esta activo.";
    case "COURT_NOT_AVAILABLE":
      return "La cancha seleccionada no esta disponible para reservar.";
    case "INVALID_STATUS":
      return "La reserva no permite esta accion.";
    case "INVALID_COURT_HOURS":
      return "El horario de apertura/cierre de la cancha es invalido.";
    case "BOOKING_OUTSIDE_HOURS":
      return "La reserva esta fuera del horario habilitado de la cancha.";
    case "BOOKING_INVALID_SLOT":
      return "La hora elegida no coincide con los turnos disponibles de la cancha.";
    case "BOOKING_INVALID_DURATION":
      return "La duracion no coincide con el intervalo configurado para la cancha.";
    case "RPC_NOT_FOUND":
      return "Falta una funcion de base de datos requerida. Ejecuta las migraciones pendientes y recarga el esquema.";
    default:
      return "No pudimos completar la accion. Intenta nuevamente.";
  }
}

// Los occupancy_type que devuelve club_get_occupied_slots, redactados para el
// jugador. Los dos pares grupo/playoff comparten texto a proposito: al que
// quiere reservar le importa que hay un partido, no en que instancia esta.
const OVERLAP_REASON_MESSAGES: Record<string, string> = {
  booking_requested: "Otro jugador ya pidio ese turno.",
  booking_confirmed: "Ese turno ya tiene una reserva confirmada.",
  fixed_slot: "Ese horario es un turno fijo del club.",
  league_match: "Hay un partido de liga programado en ese horario.",
  league_playoff_match: "Hay un partido de liga programado en ese horario.",
  tournament_match: "Hay un partido de torneo programado en ese horario.",
  tournament_playoff_match: "Hay un partido de torneo programado en ese horario.",
  coach_booking: "Hay una clase con entrenador en ese horario.",
};

const OVERLAP_FALLBACK_MESSAGE = "Ese horario ya esta ocupado.";

/**
 * player_request_booking manda el origen del conflicto en el DETAIL de la
 * excepcion, con la forma "Ocupado por: <occupancy_type>".
 *
 * El fallback no es un caso raro: los otros RPCs que levantan BOOKING_OVERLAP
 * (club_confirm_booking, club_create_confirmed_booking_match) no mandan DETAIL,
 * y un occupancy_type nuevo en la funcion SQL llegaria aca sin traduccion. En
 * los dos casos conviene un mensaje generico correcto antes que uno especifico
 * equivocado.
 */
function overlapReasonMessage(error: any): string {
  const detail = String(error?.details || "");
  const matched = detail.match(/Ocupado por:\s*([a-z_]+)/i);
  const reason = matched?.[1]?.toLowerCase();
  if (!reason) return OVERLAP_FALLBACK_MESSAGE;
  return OVERLAP_REASON_MESSAGES[reason] || OVERLAP_FALLBACK_MESSAGE;
}

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function upsertBookingSettingsAction(formData: FormData) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: errorMessageFor("NOT_AUTHENTICATED") };

  const parsed = bookingSettingsSchema.safeParse({
    club_id: String(formData.get("club_id") || ""),
    timezone: String(formData.get("timezone") || "America/Argentina/Buenos_Aires"),
    slot_duration_minutes: Number(formData.get("slot_duration_minutes") || 90),
    buffer_minutes: Number(formData.get("buffer_minutes") || 0),
    opening_hours: String(formData.get("opening_hours") || ""),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message || "Datos invalidos" };
  }

  const service = new BookingService();
  try {
    await service.upsertSettings({
      ...parsed.data,
      opening_hours: (parsed.data.opening_hours || {}) as Record<string, unknown>,
    });
    revalidatePath("/club/dashboard/settings");
    return { success: true as const };
  } catch (error: any) {
    console.error("clubCreateBookingAndMatchAction error:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });
    const code = inferBookingErrorCode(error);
    if (code === "UNKNOWN" && process.env.NODE_ENV !== "production") {
      const detail = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ");
      return {
        success: false as const,
        error: `No pudimos completar la accion. Detalle: ${detail || "sin detalle"}`,
        code,
      };
    }
    return { success: false as const, error: errorMessageFor(code), code };
  }
}

export async function createCourtAction(formData: FormData) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: errorMessageFor("NOT_AUTHENTICATED") };

  const parsed = createCourtSchema.safeParse({
    club_id: String(formData.get("club_id") || ""),
    name: String(formData.get("name") || ""),
    surface_type: String(formData.get("surface_type") || "synthetic"),
    is_indoor: String(formData.get("is_indoor") || "") === "on",
    opening_time: String(formData.get("opening_time") || "09:00"),
    closing_time: String(formData.get("closing_time") || "23:00"),
    slot_interval_minutes: Number(formData.get("slot_interval_minutes") || 90),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message || "Datos invalidos" };
  }

  const service = new BookingService();
  try {
    const courtId = await service.createCourt(parsed.data);
    await service.setCourtSchedule({
      court_id: courtId,
      opening_time: parsed.data.opening_time,
      closing_time: parsed.data.closing_time,
      slot_interval_minutes: parsed.data.slot_interval_minutes,
    });
    revalidatePath("/club/dashboard/courts");
    // Patron de ruta y no path concreto: el segmento pasa a ser el slug del
    // club, que el club_id no resuelve.
    revalidatePath("/clubs/[slug]/book", "page");
    return { success: true as const };
  } catch (error: any) {
    const code = inferBookingErrorCode(error);
    if (process.env.NODE_ENV !== "production") {
      const detail = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ");
      return {
        success: false as const,
        error:
          code === "UNKNOWN"
            ? `No pudimos completar la accion. Detalle: ${detail || "sin detalle"}`
            : `${errorMessageFor(code)} (${detail || code})`,
        code,
      };
    }
    return { success: false as const, error: errorMessageFor(code), code };
  }
}

export async function updateCourtAction(formData: FormData) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: errorMessageFor("NOT_AUTHENTICATED") };

  const parsed = updateCourtSchema.safeParse({
    court_id: String(formData.get("court_id") || ""),
    name: String(formData.get("name") || "").trim() || undefined,
    surface_type: (String(formData.get("surface_type") || "").trim() || undefined) as any,
    is_indoor: String(formData.get("is_indoor") || "") === "on",
    active: String(formData.get("active") || "") === "on",
    opening_time: String(formData.get("opening_time") || "09:00"),
    closing_time: String(formData.get("closing_time") || "23:00"),
    slot_interval_minutes: Number(formData.get("slot_interval_minutes") || 90),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message || "Datos invalidos" };
  }

  const service = new BookingService();
  try {
    await service.updateCourt(parsed.data);
    await service.setCourtSchedule({
      court_id: parsed.data.court_id,
      opening_time: parsed.data.opening_time,
      closing_time: parsed.data.closing_time,
      slot_interval_minutes: parsed.data.slot_interval_minutes,
    });
    revalidatePath("/club/dashboard/courts");
    return { success: true as const };
  } catch (error: any) {
    console.error("clubCreateBookingAndMatchAction error:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });
    const code = inferBookingErrorCode(error);
    const detail = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ");
    if (code === "UNKNOWN") {
      return {
        success: false as const,
        error: `No pudimos completar la accion. Detalle: ${detail || "sin detalle"}`,
        code,
      };
    }
    return { success: false as const, error: errorMessageFor(code), code };
  }
}

export async function requestBookingAction(formData: FormData) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: errorMessageFor("NOT_AUTHENTICATED") };

  const startLocal = String(formData.get("start_local") || "");
  const slotMinutes = Number(formData.get("slot_minutes") || 90);
  const startDate = new Date(startLocal);
  if (Number.isNaN(startDate.getTime())) {
    return { success: false as const, error: "Fecha/hora invalida" };
  }

  const endDate = new Date(startDate.getTime() + slotMinutes * 60000);

  const parsed = requestBookingSchema.safeParse({
    club_id: String(formData.get("club_id") || ""),
    court_id: String(formData.get("court_id") || ""),
    start_at: startDate.toISOString(),
    end_at: endDate.toISOString(),
    note: String(formData.get("note") || ""),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message || "Datos invalidos" };
  }

  const service = new BookingService();
  let bookingId: string;
  try {
    bookingId = await service.requestBooking(parsed.data);
  } catch (error: any) {
    const code = inferBookingErrorCode(error);
    // BOOKING_OVERLAP dejo de significar solo "ya hay una reserva confirmada":
    // desde que player_request_booking valida contra club_get_occupied_slots,
    // la causa puede ser una solicitud pendiente, un turno fijo, un partido o
    // una clase. El motivo real viene en el DETAIL.
    const message =
      code === "BOOKING_OVERLAP" ? overlapReasonMessage(error) : errorMessageFor(code);
    return { success: false as const, error: message, code };
  }

  revalidatePath("/player/bookings");
  revalidatePath("/clubs/[slug]/book", "page");
  return { success: true as const, bookingId };
}

export async function confirmBookingAction(formData: FormData) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: errorMessageFor("NOT_AUTHENTICATED") };

  const parsed = bookingIdSchema.safeParse({
    booking_id: String(formData.get("booking_id") || ""),
  });

  if (!parsed.success) {
    return { success: false as const, error: "Reserva invalida" };
  }

  const service = new BookingService();
  try {
    const matchId = await service.confirmBookingAndCreateMatch(parsed.data.booking_id);
    revalidatePath("/club/dashboard/bookings");
    revalidatePath("/club/matches");
    revalidatePath(`/club/matches/${matchId}`);
    revalidatePath("/player/bookings");
    revalidatePath("/player/matches");
    return { success: true as const };
  } catch (error: any) {
    console.error("clubCreateBookingAndMatchAction error:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });
    const code = inferBookingErrorCode(error);
    const detail = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ");
    if (code === "UNKNOWN") {
      return {
        success: false as const,
        error: `No pudimos completar la accion. Detalle: ${detail || "sin detalle"}`,
        code,
      };
    }
    return { success: false as const, error: errorMessageFor(code), code };
  }
}

export async function rejectBookingAction(formData: FormData) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: errorMessageFor("NOT_AUTHENTICATED") };

  const parsed = rejectBookingSchema.safeParse({
    booking_id: String(formData.get("booking_id") || ""),
    reason: String(formData.get("reason") || ""),
  });

  if (!parsed.success) {
    return { success: false as const, error: "Reserva invalida" };
  }

  const service = new BookingService();
  try {
    await service.rejectBooking(parsed.data.booking_id, parsed.data.reason);
    revalidatePath("/club/dashboard/bookings");
    revalidatePath("/player/bookings");
    return { success: true as const };
  } catch (error: any) {
    console.error("clubCreateBookingAndMatchAction error:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });
    const code = inferBookingErrorCode(error);
    const detail = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ");
    if (code === "UNKNOWN") {
      return {
        success: false as const,
        error: `No pudimos completar la accion. Detalle: ${detail || "sin detalle"}`,
        code,
      };
    }
    return { success: false as const, error: errorMessageFor(code), code };
  }
}

export async function cancelBookingAction(formData: FormData) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: errorMessageFor("NOT_AUTHENTICATED") };

  const parsed = bookingIdSchema.safeParse({
    booking_id: String(formData.get("booking_id") || ""),
  });

  if (!parsed.success) {
    return { success: false as const, error: "Reserva invalida" };
  }

  const service = new BookingService();
  try {
    await service.cancelBooking(parsed.data.booking_id);
    revalidatePath("/player/bookings");
    revalidatePath("/club/dashboard/bookings");
    return { success: true as const };
  } catch (error: any) {
    const code = inferBookingErrorCode(error);
    return { success: false as const, error: errorMessageFor(code), code };
  }
}

export async function clubCancelBookingAction(formData: FormData) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: errorMessageFor("NOT_AUTHENTICATED") };

  const parsed = bookingIdSchema.safeParse({
    booking_id: String(formData.get("booking_id") || ""),
  });

  if (!parsed.success) {
    return { success: false as const, error: "Reserva invalida" };
  }

  const service = new BookingService();
  try {
    await service.clubCancelBooking(parsed.data.booking_id);
    revalidatePath("/club/dashboard/bookings");
    revalidatePath("/player/bookings");
    return { success: true as const };
  } catch (error: any) {
    const code = inferBookingErrorCode(error);
    return { success: false as const, error: errorMessageFor(code), code };
  }
}

export async function createMatchFromBookingAction(formData: FormData) {
  const user = await requireUser();
  if (!user) return { success: false as const, error: errorMessageFor("NOT_AUTHENTICATED") };

  const parsed = bookingIdSchema.safeParse({
    booking_id: String(formData.get("booking_id") || ""),
  });

  if (!parsed.success) {
    return { success: false as const, error: "Reserva invalida" };
  }

  const service = new BookingService();
  try {
    const matchId = await service.createMatchFromBooking(parsed.data.booking_id);
    revalidatePath("/player/bookings");
    revalidatePath("/club/dashboard/bookings");
    revalidatePath(`/player/matches/${matchId}`);
    return { success: true as const, matchId };
  } catch (error: any) {
    const code = inferBookingErrorCode(error);
    return { success: false as const, error: errorMessageFor(code), code };
  }
}

export async function clubCreateBookingAndMatchAction(
  _prevState: { success?: boolean; error?: string; matchId?: string } | null,
  formData: FormData
) {
  const user = await requireUser();
  if (!user) {
    return { success: false as const, error: errorMessageFor("NOT_AUTHENTICATED") };
  }

  const date = String(formData.get("selected_date") || "");
  const time = String(formData.get("start_time") || "");
  const slotMinutes = Number(formData.get("slot_minutes") || 90);
  const startDate = new Date(`${date}T${time}:00`);
  if (Number.isNaN(startDate.getTime())) {
    return { success: false as const, error: "Fecha/hora invalida." };
  }
  const endDate = new Date(startDate.getTime() + slotMinutes * 60000);

  const parsed = clubCreateBookingMatchSchema.safeParse({
    club_id: String(formData.get("club_id") || ""),
    court_id: String(formData.get("court_id") || ""),
    player_id: String(formData.get("player_id") || ""),
    start_at: startDate.toISOString(),
    end_at: endDate.toISOString(),
    note: String(formData.get("note") || ""),
  });

  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message || "Datos invalidos." };
  }

  const service = new BookingService();
  try {
    const bookingId = String(formData.get("booking_id") || "").trim();
    if (bookingId) {
      const matchId = await service.confirmBookingAndCreateMatch(bookingId);
      revalidatePath("/club/dashboard/bookings");
      revalidatePath("/club/matches");
      revalidatePath("/player/matches");
      revalidatePath("/player/bookings");
      return { success: true as const, matchId };
    }

    const result = await service.createClubConfirmedBookingMatch(parsed.data);
    const matchId = result?.match_id || "";
    revalidatePath("/club/dashboard/bookings");
    revalidatePath("/club/matches");
    revalidatePath("/player/matches");
    revalidatePath("/player/bookings");
    return { success: true as const, matchId };
  } catch (error: any) {
    console.error("clubCreateBookingAndMatchAction error:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
    });
    const code = inferBookingErrorCode(error);
    const detail = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" | ");
    if (code === "UNKNOWN") {
      return {
        success: false as const,
        error: `No pudimos completar la accion. Detalle: ${detail || "sin detalle"}`,
        code,
      };
    }
    return { success: false as const, error: errorMessageFor(code), code };
  }
}
