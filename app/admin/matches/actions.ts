"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { MatchService } from "@/services/match.service";
import {
  createMatchSchema,
  updateMatchSchema,
  addPlayerToMatchSchema,
  createMatchResultSchema,
} from "@/schemas/match.schema";

const matchService = new MatchService();

export async function createMatchAction(
  prevState: { error?: string } | null,
  formData: FormData
) {
  let matchId: string;

  try {
    const matchAt = formData.get("match_at") as string;
    // Convertir datetime-local a ISO string
    const matchAtISO = new Date(matchAt).toISOString();

    const data = {
      match_at: matchAtISO,
      club_name: formData.get("club_name") as string,
      max_players: parseInt(formData.get("max_players") as string) || 4,
      notes: (formData.get("notes") as string) || null,
    };

    const validated = createMatchSchema.parse(data);
    const match = await matchService.createMatch(validated);
    matchId = match.id;
  } catch (error: any) {
    if (error.name === "ZodError") {
      return { error: error.errors[0]?.message || "Datos inválidos" };
    }
    return { error: error.message || "Error al crear el partido" };
  }

  // redirect() debe estar fuera del try/catch para que Next.js maneje la excepción especial
  redirect(`/admin/matches/${matchId}`);
}

export async function updateMatchAction(
  prevState: { error?: string } | null,
  formData: FormData
) {
  try {
    const data = {
      id: formData.get("id") as string,
      match_at: formData.get("match_at") as string | undefined,
      club_name: formData.get("club_name") as string | undefined,
      max_players: formData.get("max_players")
        ? parseInt(formData.get("max_players") as string)
        : undefined,
      notes: formData.get("notes") as string | null | undefined,
    };

    const validated = updateMatchSchema.parse(data);
    await matchService.updateMatch(validated);

    // ok redirigir acá porque es edición de página completa
    redirect(`/admin/matches/${data.id}`);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return { error: error.errors[0]?.message || "Datos inválidos" };
    }
    return { error: error.message || "Error al actualizar el partido" };
  }
}

/**
 * IMPORTANTE:
 * - En formularios embebidos (detalle del partido), NO usar redirect().
 * - Devolver {ok:true} y refrescar desde el cliente (router.refresh()).
 */
export async function addPlayerToMatchAction(
  prevState: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  try {
    const data = {
      match_id: formData.get("match_id") as string,
      player_id: formData.get("player_id") as string,
      team: formData.get("team") as "A" | "B",
    };

    const validated = addPlayerToMatchSchema.parse(data);

    await matchService.addPlayerToMatch(validated);

    // Revalidar rutas (útil si hay caching). En dev igualmente funciona.
    revalidatePath(`/admin/matches/${validated.match_id}`);
    revalidatePath(`/admin/matches`);

    return { ok: true };
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return { error: error.errors[0]?.message || "Datos inválidos", ok: false };
    }

    // Mensaje amigable para duplicados (unique match_id + player_id)
    const msg = String(error?.message || "Error al agregar jugador al partido");
    const isDuplicate =
      msg.includes("duplicate key") ||
      msg.includes("unique") ||
      msg.includes("23505");

    return {
      ok: false,
      error: isDuplicate
        ? "Ese jugador ya está agregado a este partido."
        : msg,
    };
  }
}

export async function removePlayerFromMatchAction(
  matchId: string,
  playerId: string
) {
  try {
    await matchService.removePlayerFromMatch(matchId, playerId);
    redirect(`/admin/matches/${matchId}`);
  } catch (error: any) {
    redirect(
      `/admin/matches/${matchId}?error=${encodeURIComponent(
        error.message || "Error al remover jugador"
      )}`
    );
  }
}

export async function upsertMatchResultAction(
  prevState: { error?: string; ok?: boolean } | null,
  formData: FormData
) {
  try {
    const matchId = formData.get("match_id") as string;
    const winnerTeam = formData.get("winner_team") as "A" | "B";
    const setsCount = parseInt(formData.get("sets_count") as string) || 1;

    const sets = [];
    for (let i = 1; i <= setsCount; i++) {
      const setA = parseInt(formData.get(`set_${i}_a`) as string);
      const setB = parseInt(formData.get(`set_${i}_b`) as string);
      if (!isNaN(setA) && !isNaN(setB)) {
        sets.push({ a: setA, b: setB });
      }
    }

    const data = {
      match_id: matchId,
      sets,
      winner_team: winnerTeam,
    };

    const validated = createMatchResultSchema.parse(data);
    await matchService.upsertMatchResult(validated);

    // Importante: NO redirect acá (useFormState lo interpreta como NEXT_REDIRECT)
    // Si querés revalidar caché, podés agregar revalidatePath si ya lo importaste.
    // revalidatePath(`/admin/matches/${matchId}`);

    return { ok: true };
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return { ok: false, error: error.errors[0]?.message || "Datos inválidos" };
    }
    return { ok: false, error: error.message || "Error al guardar el resultado" };
  }
}

