"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { TournamentsService } from "@/services/tournaments.service";

function isNextRedirectError(error: any): boolean {
  return typeof error?.digest === "string" && error.digest.startsWith("NEXT_REDIRECT");
}

function errCode(error: any): string {
  const raw = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" ");
  if (raw.includes("NOT_AUTHENTICATED")) return "NOT_AUTHENTICATED";
  if (raw.includes("NOT_ALLOWED")) return "NOT_ALLOWED";
  if (raw.includes("TOURNAMENT_NOT_FOUND")) return "TOURNAMENT_NOT_FOUND";
  if (raw.includes("TOURNAMENT_ALREADY_FINISHED")) return "TOURNAMENT_ALREADY_FINISHED";
  if (raw.includes("GROUP_NOT_FOUND")) return "GROUP_NOT_FOUND";
  if (raw.includes("TEAM_NOT_FOUND")) return "TEAM_NOT_FOUND";
  if (raw.includes("TEAM_HAS_FIXTURE")) return "TEAM_HAS_FIXTURE";
  if (raw.includes("TEAM_REGISTRATION_CLOSED_BY_FIXTURE")) return "TEAM_REGISTRATION_CLOSED_BY_FIXTURE";
  if (raw.includes("PLAYER_NOT_FOUND")) return "PLAYER_NOT_FOUND";
  if (raw.includes("INVALID_TEAM_PLAYERS")) return "INVALID_TEAM_PLAYERS";
  if (raw.includes("INVALID_NAME")) return "INVALID_NAME";
  if (raw.includes("INVALID_STATUS")) return "INVALID_STATUS";
  if (raw.includes("INVALID_CATEGORY_VALUE")) return "INVALID_CATEGORY_VALUE";
  if (raw.includes("CATEGORY_NOT_ALLOWED")) return "CATEGORY_NOT_ALLOWED";
  if (raw.includes("TEAM_DIVISION_MISMATCH")) return "TEAM_DIVISION_MISMATCH";
  if (raw.includes("NOT_ENOUGH_TEAMS")) return "NOT_ENOUGH_TEAMS";
  if (raw.includes("FIXTURE_ALREADY_EXISTS")) return "FIXTURE_ALREADY_EXISTS";
  if (raw.includes("COMPLETED_MATCHES_EXIST")) return "COMPLETED_MATCHES_EXIST";
  if (raw.includes("BOOKING_OVERLAP")) return "BOOKING_OVERLAP";
  if (raw.includes("BOOKING_OUTSIDE_HOURS")) return "BOOKING_OUTSIDE_HOURS";
  if (raw.includes("BOOKING_INVALID_SLOT")) return "BOOKING_INVALID_SLOT";
  if (raw.includes("RESULT_ALREADY_EXISTS")) return "RESULT_ALREADY_EXISTS";
  if (raw.includes("MATCH_NOT_COMPLETED")) return "MATCH_NOT_COMPLETED";
  if (raw.includes("INVALID_SCORES")) return "INVALID_SCORES";
  if (raw.includes("TOURNAMENT_MATCH_NOT_FOUND")) return "TOURNAMENT_MATCH_NOT_FOUND";
  if (raw.includes("PLAYOFF_ALREADY_EXISTS")) return "PLAYOFF_ALREADY_EXISTS";
  if (raw.includes("GROUP_STAGE_INCOMPLETE")) return "GROUP_STAGE_INCOMPLETE";
  if (raw.includes("NO_FIXTURE_FOR_GROUP")) return "NO_FIXTURE_FOR_GROUP";
  if (raw.includes("NOT_ENOUGH_QUALIFIED_TEAMS")) return "NOT_ENOUGH_QUALIFIED_TEAMS";
  if (raw.includes("UNSUPPORTED_GROUP_COUNT_FOR_PLAYOFF")) return "UNSUPPORTED_GROUP_COUNT_FOR_PLAYOFF";
  if (raw.includes("PLAYOFF_MATCH_NOT_FOUND")) return "PLAYOFF_MATCH_NOT_FOUND";
  if (raw.includes("PLAYOFF_TEAMS_NOT_DEFINED")) return "PLAYOFF_TEAMS_NOT_DEFINED";
  if (raw.includes("violates row-level security policy")) return "RLS_VIOLATION";
  if (raw.includes("duplicate key value")) return "DUPLICATE_KEY";
  if (typeof error?.code === "string" && error.code.trim().length > 0) return error.code;
  return "UNKNOWN";
}

