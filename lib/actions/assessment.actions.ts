"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAssessmentSchema } from "@/schemas/assessment.schema";
import { AssessmentService } from "@/services/assessment.service";
import { MatchService } from "@/services/match.service";
import { Database } from "@/types/database";

const assessmentService = new AssessmentService();
const matchService = new MatchService();

type AssessmentInsert = Database["public"]["Tables"]["player_match_assessments"]["Insert"];
type AssessmentProgressInput = Partial<AssessmentInsert> & {
  match_id: string;
  player_id: string;
};

const strokeFields = [
  "volea",
  "globo",
  "remate",
  "bandeja",
  "vibora",
  "bajada_pared",
  "saque",
  "recepcion_saque",
] as const;

async function resolveSubmittedBy() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) return null;

  const { data: profile } = await (supabase as any)
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  return profile?.id ?? null;
}

function revalidateAssessmentPaths(matchId: string) {
  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath(`/player/matches/${matchId}`);
  revalidatePath(`/player/matches`);
  revalidatePath(`/player`);
  revalidatePath(`/player/profile`);
}

async function assertCanAssess(matchId: string, playerId: string) {
  const match = await matchService.getMatchById(matchId);
  if (!match) {
    throw new Error("Partido no encontrado");
  }

  const isCompleted = match.status === "completed" || !!match.match_results?.winner_team;
  if (!isCompleted) {
    throw new Error("No se puede crear autoevaluación: el partido no tiene resultado");
  }

  const belongs = (match.match_players || []).some((mp: any) => mp.player_id === playerId);
  if (!belongs) {
    throw new Error("El jugador no pertenece a este partido");
  }

  return match;
}

function toNullableNumber(formData: FormData, key: string) {
  const raw = formData.get(key);
  if (raw === null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? null : n;
}

export async function createAssessmentAction(
  prevState: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  try {
    const data = {
      match_id: formData.get("match_id") as string,
      player_id: formData.get("player_id") as string,
      volea: toNullableNumber(formData, "volea"),
      globo: toNullableNumber(formData, "globo"),
      remate: toNullableNumber(formData, "remate"),
      bandeja: toNullableNumber(formData, "bandeja"),
      vibora: toNullableNumber(formData, "vibora"),
      bajada_pared: toNullableNumber(formData, "bajada_pared"),
      saque: toNullableNumber(formData, "saque"),
      recepcion_saque: toNullableNumber(formData, "recepcion_saque"),
      comments: (formData.get("comments") as string) || null,
      submitted_by: (formData.get("submitted_by") as string) || null,
    };

    const validated = createAssessmentSchema.parse(data);
    const allowedFromRoute = (formData.get("player_id_from_route") as string) || null;
    if (allowedFromRoute && validated.player_id !== allowedFromRoute) {
      throw new Error("No autorizado para crear autoevaluación para este jugador");
    }

    await assertCanAssess(validated.match_id, validated.player_id);

    const payload: AssessmentInsert = {
      ...validated,
      volea: validated.volea ?? null,
      globo: validated.globo ?? null,
      remate: validated.remate ?? null,
      bandeja: validated.bandeja ?? null,
      vibora: validated.vibora ?? null,
      bajada_pared: validated.bajada_pared ?? null,
      saque: validated.saque ?? null,
      recepcion_saque: validated.recepcion_saque ?? null,
      comments: validated.comments ?? null,
      submitted_by: (await resolveSubmittedBy()) ?? validated.submitted_by ?? null,
    };

    await assessmentService.saveAssessmentProgress(payload);
    revalidateAssessmentPaths(validated.match_id);

    return { ok: true };
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return { ok: false, error: error.errors[0]?.message || "Datos inválidos" };
    }

    return {
      ok: false,
      error: String(error?.message || "Error al guardar la autoevaluación"),
    };
  }
}

export async function saveAssessmentProgressAction(input: {
  match_id: string;
  player_id: string;
  player_id_from_route?: string | null;
  field?: (typeof strokeFields)[number];
  value?: number | null;
  comments?: string | null;
  allow_empty?: boolean;
}) {
  try {
    const allowedFromRoute = input.player_id_from_route || null;
    if (allowedFromRoute && allowedFromRoute !== input.player_id) {
      throw new Error("No autorizado para crear autoevaluación para este jugador");
    }

    createAssessmentSchema.pick({ match_id: true, player_id: true }).parse({
      match_id: input.match_id,
      player_id: input.player_id,
    });

    if (input.field && typeof input.value === "number") {
      if (input.value < 1 || input.value > 5) {
        throw new Error("Datos inválidos");
      }
    }

    await assertCanAssess(input.match_id, input.player_id);

    const payload: AssessmentProgressInput = {
      match_id: input.match_id,
      player_id: input.player_id,
      submitted_by: await resolveSubmittedBy(),
    };

    if (typeof input.comments !== "undefined") {
      payload.comments = input.comments ?? null;
    }

    if (input.field) {
      (payload as any)[input.field] = input.value ?? null;
    }

    const assessment = await assessmentService.saveAssessmentProgress(payload, {
      allowEmpty: input.allow_empty ?? true,
    });

    revalidateAssessmentPaths(input.match_id);
    return { ok: true, assessment };
  } catch (error: any) {
    return {
      ok: false,
      error: String(error?.message || "Error al guardar la autoevaluación"),
    };
  }
}

export async function getAssessmentCompletionSnapshotAction(input: {
  match_id: string;
  player_id: string;
  player_id_from_route?: string | null;
}) {
  try {
    const allowedFromRoute = input.player_id_from_route || null;
    if (allowedFromRoute && allowedFromRoute !== input.player_id) {
      throw new Error("No autorizado para ver esta autoevaluación");
    }

    const assessment = await assessmentService.getPlayerAssessmentInMatch(input.match_id, input.player_id);
    return { ok: true, assessment };
  } catch (error: any) {
    return {
      ok: false,
      error: String(error?.message || "Error al obtener la autoevaluación"),
    };
  }
}

