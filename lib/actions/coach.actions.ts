"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CoachService } from "@/services/coach.service";
import { createClient } from "@/lib/supabase/server";
import type { CoachNote, CoachChallenge } from "@/repositories/coach.repository";

// ── Player details for coach expand panel ────────────────────

const SKILL_KEYS = [
  "volea", "globo", "remate", "bandeja",
  "vibora", "bajada_pared", "saque", "recepcion_saque",
] as const;

export type PlayerCoachDetails = {
  lastMatches: { match_at: string; outcome: "win" | "loss" | "unknown"; score: string }[];
  skills: Record<string, number> | null;
};

export async function getPlayerCoachDetailsAction(playerId: string): Promise<PlayerCoachDetails> {
  const supabase = await createClient();

  const [matchRes, assessRes] = await Promise.all([
    (supabase as any)
      .from("matches")
      .select("id, match_at, match_players!inner(player_id, team), match_results(sets, winner_team)")
      .eq("match_players.player_id", playerId)
      .eq("status", "completed")
      .order("match_at", { ascending: false })
      .limit(3),
    (supabase as any)
      .from("player_match_assessments")
      .select("volea, globo, remate, bandeja, vibora, bajada_pared, saque, recepcion_saque")
      .eq("player_id", playerId)
      .limit(20),
  ]);

  const lastMatches = ((matchRes.data as any[]) ?? []).map((m: any) => {
    const playerTeam = ((m.match_players as any[]) ?? []).find((mp: any) => mp.player_id === playerId)?.team;
    const result = ((m.match_results as any[]) ?? [])[0];
    const winnerTeam = result?.winner_team;
    const outcome: "win" | "loss" | "unknown" = !winnerTeam
      ? "unknown"
      : winnerTeam === playerTeam
        ? "win"
        : "loss";
    const sets = (result?.sets as any[]) ?? [];
    const score = Array.isArray(sets) && playerTeam
      ? sets.map((s: any) => playerTeam === "A" ? `${s.a}-${s.b}` : `${s.b}-${s.a}`).join("  ")
      : "-";
    return { match_at: m.match_at as string, outcome, score };
  });

  const assessments = (assessRes.data as any[]) ?? [];
  let skills: Record<string, number> | null = null;
  if (assessments.length > 0) {
    const avgs: Record<string, number> = {};
    for (const key of SKILL_KEYS) {
      const vals = assessments.filter((a) => a[key] != null).map((a) => Number(a[key]));
      avgs[key] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
    }
    skills = avgs;
  }

  return { lastMatches, skills };
}

// ── Enable coach profile ──────────────────────────────────────

export async function enableCoachProfileAction() {
  const service = new CoachService();
  await service.enableProfile();
  revalidatePath("/player");
  redirect("/player/coach/setup");
}

// ── Save coach setup (profile + availability in one step) ─────

export async function saveCoachSetupAction(formData: FormData) {
  const service = new CoachService();

  const primaryClubId = formData.get("primary_club_id") as string | null;
  const especialidad  = formData.get("especialidad")    as string | null;
  const bio           = formData.get("bio")             as string | null;
  const tarifaRaw     = formData.get("tarifa_por_hora") as string | null;
  const tarifaPublica = formData.get("tarifa_publica") === "true";

  try {
    await service.updateProfile({
      bio:             bio             || undefined,
      especialidad:    especialidad    || undefined,
      primaryClubId:   primaryClubId   || undefined,
      tarifaPorHora:   tarifaRaw ? Number(tarifaRaw) : undefined,
      tarifaPublica:   tarifaPublica,
    });
  } catch (e: any) {
    return { error: e.message ?? "Error al guardar perfil" };
  }

  revalidatePath("/player/coach");
  redirect("/player/coach");
}

// ── Update coach profile ──────────────────────────────────────

export async function updateCoachProfileAction(formData: FormData) {
  const service = new CoachService();

  const primaryClubId = formData.get("primary_club_id") as string | null;
  const especialidad  = formData.get("especialidad")    as string | null;
  const bio           = formData.get("bio")             as string | null;
  const tarifaRaw     = formData.get("tarifa_por_hora") as string | null;
  const tarifaPublica = formData.get("tarifa_publica") === "true";

  try {
    await service.updateProfile({
      bio:             bio             || undefined,
      especialidad:    especialidad    || undefined,
      primaryClubId:   primaryClubId   || undefined,
      tarifaPorHora:   tarifaRaw ? Number(tarifaRaw) : undefined,
      tarifaPublica:   tarifaPublica,
    });
  } catch (e: any) {
    return { error: e.message ?? "Error al actualizar perfil" };
  }

  revalidatePath("/player/coach");
  return { success: true };
}

