"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RegistrationsService } from "@/services/registrations.service";

function isNextRedirectError(error: any): boolean {
  return typeof error?.digest === "string" && error.digest.startsWith("NEXT_REDIRECT");
}

function errCode(error: any): string {
  const raw = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" ");
  if (raw.includes("NOT_AUTHENTICATED")) return "NOT_AUTHENTICATED";
  if (raw.includes("NOT_ALLOWED")) return "NOT_ALLOWED";
  if (raw.includes("PLAYER_NOT_FOUND")) return "PLAYER_NOT_FOUND";
  if (raw.includes("PLAYER_ALREADY_REGISTERED")) return "ALREADY_REGISTERED";
  if (raw.includes("TEAMMATE_NOT_FOUND")) return "TEAMMATE_NOT_FOUND";
  if (raw.includes("TEAMMATE_NOT_ELIGIBLE")) return "TEAMMATE_NOT_ELIGIBLE";
  if (raw.includes("TEAMMATE_ALREADY_REGISTERED")) return "TEAMMATE_ALREADY_REGISTERED";
  if (raw.includes("INVALID_TEAM_PLAYERS")) return "INVALID_TEAM_PLAYERS";
  if (raw.includes("TOURNAMENT_NOT_FOUND")) return "TOURNAMENT_NOT_FOUND";
  if (raw.includes("TOURNAMENT_NOT_OPEN")) return "TOURNAMENT_NOT_OPEN";
  if (raw.includes("LEAGUE_NOT_FOUND")) return "LEAGUE_NOT_FOUND";
  if (raw.includes("LEAGUE_NOT_OPEN")) return "LEAGUE_NOT_OPEN";
  if (raw.includes("REGISTRATION_NOT_FOUND")) return "REGISTRATION_NOT_FOUND";
  if (raw.includes("INVALID_STATUS")) return "INVALID_STATUS";
  if (raw.includes("duplicate key value")) return "ALREADY_REGISTERED";
  return "UNKNOWN";
}

function errDebug(error: any) {
  return [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 180);
}

// ── Player actions ────────────────────────────────────────────────────────────

export async function requestTournamentRegistrationAction(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") || "");
  const teammatePlayerId = String(formData.get("teammate_player_id") || "").trim() || undefined;
  if (!tournamentId) redirect("/player/events?error=TOURNAMENT_NOT_FOUND");

  const service = new RegistrationsService();
  try {
    await service.requestTournamentRegistration(tournamentId, teammatePlayerId);
    revalidatePath("/player/events");
    redirect("/player/events?ok=REGISTRATION_REQUESTED");
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    const code = errCode(error);
    const debug = errDebug(error);
    redirect(`/player/events?error=${code}&debug=${encodeURIComponent(debug)}`);
  }
}

export async function requestLeagueRegistrationAction(formData: FormData) {
  const leagueId = String(formData.get("league_id") || "");
  const teammatePlayerId = String(formData.get("teammate_player_id") || "").trim() || undefined;
  if (!leagueId) redirect("/player/events?error=LEAGUE_NOT_FOUND");

  const service = new RegistrationsService();
  try {
    await service.requestLeagueRegistration(leagueId, teammatePlayerId);
    revalidatePath("/player/events");
    redirect("/player/events?ok=REGISTRATION_REQUESTED");
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    const code = errCode(error);
    const debug = errDebug(error);
    redirect(`/player/events?error=${code}&debug=${encodeURIComponent(debug)}`);
  }
}

// ── Club actions ──────────────────────────────────────────────────────────────

export async function resolveTournamentRegistrationAction(formData: FormData) {
  const registrationId = String(formData.get("registration_id") || "");
  const status = String(formData.get("status") || "") as "confirmed" | "rejected";
  const tournamentId = String(formData.get("tournament_id") || "");
  const path = `/club/dashboard/tournaments/${tournamentId}`;

  if (!registrationId || !["confirmed", "rejected"].includes(status)) {
    redirect(`${path}?error=INVALID_STATUS`);
  }

  const service = new RegistrationsService();
  try {
    await service.resolveTournamentRegistration(registrationId, status);
    revalidatePath(path);
    redirect(`${path}?ok=REGISTRATION_${status.toUpperCase()}`);
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    redirect(`${path}?error=${errCode(error)}&debug=${encodeURIComponent(errDebug(error))}`);
  }
}

export async function resolveLeagueRegistrationAction(formData: FormData) {
  const registrationId = String(formData.get("registration_id") || "");
  const status = String(formData.get("status") || "") as "confirmed" | "rejected";
  const leagueId = String(formData.get("league_id") || "");
  const path = `/club/dashboard/leagues/${leagueId}`;

  if (!registrationId || !["confirmed", "rejected"].includes(status)) {
    redirect(`${path}?error=INVALID_STATUS`);
  }

  const service = new RegistrationsService();
  try {
    await service.resolveLeagueRegistration(registrationId, status);
    revalidatePath(path);
    redirect(`${path}?ok=REGISTRATION_${status.toUpperCase()}`);
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    redirect(`${path}?error=${errCode(error)}&debug=${encodeURIComponent(errDebug(error))}`);
  }
}

export async function updateTournamentInfoAction(formData: FormData) {
  const tournamentId = String(formData.get("tournament_id") || "");
  const path = `/club/dashboard/tournaments/${tournamentId}`;
  if (!tournamentId) redirect("/club/dashboard/tournaments?error=TOURNAMENT_NOT_FOUND");

  const startDate = String(formData.get("start_date") || "").trim() || null;
  const endDate = String(formData.get("end_date") || "").trim() || null;
  const rawCities = String(formData.get("target_city_ids") || "").trim();
  const targetCityIds = rawCities
    ? rawCities.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const service = new RegistrationsService();
  try {
    await service.updateTournamentInfo({
      tournament_id: tournamentId,
      start_date: startDate,
      end_date: endDate,
      target_city_ids: targetCityIds,
    });
    revalidatePath(path);
    revalidatePath("/club/dashboard/tournaments");
    redirect(`${path}?ok=TOURNAMENT_INFO_UPDATED`);
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    redirect(`${path}?error=${errCode(error)}&debug=${encodeURIComponent(errDebug(error))}`);
  }
}

export async function updateLeagueInfoAction(formData: FormData) {
  const leagueId = String(formData.get("league_id") || "");
  const path = `/club/dashboard/leagues/${leagueId}`;
  if (!leagueId) redirect("/club/dashboard/leagues?error=LEAGUE_NOT_FOUND");

  const startDate = String(formData.get("start_date") || "").trim() || null;
  const endDate = String(formData.get("end_date") || "").trim() || null;
  const rawCities = String(formData.get("target_city_ids") || "").trim();
  const targetCityIds = rawCities
    ? rawCities.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const service = new RegistrationsService();
  try {
    await service.updateLeagueInfo({
      league_id: leagueId,
      start_date: startDate,
      end_date: endDate,
      target_city_ids: targetCityIds,
    });
    revalidatePath(path);
    revalidatePath("/club/dashboard/leagues");
    redirect(`${path}?ok=LEAGUE_INFO_UPDATED`);
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    redirect(`${path}?error=${errCode(error)}&debug=${encodeURIComponent(errDebug(error))}`);
  }
}
