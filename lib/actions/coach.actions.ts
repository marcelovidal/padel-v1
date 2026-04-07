"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CoachService } from "@/services/coach.service";
import type { CoachNote, CoachChallenge } from "@/repositories/coach.repository";

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