function errDebug(error: any) {
  return [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" | ")
    .slice(0, 180);
}

function detailPath(tournamentId: string) {
  return `/club/dashboard/tournaments/${tournamentId}`;
}

function redirectWithError(
  basePath: string,
  code: string,
  debug?: string,
  extra?: Record<string, string | number>
) {
  const qs = new URLSearchParams({ error: code });
  if (debug) qs.set("debug", debug);
  if (extra) for (const [k, v] of Object.entries(extra)) qs.set(k, String(v));
  redirect(`${basePath}?${qs.toString()}`);
}

function redirectWithOk(basePath: string, code: string, extra?: Record<string, string | number>) {
  const qs = new URLSearchParams({ ok: code });
  if (extra) for (const [k, v] of Object.entries(extra)) qs.set(k, String(v));
  redirect(`${basePath}?${qs.toString()}`);
}

export async function createTournamentAction(formData: FormData) {
  const service = new TournamentsService();
  const clubId = String(formData.get("club_id") || "");
  const name = String(formData.get("name") || "").trim();
  const rawCat = String(formData.get("target_category_int") || "").trim();
  const allowLower = formData.get("allow_lower_category") === "on";
  const seasonLabel = String(formData.get("season_label") || "").trim();
  const description = String(formData.get("description") || "").trim();

  if (!clubId || !name || !rawCat) {
    redirectWithError("/club/dashboard/tournaments", "COMPLETE_REQUIRED_FIELDS");
  }

  const targetCategory = Number(rawCat);
  if (Number.isNaN(targetCategory) || targetCategory < 1) {
    redirectWithError("/club/dashboard/tournaments", "INVALID_CATEGORY_VALUE");
  }

  try {
    const tournamentId = await service.createTournament({
      club_id: clubId,
      name,
      target_category_int: targetCategory,
      allow_lower_category: allowLower,
      season_label: seasonLabel || undefined,
      description: description || undefined,
    });
    revalidatePath("/club/dashboard/tournaments");
    redirectWithOk("/club/dashboard/tournaments", "TOURNAMENT_CREATED", { tournament_id: tournamentId });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 createTournamentAction]", error);
    redirectWithError("/club/dashboard/tournaments", errCode(error), errDebug(error));
  }
}

