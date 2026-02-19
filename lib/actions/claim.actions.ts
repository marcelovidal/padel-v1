"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PlayerService } from "@/services/player.service";

type ClaimErrorCode =
  | "CLAIM_NOT_ALLOWED"
  | "PROFILE_ALREADY_CLAIMED"
  | "PLAYER_NOT_FOUND"
  | "NOT_AUTHENTICATED"
  | "USER_ALREADY_HAS_PROFILE"
  | "CLAIM_IDENTITY_REQUIRED"
  | "CLAIM_IDENTITY_MISMATCH"
  | "UNKNOWN";

function inferErrorCode(error: any): ClaimErrorCode {
  const raw = [
    error?.message,
    error?.details,
    error?.hint,
    error?.code,
  ]
    .filter(Boolean)
    .join(" ");

  if (raw.includes("CLAIM_NOT_ALLOWED")) return "CLAIM_NOT_ALLOWED";
  if (raw.includes("PROFILE_ALREADY_CLAIMED")) return "PROFILE_ALREADY_CLAIMED";
  if (raw.includes("PLAYER_NOT_FOUND")) return "PLAYER_NOT_FOUND";
  if (raw.includes("NOT_AUTHENTICATED")) return "NOT_AUTHENTICATED";
  if (raw.includes("USER_ALREADY_HAS_PROFILE")) return "USER_ALREADY_HAS_PROFILE";
  if (raw.includes("CLAIM_IDENTITY_REQUIRED")) return "CLAIM_IDENTITY_REQUIRED";
  if (raw.includes("CLAIM_IDENTITY_MISMATCH")) return "CLAIM_IDENTITY_MISMATCH";
  return "UNKNOWN";
}

function errorMessageFor(code: ClaimErrorCode): string {
  switch (code) {
    case "CLAIM_NOT_ALLOWED":
      return "No pudimos validar este reclamo. Verifica que el perfil pertenezca al partido compartido.";
    case "PROFILE_ALREADY_CLAIMED":
      return "Este perfil ya fue reclamado por otro usuario.";
    case "PLAYER_NOT_FOUND":
      return "No encontramos el perfil que intentas reclamar.";
    case "NOT_AUTHENTICATED":
      return "Necesitas iniciar sesion para reclamar tu perfil.";
    case "USER_ALREADY_HAS_PROFILE":
      return "Ya tenes un perfil en PASALA. Si necesitas reclamar otro, contacta soporte.";
    case "CLAIM_IDENTITY_REQUIRED":
      return "Necesitamos nombre y apellido para validar tu identidad.";
    case "CLAIM_IDENTITY_MISMATCH":
      return "Los datos no coinciden con el perfil objetivo.";
    default:
      return "No pudimos completar el reclamo. Intenta nuevamente en unos minutos.";
  }
}

export async function claimProfileAction(input: {
  targetPlayerId: string;
  matchId?: string | null;
  next?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false as const,
      code: "NOT_AUTHENTICATED" as const,
      error: errorMessageFor("NOT_AUTHENTICATED"),
    };
  }

  const playerService = new PlayerService();

  try {
    await playerService.claimProfileV2(input.targetPlayerId, input.matchId || undefined);

    const { data: claimedPlayer } = await (supabase
      .from("players")
      .select("id, onboarding_completed")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .maybeSingle() as any);

    revalidatePath("/player");
    revalidatePath("/player/profile");
    revalidatePath("/player/players");

    const nextPath = input.next || "/player";
    const redirectTo = claimedPlayer?.onboarding_completed
      ? nextPath
      : `/welcome/onboarding?next=${encodeURIComponent(nextPath)}`;

    return {
      success: true as const,
      redirectTo,
    };
  } catch (error: any) {
    const code = inferErrorCode(error);
    return {
      success: false as const,
      code,
      error: errorMessageFor(code),
    };
  }
}

export async function finalizeClaimFlowAction(input: {
  targetPlayerId: string;
  matchId?: string | null;
  next?: string | null;
  onboarding: {
    display_name: string;
    first_name: string;
    last_name: string;
    phone: string;
    position: "drive" | "reves" | "cualquiera";
    category: number;
    country_code?: string;
    region_code?: string;
    region_name?: string;
    city?: string;
    city_id?: string;
    birth_year?: number | null;
    avatar_url?: string | null;
  };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false as const,
      code: "NOT_AUTHENTICATED" as const,
      error: errorMessageFor("NOT_AUTHENTICATED"),
    };
  }

  const playerService = new PlayerService();

  try {
    await playerService.claimProfileV2(input.targetPlayerId, input.matchId || undefined);
    await playerService.completeOnboarding({
      ...input.onboarding,
      country_code: input.onboarding.country_code || "AR",
      avatar_url: input.onboarding.avatar_url || undefined,
      birth_year: input.onboarding.birth_year ?? undefined,
    });

    revalidatePath("/player");
    revalidatePath("/player/profile");
    revalidatePath("/player/players");

    return {
      success: true as const,
      redirectTo: input.next || "/player",
    };
  } catch (error: any) {
    if (String(error?.message || "").includes("ONBOARDING_ALREADY_COMPLETED")) {
      return {
        success: true as const,
        redirectTo: input.next || "/player",
      };
    }

    const code = inferErrorCode(error);
    return {
      success: false as const,
      code,
      error: errorMessageFor(code),
    };
  }
}
