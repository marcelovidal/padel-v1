"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { LeaguesService } from "@/services/leagues.service";

function isNextRedirectError(error: any): boolean {
  return typeof error?.digest === "string" && error.digest.startsWith("NEXT_REDIRECT");
}

function errCode(error: any): string {
  const raw = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ");
  if (raw.includes("NOT_AUTHENTICATED")) return "NOT_AUTHENTICATED";
  if (raw.includes("NOT_ALLOWED")) return "NOT_ALLOWED";
  if (raw.includes("LEAGUE_NOT_FOUND")) return "LEAGUE_NOT_FOUND";
  if (raw.includes("DIVISION_NOT_FOUND")) return "DIVISION_NOT_FOUND";
  if (raw.includes("GROUP_NOT_FOUND")) return "GROUP_NOT_FOUND";
  if (raw.includes("TEAM_NOT_FOUND")) return "TEAM_NOT_FOUND";
  if (raw.includes("TEAM_HAS_FIXTURE")) return "TEAM_HAS_FIXTURE";
  if (raw.includes("TEAM_REGISTRATION_CLOSED_BY_FIXTURE")) return "TEAM_REGISTRATION_CLOSED_BY_FIXTURE";
  if (raw.includes("LEAGUE_NOT_DRAFT")) return "LEAGUE_NOT_DRAFT";
  if (raw.includes("NO_FIXTURE_FOR_DIVISION")) return "NO_FIXTURE_FOR_DIVISION";
  if (raw.includes("COMPLETED_MATCHES_EXIST")) return "COMPLETED_MATCHES_EXIST";
  if (raw.includes("PLAYER_NOT_FOUND")) return "PLAYER_NOT_FOUND";
  if (raw.includes("LEAGUE_MATCH_NOT_FOUND")) return "LEAGUE_MATCH_NOT_FOUND";
  if (raw.includes("FIXTURE_ALREADY_EXISTS")) return "FIXTURE_ALREADY_EXISTS";
  if (raw.includes("NOT_ENOUGH_TEAMS")) return "NOT_ENOUGH_TEAMS";
  if (raw.includes("INVALID_NAME")) return "INVALID_NAME";
  if (raw.includes("INVALID_STATUS")) return "INVALID_STATUS";
  if (raw.includes("INVALID_CATEGORY_MODE")) return "INVALID_CATEGORY_MODE";
  if (raw.includes("INVALID_CATEGORY_VALUE")) return "INVALID_CATEGORY_VALUE";
  if (raw.includes("INVALID_TEAM_PLAYERS")) return "INVALID_TEAM_PLAYERS";
  if (raw.includes("PLAYER_CATEGORY_REQUIRED")) return "PLAYER_CATEGORY_REQUIRED";
  if (raw.includes("CATEGORY_NOT_ALLOWED")) return "CATEGORY_NOT_ALLOWED";
  if (raw.includes("CATEGORY_SUM_NOT_ALLOWED")) return "CATEGORY_SUM_NOT_ALLOWED";
  if (raw.includes("TEAM_DIVISION_MISMATCH")) return "TEAM_DIVISION_MISMATCH";
  if (raw.includes("BOOKING_OVERLAP")) return "BOOKING_OVERLAP";
  if (raw.includes("BOOKING_PLAYER_OVERLAP")) return "BOOKING_PLAYER_OVERLAP";
  if (raw.includes("BOOKING_OUTSIDE_HOURS")) return "BOOKING_OUTSIDE_HOURS";
  if (raw.includes("BOOKING_INVALID_SLOT")) return "BOOKING_INVALID_SLOT";
  if (raw.includes("RESULT_ALREADY_EXISTS")) return "RESULT_ALREADY_EXISTS";
  if (raw.includes("MATCH_NOT_COMPLETED")) return "MATCH_NOT_COMPLETED";
  if (raw.includes("INVALID_SCORES")) return "INVALID_SCORES";
  if (raw.includes("PLAYOFF_ALREADY_EXISTS")) return "PLAYOFF_ALREADY_EXISTS";
  if (raw.includes("GROUP_STAGE_INCOMPLETE")) return "GROUP_STAGE_INCOMPLETE";
  if (raw.includes("NO_FIXTURE_FOR_GROUP")) return "NO_FIXTURE_FOR_GROUP";
  if (raw.includes("NOT_ENOUGH_QUALIFIED_TEAMS")) return "NOT_ENOUGH_QUALIFIED_TEAMS";
  if (raw.includes("UNSUPPORTED_GROUP_COUNT_FOR_PLAYOFF")) return "UNSUPPORTED_GROUP_COUNT_FOR_PLAYOFF";
  if (raw.includes("PLAYOFF_MATCH_NOT_FOUND")) return "PLAYOFF_MATCH_NOT_FOUND";
  if (raw.includes("PLAYOFF_TEAMS_NOT_DEFINED")) return "PLAYOFF_TEAMS_NOT_DEFINED";
  if (raw.includes("LEAGUE_ALREADY_FINISHED")) return "LEAGUE_ALREADY_FINISHED";
  if (raw.includes("PLAYER_ALREADY_REGISTERED_IN_DIVISION")) return "PLAYER_ALREADY_REGISTERED_IN_DIVISION";
  if (raw.includes("DUPLICATE_PLAYER_IN_GROUP")) return "DUPLICATE_PLAYER_IN_GROUP";
  if (raw.includes("unique_player_match")) return "DUPLICATE_PLAYER_IN_GROUP";
  if (raw.includes("violates row-level security policy")) return "RLS_VIOLATION";
  if (raw.includes("violates not-null constraint")) return "NOT_NULL_VIOLATION";
  if (raw.includes("violates foreign key constraint")) return "FK_VIOLATION";
  if (raw.includes("duplicate key value")) return "DUPLICATE_KEY";
  if (raw.includes("invalid input syntax")) return "INVALID_INPUT_SYNTAX";
  if (typeof error?.code === "string" && error.code.trim().length > 0) return error.code;
  return "UNKNOWN";
}