export async function updateTournamentStatusAction(formData: FormData) {
  const service = new TournamentsService();
  const tournamentId = String(formData.get("tournament_id") || "");
  const nextStatus = String(formData.get("next_status") || "") as "draft" | "active" | "finished";
  const path = detailPath(tournamentId);

  if (!tournamentId) redirectWithError("/club/dashboard/tournaments", "TOURNAMENT_NOT_FOUND");
  if (!["draft", "active", "finished"].includes(nextStatus)) redirectWithError(path, "INVALID_STATUS");

  try {
    await service.updateTournamentStatus(tournamentId, nextStatus);
    revalidatePath(path);
    revalidatePath("/club/dashboard/tournaments");
    redirectWithOk(path, "TOURNAMENT_STATUS_UPDATED", { status: nextStatus });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 updateTournamentStatusAction]", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function registerTournamentTeamAction(formData: FormData) {
  const service = new TournamentsService();
  const tournamentId = String(formData.get("tournament_id") || "");
  const playerA = String(formData.get("player_id_a") || "");
  const playerB = String(formData.get("player_id_b") || "");
  const rawEntry = String(formData.get("entry_category_int") || "").trim();
  const path = detailPath(tournamentId);

  if (!tournamentId || !playerA || !playerB) redirectWithError(path, "INVALID_TEAM_PLAYERS");

  try {
    const teamId = await service.registerTeam({
      tournament_id: tournamentId,
      player_id_a: playerA,
      player_id_b: playerB,
      entry_category_int: rawEntry ? Number(rawEntry) : null,
    });
    revalidatePath(path);
    redirectWithOk(path, "TEAM_REGISTERED", { team_id: teamId });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 registerTournamentTeamAction]", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function removeTournamentTeamAction(formData: FormData) {
  const service = new TournamentsService();
  const teamId = String(formData.get("team_id") || "");
  const tournamentId = String(formData.get("tournament_id") || "");
  const path = detailPath(tournamentId);

  if (!teamId) redirectWithError(path, "TEAM_NOT_FOUND");

  try {
    await service.removeTeam(teamId);
    revalidatePath(path);
    redirectWithOk(path, "TEAM_REMOVED");
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 removeTournamentTeamAction]", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function autoCreateTournamentGroupsAction(formData: FormData) {
  const service = new TournamentsService();
  const tournamentId = String(formData.get("tournament_id") || "");
  const rawCount = String(formData.get("group_count") || "").trim();
  const rawSize = String(formData.get("target_size") || "").trim();
  const path = detailPath(tournamentId);

  if (!tournamentId) redirectWithError(path, "TOURNAMENT_NOT_FOUND");

  try {
    const groups = await service.autoCreateGroups(
      tournamentId,
      rawCount ? Number(rawCount) : undefined,
      rawSize ? Number(rawSize) : undefined
    );
    revalidatePath(path);
    redirectWithOk(path, "GROUPS_CREATED", { groups });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 autoCreateTournamentGroupsAction]", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function assignTournamentTeamToGroupAction(formData: FormData) {
  const service = new TournamentsService();
  const teamId = String(formData.get("team_id") || "");
  const groupId = String(formData.get("group_id") || "");
  const tournamentId = String(formData.get("tournament_id") || "");
  const rawSeedOrder = String(formData.get("seed_order") || "").trim();
  const path = detailPath(tournamentId);

  if (!teamId) redirectWithError(path, "TEAM_NOT_FOUND");
  if (!groupId) redirectWithError(path, "GROUP_NOT_FOUND");

  try {
    await service.assignTeamToGroup(groupId, teamId, rawSeedOrder ? Number(rawSeedOrder) : null);
    revalidatePath(path);
    redirectWithOk(path, "TEAM_ASSIGNED_TO_GROUP");
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 assignTournamentTeamToGroupAction]", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function generateTournamentFixtureAction(formData: FormData) {
  const service = new TournamentsService();
  const groupId = String(formData.get("group_id") || "");
  const tournamentId = String(formData.get("tournament_id") || "");
  const path = detailPath(tournamentId);

  if (!groupId) redirectWithError(path, "GROUP_NOT_FOUND");

  try {
    const created = await service.generateGroupFixture(groupId);
    revalidatePath(path);
    redirectWithOk(path, "FIXTURE_CREATED", { created });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 generateTournamentFixtureAction]", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function reopenTournamentFixtureForEditAction(formData: FormData) {
  const service = new TournamentsService();
  const tournamentId = String(formData.get("tournament_id") || "");
  const confirmText = String(formData.get("confirm_text") || "").trim().toUpperCase();
  const path = detailPath(tournamentId);

  if (!tournamentId) redirectWithError(path, "TOURNAMENT_NOT_FOUND");
  if (confirmText !== "REABRIR") redirectWithError(path, "REOPEN_CONFIRMATION_REQUIRED");

  try {
    const result = await service.reopenFixtureForEdit(tournamentId);
    revalidatePath(path);
    revalidatePath("/club/dashboard/bookings");
    redirectWithOk(path, "FIXTURE_REOPENED_FOR_EDIT", {
      removed_matches: result?.removed_matches || 0,
      removed_bookings: result?.removed_bookings || 0,
    });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 reopenTournamentFixtureForEditAction]", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function scheduleTournamentMatchAction(formData: FormData) {
  const service = new TournamentsService();
  const tournamentMatchId = String(formData.get("tournament_match_id") || "");
  const tournamentId = String(formData.get("tournament_id") || "");
  const courtId = String(formData.get("court_id") || "");
  const date = String(formData.get("match_date") || "");
  const time = String(formData.get("match_time") || "");
  const path = detailPath(tournamentId);
  const errorExtra = tournamentMatchId ? { tournament_match_id: tournamentMatchId } : undefined;

  if (!tournamentMatchId || !courtId || !date || !time) {
    redirectWithError(path, "COMPLETE_SCHEDULE_FIELDS", undefined, errorExtra);
  }

  const when = new Date(`${date}T${time}:00`);
  if (Number.isNaN(when.getTime())) {
    redirectWithError(path, "INVALID_DATE_TIME", undefined, errorExtra);
  }

  try {
    const result = await service.scheduleTournamentMatch({
      tournament_match_id: tournamentMatchId,
      court_id: courtId,
      match_at: when.toISOString(),
    });
    revalidatePath(path);
    revalidatePath("/club/dashboard/bookings");
    redirectWithOk(path, "MATCH_SCHEDULED", { match_id: result?.match_id || "" });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 scheduleTournamentMatchAction]", error);
    redirectWithError(path, errCode(error), errDebug(error), errorExtra);
  }
}

