"use server";

import { revalidatePath } from "next/cache";
import { RankingService } from "@/services/ranking.service";
import { requireClub } from "@/lib/auth";

type RankingActionErrorCode =
  | "NOT_AUTHENTICATED"
  | "NOT_ALLOWED"
  | "CLUB_NOT_FOUND"
  | "UNKNOWN";

function inferRankingErrorCode(error: any): RankingActionErrorCode {
  const raw = [error?.message, error?.details, error?.hint, error?.code]
    .filter(Boolean)
    .join(" ");

  if (raw.includes("NOT_AUTHENTICATED")) return "NOT_AUTHENTICATED";
  if (raw.includes("NOT_ALLOWED")) return "NOT_ALLOWED";
  if (raw.includes("CLUB_NOT_FOUND")) return "CLUB_NOT_FOUND";
  return "UNKNOWN";
}

function errorMessageFor(code: RankingActionErrorCode): string {
  switch (code) {
    case "NOT_AUTHENTICATED":
      return "Necesitas iniciar sesion para continuar.";
    case "NOT_ALLOWED":
      return "No tienes permisos para recalcular el ranking del club.";
    case "CLUB_NOT_FOUND":
      return "No encontramos el club solicitado.";
    default:
      return "No pudimos recalcular el ranking. Intenta nuevamente.";
  }
}

export async function clubRecalculateRankingAction(clubId?: string) {
  try {
    const { club } = await requireClub();
    const rankingService = new RankingService();
    await rankingService.recalculateClubRanking(clubId || club.id);

    revalidatePath("/club/dashboard");
    revalidatePath("/club/dashboard/ranking");
    revalidatePath("/player/profile");
    return { success: true as const };
  } catch (error: any) {
    const code = inferRankingErrorCode(error);
    return {
      success: false as const,
      code,
      error: errorMessageFor(code),
    };
  }
}
