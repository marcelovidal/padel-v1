"use server";

import { PlayerService } from "@/services/player.service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const playerService = new PlayerService();

/**
 * Traduce los errores que la base devuelve en crudo.
 *
 * `players.phone` tiene un UNIQUE parcial sobre el texto TAL COMO SE TIPEO
 * (uq_players_phone_not_null). Dos personas que comparten linea y la escriben
 * distinto conviven sin problema, pero si la escriben igual, el INSERT explota.
 *
 * Sin esta traduccion el string crudo de Postgres — "duplicate key value
 * violates unique constraint..." — le llegaba tal cual a la persona, porque el
 * catch de abajo devuelve `error.message` sin mirar.
 */
function friendlyOnboardingError(error: any): string {
  const code = String(error?.code || "");
  const raw = [error?.message, error?.details, error?.constraint]
    .filter(Boolean)
    .join(" ");

  if (code === "23505" || raw.includes("duplicate key")) {
    if (raw.includes("uq_players_phone_not_null")) {
      return "Ese telefono ya figura en otra cuenta de PASALA. Si es tuyo y perdiste el acceso, escribinos.";
    }
    if (raw.includes("uq_players_user_id")) {
      return "Ya tenes un perfil en PASALA con esta cuenta.";
    }
    return "Alguno de los datos ya figura en otra cuenta de PASALA.";
  }

  if (raw.includes("PHONE_REQUIRED")) return "Necesitamos tu celular para completar el perfil.";
  if (raw.includes("DISPLAY_NAME_REQUIRED")) return "Necesitamos un nombre para mostrar.";
  if (raw.includes("POSITION_REQUIRED")) return "Elegi una posicion.";
  if (raw.includes("INVALID_CATEGORY")) return "Elegi una categoria entre 1 y 7.";
  if (raw.includes("NOT_AUTHENTICATED")) return "Tu sesion expiro. Volve a ingresar.";

  return "No pudimos completar tu perfil. Intenta de nuevo en unos minutos.";
}

/**
 * Tipo explicito para que el cliente no tenga que adivinar la forma del
 * resultado a partir de la union de los returns.
 */
export type CompleteOnboardingResult =
    | { success: true; redirect: string; linked: boolean }
    | { success: false; code?: string; error: string };

export async function completeOnboardingAction(
    prevState: any,
    formData: FormData
): Promise<CompleteOnboardingResult> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const payload = {
        display_name: formData.get("display_name") as string,
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
        phone: formData.get("phone") as string,
        position: formData.get("position") as any,
        category: Number(formData.get("category")),
        country_code: formData.get("country_code") as string || 'AR',
        region_code: formData.get("region_code") as string,
        region_name: formData.get("region_name") as string,
        city: formData.get("city") as string,
        city_id: formData.get("city_id") as string,
        birth_year: formData.get("birth_year") ? Number(formData.get("birth_year")) : undefined,
        avatar_url: formData.get("avatar_url") as string,
        email: user.email ?? undefined,
    };

    // Antes de crear nada: si esta persona ya existia como jugador sin reclamar
    // —cargada por un amigo en un partido, o inscripta a un torneo desde el
    // formulario publico— se la vincula a su perfil de siempre en vez de
    // duplicarla. Con eso, completeOnboarding de abajo encuentra al jugador por
    // user_id y toma su rama UPDATE.
    //
    // Solo vincula cuando hay UN candidato sin reclamar. Dos personas pueden
    // compartir linea, y fusionarlas seria peor que duplicar.
    let linkOutcome: string = "no_phone";
    try {
        const linked = await playerService.linkUnclaimedByPhone(payload.phone);
        linkOutcome = linked.outcome;
    } catch (error: any) {
        // Que la vinculacion falle no puede impedir que la persona se registre:
        // el onboarding sigue y, como mucho, crea un perfil nuevo — que es
        // exactamente lo que pasaba antes de este fix.
        console.error("[onboarding] link por telefono fallo:", error?.message || error);
    }

    try {
        await playerService.completeOnboarding(payload);
    } catch (error: any) {
        if (error.message === "ONBOARDING_ALREADY_COMPLETED") {
            return { success: false, code: "ONBOARDING_ALREADY_COMPLETED", error: "El onboarding ya fue completado para este usuario." };
        }
        return { success: false, error: friendlyOnboardingError(error) };
    }

    revalidatePath("/player");
    revalidatePath("/player/profile");

    return { success: true, redirect: "/player", linked: linkOutcome === "linked" };
}

export async function uploadAvatarAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const file = formData.get("file") as File;
    if (!file) return { error: "No se proporcionó ningún archivo" };

    try {
        const path = await playerService.uploadAvatar(file, user.id);
        const signedUrl = await playerService.getAvatarUrl(path);
        return { success: true, path, signedUrl };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