export async function submitTournamentMatchResultAction(formData: FormData) {
  const service = new TournamentsService();
  const tournamentMatchId = String(formData.get("tournament_match_id") || "");
  const tournamentId = String(formData.get("tournament_id") || "");
  const path = detailPath(tournamentId);
  const errorExtra = tournamentMatchId ? { tournament_match_id: tournamentMatchId } : undefined;

  const set1a = Number(formData.get("set1_a"));
  const set1b = Number(formData.get("set1_b"));
  const set2a = Number(formData.get("set2_a"));
  const set2b = Number(formData.get("set2_b"));
  const rawSet3a = String(formData.get("set3_a") || "").trim();
  const rawSet3b = String(formData.get("set3_b") || "").trim();
  const set3a = rawSet3a === "" ? null : Number(rawSet3a);
  const set3b = rawSet3b === "" ? null : Number(rawSet3b);

  if (!tournamentMatchId || !tournamentId) {
    redirectWithError(path, "TOURNAMENT_MATCH_NOT_FOUND", undefined, errorExtra);
  }
  if (
    [set1a, set1b, set2a, set2b].some((n) => Number.isNaN(n)) ||
    (set3a !== null && Number.isNaN(set3a)) ||
    (set3b !== null && Number.isNaN(set3b))
  ) {
    redirectWithError(path, "COMPLETE_RESULT_FIELDS", undefined, errorExtra);
  }

  try {
    await service.submitTournamentMatchResult({
      tournament_match_id: tournamentMatchId,
      set1_a: set1a, set1_b: set1b,
      set2_a: set2a, set2_b: set2b,
      set3_a: set3a, set3_b: set3b,
    });
    revalidatePath(path);
    revalidatePath("/club/dashboard/bookings");
    revalidatePath("/player/matches");
    redirectWithOk(path, "MATCH_RESULT_SAVED", { tournament_match_id: tournamentMatchId });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 submitTournamentMatchResultAction]", error);
    redirectWithError(path, errCode(error), errDebug(error), errorExtra);
  }
}

