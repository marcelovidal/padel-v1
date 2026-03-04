"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { MatchService } from "@/services/match.service";

const unifiedMatchSchema = z.object({
  match_at: z.string().min(1, "La fecha y hora son requeridas"),
  player_ids: z.array(z.string().uuid()).length(4, "Debes informar 4 jugadores"),
  club_id: z.string().uuid().optional().nullable(),
  club_name: z.string().optional().nullable(),
  court_id: z.string().uuid().optional().nullable(),
  booking_id: z.string().uuid().optional().nullable(),
  notes: z.string().optional().nullable(),
  source: z.enum(["direct", "booking"]).default("direct"),
});

export type CreateMatchUnifiedPayload = z.infer<typeof unifiedMatchSchema>;

export async function createMatchUnifiedAction(payload: CreateMatchUnifiedPayload) {
  const parsed = unifiedMatchSchema.safeParse(payload);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.errors[0]?.message || "Datos invalidos" };
  }

  const data = parsed.data;
  if (new Set(data.player_ids).size !== 4) {
    return { success: false as const, error: "No puedes repetir jugadores en el partido" };
  }

  const service = new MatchService();
  try {
    const matchId = await service.createMatchUnified({
      match_at: data.match_at,
      player_ids: data.player_ids,
      club_id: data.club_id || null,
      club_name: data.club_name || null,
      court_id: data.court_id || null,
      booking_id: data.booking_id || null,
      notes: data.notes || null,
      source: data.source,
    });

    revalidatePath("/player");
    revalidatePath("/player/matches");
    revalidatePath("/player/bookings");
    revalidatePath("/club/dashboard/bookings");
    revalidatePath("/club/matches");

    return { success: true as const, matchId };
  } catch (error: any) {
    const raw = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" ");
    if (raw.includes("PLAYER_PROFILE_NOT_FOUND")) {
      return { success: false as const, error: "Tu usuario no tiene un perfil de jugador vinculado." };
    }
    if (raw.includes("DUPLICATE_PLAYERS")) {
      return { success: false as const, error: "No puedes repetir jugadores en el partido." };
    }
    if (raw.includes("CREATOR_NOT_IN_MATCH")) {
      return { success: false as const, error: "Debes participar en el partido para crearlo." };
    }
    if (raw.includes("BOOKING_NOT_FOUND")) {
      return { success: false as const, error: "No encontramos la reserva indicada." };
    }
    if (raw.includes("INVALID_STATUS")) {
      return { success: false as const, error: "La reserva no permite crear partido en este estado." };
    }
    if (raw.includes("NOT_ALLOWED")) {
      return { success: false as const, error: "No tienes permisos para crear este partido." };
    }
    if (raw.includes("CLUB_NOT_FOUND")) {
      return { success: false as const, error: "El club seleccionado no existe o no esta disponible." };
    }

    return { success: false as const, error: error?.message || "Error al crear el partido" };
  }
}