function detailPath(leagueId: string) {
  return `/club/dashboard/leagues/${leagueId}`;
}

function errDebug(error: any) {
  const raw = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" | ");
  return raw.slice(0, 180);
}

function redirectWithError(
  basePath: string,
  code: string,
  debug?: string,
  extra?: Record<string, string | number>
) {
  const qs = new URLSearchParams({ error: code });
  if (debug) qs.set("debug", debug);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      qs.set(k, String(v));
    }
  }
  redirect(`${basePath}?${qs.toString()}`);
}

function redirectWithOk(basePath: string, code: string, extra?: Record<string, string | number>) {
  const qs = new URLSearchParams({ ok: code });
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      qs.set(k, String(v));
    }
  }
  redirect(`${basePath}?${qs.toString()}`);
}

export async function createLeagueAction(formData: FormData) {
  const service = new LeaguesService();
  const clubId = String(formData.get("club_id") || "");
  const name = String(formData.get("name") || "").trim();
  const seasonLabel = String(formData.get("season_label") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const status = String(formData.get("status") || "draft") as "draft" | "active" | "finished";

  if (!clubId || !name) {
    redirectWithError("/club/dashboard/leagues", "COMPLETE_REQUIRED_FIELDS");
  }

  try {
    const leagueId = await service.createLeague({
      club_id: clubId,
      name,
      season_label: seasonLabel || undefined,
      description: description || undefined,
      status,
    });
    revalidatePath("/club/dashboard/leagues");
    redirectWithOk("/club/dashboard/leagues", "LEAGUE_CREATED", { league_id: leagueId });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 createLeagueAction] RPC error", error);
    redirectWithError("/club/dashboard/leagues", errCode(error), errDebug(error));
  }
}