export async function generateTournamentPlayoffsAction(formData: FormData) {
  const service = new TournamentsService();
  const tournamentId = String(formData.get("tournament_id") || "");
  const path = detailPath(tournamentId);

  if (!tournamentId) redirectWithError(path, "TOURNAMENT_NOT_FOUND");

  try {
    const created = await service.generatePlayoffs(tournamentId);
    revalidatePath(path);
    revalidatePath("/club/dashboard/bookings");
    redirectWithOk(path, "PLAYOFFS_CREATED", { created });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 generateTournamentPlayoffsAction]", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function scheduleTournamentPlayoffMatchAction(formData: FormData) {
  const service = new TournamentsService();
  const playoffMatchId = String(formData.get("playoff_match_id") || "");
  const tournamentId = String(formData.get("tournament_id") || "");
  const courtId = String(formData.get("court_id") || "");
  const date = String(formData.get("match_date") || "");
  const time = String(formData.get("match_time") || "");
  const path = detailPath(tournamentId);
  const errorExtra = playoffMatchId ? { playoff_match_id: playoffMatchId } : undefined;

  if (!playoffMatchId || !courtId || !date || !time) {
    redirectWithError(path, "COMPLETE_SCHEDULE_FIELDS", undefined, errorExtra);
  }

  const when = new Date(`${date}T${time}:00`);
  if (Number.isNaN(when.getTime())) {
    redirectWithError(path, "INVALID_DATE_TIME", undefined, errorExtra);
  }

  try {
    await service.schedulePlayoffMatch({
      playoff_match_id: playoffMatchId,
      court_id: courtId,
      match_at: when.toISOString(),
    });
    revalidatePath(path);
    revalidatePath("/club/dashboard/bookings");
    redirectWithOk(path, "MATCH_SCHEDULED", { playoff_match_id: playoffMatchId });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 scheduleTournamentPlayoffMatchAction]", error);
    redirectWithError(path, errCode(error), errDebug(error), errorExtra);
  }
}

export async function submitTournamentPlayoffMatchResultAction(formData: FormData) {
  const service = new TournamentsService();
  const playoffMatchId = String(formData.get("playoff_match_id") || "");
  const tournamentId = String(formData.get("tournament_id") || "");
  const path = detailPath(tournamentId);
  const errorExtra = playoffMatchId ? { playoff_match_id: playoffMatchId } : undefined;

  const set1a = Number(formData.get("set1_a"));
  const set1b = Number(formData.get("set1_b"));
  const set2a = Number(formData.get("set2_a"));
  const set2b = Number(formData.get("set2_b"));
  const rawSet3a = String(formData.get("set3_a") || "").trim();
  const rawSet3b = String(formData.get("set3_b") || "").trim();
  const set3a = rawSet3a === "" ? null : Number(rawSet3a);
  const set3b = rawSet3b === "" ? null : Number(rawSet3b);

  if (!playoffMatchId || !tournamentId) {
    redirectWithError(path, "PLAYOFF_MATCH_NOT_FOUND", undefined, errorExtra);
  }
  if (
    [set1a, set1b, set2a, set2b].some((n) => Number.isNaN(n)) ||
    (set3a !== null && Number.isNaN(set3a)) ||
    (set3b !== null && Number.isNaN(set3b))
  ) {
    redirectWithError(path, "COMPLETE_RESULT_FIELDS", undefined, errorExtra);
  }

  try {
    await service.submitPlayoffMatchResult({
      playoff_match_id: playoffMatchId,
      set1_a: set1a, set1_b: set1b,
      set2_a: set2a, set2_b: set2b,
      set3_a: set3a, set3_b: set3b,
    });
    revalidatePath(path);
    revalidatePath("/club/dashboard/bookings");
    revalidatePath("/player/matches");
    redirectWithOk(path, "MATCH_RESULT_SAVED", { playoff_match_id: playoffMatchId });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6.2 submitTournamentPlayoffMatchResultAction]", error);
    redirectWithError(path, errCode(error), errDebug(error), errorExtra);
  }
}