// ── Set availability ──────────────────────────────────────────

export async function setCoachAvailabilityAction(slots: {
  clubId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
}[]) {
  const service = new CoachService();
  try {
    await service.setAvailability(slots);
  } catch (e: any) {
    return { error: e.message ?? "Error al guardar disponibilidad" };
  }
  revalidatePath("/player/coach");
  return { success: true };
}

// ── Invite player ─────────────────────────────────────────────

export async function invitePlayerAction(playerId: string) {
  const service = new CoachService();
  try {
    const id = await service.invitePlayer(playerId);
    revalidatePath("/player/coach");
    return { id };
  } catch (e: any) {
    return { error: e.message ?? "Error al invitar jugador" };
  }
}

// ── Accept invitation ─────────────────────────────────────────

export async function acceptCoachInvitationAction(coachPlayerId: string) {
  const service = new CoachService();
  try {
    await service.acceptInvitation(coachPlayerId);
  } catch (e: any) {
    return { error: e.message ?? "Error al aceptar invitación" };
  }
  revalidatePath("/player");
  return { success: true };
}

// ── Add note ──────────────────────────────────────────────────

export async function addCoachNoteAction(params: {
  coachId: string;
  playerId: string;
  note: string;
  noteType: CoachNote["note_type"];
}) {
  const service = new CoachService();
  try {
    const note = await service.addNote(params);
    revalidatePath("/player/coach");
    return { note };
  } catch (e: any) {
    return { error: e.message ?? "Error al agregar nota" };
  }
}

// ── Add challenge ─────────────────────────────────────────────

export async function addCoachChallengeAction(params: {
  coachId: string;
  playerId: string;
  title: string;
  description?: string;
  targetMetric?: string;
  targetValue?: number;
  deadline?: string;
}) {
  const service = new CoachService();
  try {
    const challenge = await service.addChallenge(params);
    revalidatePath("/player/coach");
    return { challenge };
  } catch (e: any) {
    return { error: e.message ?? "Error al crear desafío" };
  }
}

// ── Update challenge status ───────────────────────────────────

export async function updateChallengeStatusAction(
  challengeId: string,
  status: CoachChallenge["status"]
) {
  const service = new CoachService();
  try {
    await service.updateChallengeStatus(challengeId, status);
    revalidatePath("/player/coach");
    return { success: true };
  } catch (e: any) {
    return { error: e.message ?? "Error al actualizar desafío" };
  }
}

// ── Coach booking flow ────────────────────────────────────────

export async function coachCreateBookingAction(params: {
  playerId: string;
  scheduledAt: string;
  durationMinutes: number;
  clubId: string;
  courtId?: string | null;
  notesCoach?: string | null;
}) {
  const service = new CoachService();
  try {
    const id = await service.createBooking(params);
    revalidatePath("/player/coach");
    return { id };
  } catch (e: any) {
    return { error: e.message ?? "Error al crear la reserva" };
  }
}

export async function coachConfirmBookingAction(bookingId: string) {
  const service = new CoachService();
  try {
    await service.confirmBooking(bookingId);
    revalidatePath("/player/coach");
    return { success: true };
  } catch (e: any) {
    return { error: e.message ?? "Error al confirmar la reserva" };
  }
}

export async function coachRejectBookingAction(bookingId: string, reason?: string) {
  const service = new CoachService();
  try {
    await service.rejectBooking(bookingId, reason);
    revalidatePath("/player/coach");
    return { success: true };
  } catch (e: any) {
    return { error: e.message ?? "Error al rechazar la reserva" };
  }
}

export async function coachCancelBookingAction(bookingId: string) {
  const service = new CoachService();
  try {
    await service.cancelBooking(bookingId);
    revalidatePath("/player/coach");
    revalidatePath("/player/calendario");
    return { success: true };
  } catch (e: any) {
    return { error: e.message ?? "Error al cancelar la reserva" };
  }
}

// ── Add session ───────────────────────────────────────────────

export async function addTrainingSessionAction(params: {
  coachId: string;
  playerId: string;
  sessionDate: string;
  durationMinutes?: number;
  sessionType?: "individual" | "grupal";
  notes?: string;
}) {
  const service = new CoachService();
  try {
    const session = await service.addSession(params);
    revalidatePath("/player/coach");
    return { session };
  } catch (e: any) {
    return { error: e.message ?? "Error al registrar sesión" };
  }
}