export async function createDivisionAction(formData: FormData) {
  const service = new LeaguesService();
  const leagueId = String(formData.get("league_id") || "");
  const name = String(formData.get("name") || "").trim();
  const mode = String(formData.get("category_mode") || "OPEN") as "SINGLE" | "SUM" | "OPEN";
  const rawVal = String(formData.get("category_value_int") || "").trim();
  const allowOverride = String(formData.get("allow_override") || "") === "on";
  const path = detailPath(leagueId);

  if (!leagueId || !name) {
    redirectWithError(path, "COMPLETE_REQUIRED_FIELDS");
  }

  try {
    const divisionId = await service.createDivision({
      league_id: leagueId,
      name,
      category_mode: mode,
      category_value_int: rawVal ? Number(rawVal) : null,
      allow_override: allowOverride,
    });
    revalidatePath(path);
    redirectWithOk(path, "DIVISION_CREATED", { division_id: divisionId });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 createDivisionAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function updateLeagueStatusAction(formData: FormData) {
  const service = new LeaguesService();
  const leagueId = String(formData.get("league_id") || "");
  const nextStatus = String(formData.get("next_status") || "") as "draft" | "active" | "finished";
  const path = detailPath(leagueId);

  if (!leagueId) {
    redirectWithError("/club/dashboard/leagues", "LEAGUE_NOT_FOUND");
  }

  if (!["draft", "active", "finished"].includes(nextStatus)) {
    redirectWithError(path, "INVALID_STATUS");
  }

  try {
    await service.updateLeagueStatus(leagueId, nextStatus);
    revalidatePath(path);
    revalidatePath("/club/dashboard/leagues");
    redirectWithOk(path, "LEAGUE_STATUS_UPDATED", { status: nextStatus });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 updateLeagueStatusAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function registerLeagueTeamAction(formData: FormData) {
  const service = new LeaguesService();
  const divisionId = String(formData.get("division_id") || "");
  const leagueId = String(formData.get("league_id") || "");
  const playerA = String(formData.get("player_id_a") || "");
  const playerB = String(formData.get("player_id_b") || "");
  const rawEntry = String(formData.get("entry_category_int") || "").trim();
  const path = detailPath(leagueId);

  if (!divisionId || !playerA || !playerB) {
    redirectWithError(path, "INVALID_TEAM_PLAYERS");
  }

  try {
    const teamId = await service.registerTeam({
      division_id: divisionId,
      player_id_a: playerA,
      player_id_b: playerB,
      entry_category_int: rawEntry ? Number(rawEntry) : null,
    });
    revalidatePath(path);
    redirectWithOk(path, "TEAM_REGISTERED", { team_id: teamId });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 registerLeagueTeamAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function autoCreateGroupsAction(formData: FormData) {
  const service = new LeaguesService();
  const divisionId = String(formData.get("division_id") || "");
  const leagueId = String(formData.get("league_id") || "");
  const rawCount = String(formData.get("group_count") || "").trim();
  const rawSize = String(formData.get("target_size") || "").trim();
  const path = detailPath(leagueId);

  if (!divisionId) {
    redirectWithError(path, "DIVISION_NOT_FOUND");
  }

  try {
    const groups = await service.autoCreateGroups(
      divisionId,
      rawCount ? Number(rawCount) : undefined,
      rawSize ? Number(rawSize) : undefined
    );
    revalidatePath(path);
    redirectWithOk(path, "GROUPS_CREATED", { groups });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 autoCreateGroupsAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function reopenDivisionFixtureForEditAction(formData: FormData) {
  const service = new LeaguesService();
  const divisionId = String(formData.get("division_id") || "");
  const leagueId = String(formData.get("league_id") || "");
  const confirmText = String(formData.get("confirm_text") || "").trim().toUpperCase();
  const path = detailPath(leagueId);

  if (!divisionId) {
    redirectWithError(path, "DIVISION_NOT_FOUND");
  }

  if (confirmText !== "REABRIR") {
    redirectWithError(path, "REOPEN_CONFIRMATION_REQUIRED");
  }

  try {
    const result = await service.reopenDivisionFixtureForEdit(divisionId);
    revalidatePath(path);
    revalidatePath("/club/dashboard/bookings");
    redirectWithOk(path, "FIXTURE_REOPENED_FOR_EDIT", {
      removed_matches: result?.removed_matches || 0,
      removed_bookings: result?.removed_bookings || 0,
    });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 reopenDivisionFixtureForEditAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function assignTeamToGroupAction(formData: FormData) {
  const service = new LeaguesService();
  const teamId = String(formData.get("team_id") || "");
  const groupId = String(formData.get("group_id") || "");
  const leagueId = String(formData.get("league_id") || "");
  const rawSeedOrder = String(formData.get("seed_order") || "").trim();
  const path = detailPath(leagueId);

  if (!teamId) {
    redirectWithError(path, "TEAM_NOT_FOUND");
  }
  if (!groupId) {
    redirectWithError(path, "GROUP_NOT_FOUND");
  }

  try {
    await service.assignTeamToGroup(groupId, teamId, rawSeedOrder ? Number(rawSeedOrder) : null);
    revalidatePath(path);
    redirectWithOk(path, "TEAM_ASSIGNED_TO_GROUP");
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 assignTeamToGroupAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function removeLeagueTeamAction(formData: FormData) {
  const service = new LeaguesService();
  const teamId = String(formData.get("team_id") || "");
  const leagueId = String(formData.get("league_id") || "");
  const path = detailPath(leagueId);

  if (!teamId) {
    redirectWithError(path, "TEAM_NOT_FOUND");
  }

  try {
    await service.removeTeam(teamId);
    revalidatePath(path);
    redirectWithOk(path, "TEAM_REMOVED");
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 removeLeagueTeamAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function generateFixtureAction(formData: FormData) {
  const service = new LeaguesService();
  const groupId = String(formData.get("group_id") || "");
  const leagueId = String(formData.get("league_id") || "");
  const path = detailPath(leagueId);

  if (!groupId) {
    redirectWithError(path, "GROUP_NOT_FOUND");
  }

  try {
    const created = await service.generateGroupFixture(groupId);
    revalidatePath(path);
    redirectWithOk(path, "FIXTURE_CREATED", { created });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 generateFixtureAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function scheduleLeagueMatchAction(formData: FormData) {
  const service = new LeaguesService();
  const leagueMatchId = String(formData.get("league_match_id") || "");
  const leagueId = String(formData.get("league_id") || "");
  const courtId = String(formData.get("court_id") || "");
  const date = String(formData.get("match_date") || "");
  const time = String(formData.get("match_time") || "");
  const path = detailPath(leagueId);
  const errorExtra = leagueMatchId ? { league_match_id: leagueMatchId } : undefined;

  if (!leagueMatchId || !courtId || !date || !time) {
    redirectWithError(path, "COMPLETE_SCHEDULE_FIELDS", undefined, errorExtra);
  }

  const when = new Date(`${date}T${time}:00`);
  if (Number.isNaN(when.getTime())) {
    redirectWithError(path, "INVALID_DATE_TIME", undefined, errorExtra);
  }

  try {
    const result = await service.scheduleLeagueMatch({
      league_match_id: leagueMatchId,
      court_id: courtId,
      match_at: when.toISOString(),
    });
    revalidatePath(path);
    revalidatePath("/club");
    revalidatePath("/club/dashboard/bookings");
    redirectWithOk(path, "MATCH_SCHEDULED", { match_id: result?.match_id || "" });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 scheduleLeagueMatchAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error), errorExtra);
  }
}

export async function generateDivisionPlayoffsAction(formData: FormData) {
  const service = new LeaguesService();
  const divisionId = String(formData.get("division_id") || "");
  const leagueId = String(formData.get("league_id") || "");
  const path = detailPath(leagueId);

  if (!divisionId) {
    redirectWithError(path, "DIVISION_NOT_FOUND");
  }

  try {
    const created = await service.generateDivisionPlayoffs(divisionId);
    revalidatePath(path);
    revalidatePath("/club");
    revalidatePath("/club/dashboard/bookings");
    redirectWithOk(path, "PLAYOFFS_CREATED", { created });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 generateDivisionPlayoffsAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error));
  }
}

export async function submitLeagueMatchResultAction(formData: FormData) {
  const service = new LeaguesService();
  const leagueMatchId = String(formData.get("league_match_id") || "");
  const leagueId = String(formData.get("league_id") || "");
  const path = detailPath(leagueId);
  const errorExtra = leagueMatchId ? { league_match_id: leagueMatchId } : undefined;

  const set1a = Number(formData.get("set1_a"));
  const set1b = Number(formData.get("set1_b"));
  const set2a = Number(formData.get("set2_a"));
  const set2b = Number(formData.get("set2_b"));
  const rawSet3a = String(formData.get("set3_a") || "").trim();
  const rawSet3b = String(formData.get("set3_b") || "").trim();
  const set3a = rawSet3a === "" ? null : Number(rawSet3a);
  const set3b = rawSet3b === "" ? null : Number(rawSet3b);

  if (!leagueMatchId || !leagueId) {
    redirectWithError(path, "LEAGUE_MATCH_NOT_FOUND", undefined, errorExtra);
  }

  if (
    [set1a, set1b, set2a, set2b].some((n) => Number.isNaN(n)) ||
    (set3a !== null && Number.isNaN(set3a)) ||
    (set3b !== null && Number.isNaN(set3b))
  ) {
    redirectWithError(path, "COMPLETE_RESULT_FIELDS", undefined, errorExtra);
  }

  try {
    await service.submitLeagueMatchResult({
      league_match_id: leagueMatchId,
      set1_a: set1a,
      set1_b: set1b,
      set2_a: set2a,
      set2_b: set2b,
      set3_a: set3a,
      set3_b: set3b,
    });
    revalidatePath(path);
    revalidatePath("/club");
    revalidatePath("/club/dashboard/bookings");
    revalidatePath("/player/matches");
    redirectWithOk(path, "MATCH_RESULT_SAVED", { league_match_id: leagueMatchId });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 submitLeagueMatchResultAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error), errorExtra);
  }
}

export async function schedulePlayoffMatchAction(formData: FormData) {
  const service = new LeaguesService();
  const playoffMatchId = String(formData.get("playoff_match_id") || "");
  const leagueId = String(formData.get("league_id") || "");
  const courtId = String(formData.get("court_id") || "");
  const date = String(formData.get("match_date") || "");
  const time = String(formData.get("match_time") || "");
  const path = detailPath(leagueId);
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
    revalidatePath("/club");
    revalidatePath("/club/dashboard/bookings");
    redirectWithOk(path, "MATCH_SCHEDULED", { playoff_match_id: playoffMatchId });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 schedulePlayoffMatchAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error), errorExtra);
  }
}

export async function submitPlayoffMatchResultAction(formData: FormData) {
  const service = new LeaguesService();
  const playoffMatchId = String(formData.get("playoff_match_id") || "");
  const leagueId = String(formData.get("league_id") || "");
  const path = detailPath(leagueId);
  const errorExtra = playoffMatchId ? { playoff_match_id: playoffMatchId } : undefined;

  const set1a = Number(formData.get("set1_a"));
  const set1b = Number(formData.get("set1_b"));
  const set2a = Number(formData.get("set2_a"));
  const set2b = Number(formData.get("set2_b"));
  const rawSet3a = String(formData.get("set3_a") || "").trim();
  const rawSet3b = String(formData.get("set3_b") || "").trim();
  const set3a = rawSet3a === "" ? null : Number(rawSet3a);
  const set3b = rawSet3b === "" ? null : Number(rawSet3b);

  if (!playoffMatchId || !leagueId) {
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
      set1_a: set1a,
      set1_b: set1b,
      set2_a: set2a,
      set2_b: set2b,
      set3_a: set3a,
      set3_b: set3b,
    });
    revalidatePath(path);
    revalidatePath("/club");
    revalidatePath("/club/dashboard/bookings");
    revalidatePath("/player/matches");
    redirectWithOk(path, "MATCH_RESULT_SAVED", { playoff_match_id: playoffMatchId });
  } catch (error: any) {
    if (isNextRedirectError(error)) throw error;
    console.error("[Q6 submitPlayoffMatchResultAction] RPC error", error);
    redirectWithError(path, errCode(error), errDebug(error), errorExtra);
  }
}
