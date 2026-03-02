"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { ClubAdminService } from "@/services/club-admin.service";

type MergeActionResult =
  | {
      success: true;
      mergedCount: number;
      affectedMatchesCount: number;
      idempotentCount: number;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

function parseErrorMessage(error: any): string {
  const raw = [error?.message, error?.details, error?.hint, error?.code].filter(Boolean).join(" ");
  if (raw.includes("NOT_AUTHENTICATED")) return "Sesion invalida. Vuelve a iniciar sesion.";
  if (raw.includes("NOT_ALLOWED")) return "No tienes permisos de administrador para consolidar clubes.";
  if (raw.includes("SAME_CLUB")) return "No se puede fusionar un club sobre si mismo.";
  if (raw.includes("TARGET_ARCHIVED")) return "El club objetivo esta archivado y no puede recibir merges.";
  if (raw.includes("SOURCE_ALREADY_MERGED")) return "El club origen ya fue fusionado hacia otro destino.";
  if (raw.includes("SOURCE_NOT_FOUND") || raw.includes("TARGET_NOT_FOUND")) {
    return "No se encontro uno de los clubes seleccionados.";
  }
  return "No pudimos consolidar los clubes. Revisa los datos e intenta nuevamente.";
}

export async function mergeClubClusterAction(
  _prevState: MergeActionResult | { success: null } | null,
  formData: FormData
): Promise<MergeActionResult> {
  await requireAdmin();

  const targetClubId = String(formData.get("targetClubId") || "").trim();
  const note = String(formData.get("note") || "").trim();
  const sourceClubIds = formData
    .getAll("sourceClubIds")
    .map((v) => String(v).trim())
    .filter(Boolean);

  if (!targetClubId) {
    return { success: false, error: "Selecciona un club objetivo para consolidar." };
  }

  const uniqueSourceIds = Array.from(new Set(sourceClubIds)).filter((id) => id !== targetClubId);
  if (uniqueSourceIds.length === 0) {
    return { success: false, error: "Selecciona al menos un club origen para fusionar." };
  }

  const service = new ClubAdminService();

  try {
    let mergedCount = 0;
    let idempotentCount = 0;
    let affectedMatchesCount = 0;

    for (const sourceId of uniqueSourceIds) {
      const result = await service.mergeClubs(sourceId, targetClubId, note || null);
      if (result.ok) {
        mergedCount += 1;
        affectedMatchesCount += result.affected_matches_count || 0;
        if (result.idempotent) idempotentCount += 1;
      }
    }

    revalidatePath("/admin/clubs/duplicates");
    revalidatePath("/admin/club-claims");
    revalidatePath(`/admin/clubs/${targetClubId}/preview`);

    return {
      success: true,
      mergedCount,
      idempotentCount,
      affectedMatchesCount,
      message:
        mergedCount === 1
          ? `Consolidacion completada. Partidos reasignados: ${affectedMatchesCount}.`
          : `Consolidaciones completadas: ${mergedCount}. Partidos reasignados: ${affectedMatchesCount}.`,
    };
  } catch (error: any) {
    return { success: false, error: parseErrorMessage(error) };
  }
}
