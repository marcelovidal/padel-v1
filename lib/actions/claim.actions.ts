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
    | "UNKNOWN";

function inferErrorCode(error: any): ClaimErrorCode {
    const raw = [
        error?.message,
        error?.details,
        error?.hint,
        error?.code,
    ].filter(Boolean).join(" ");

    if (raw.includes("CLAIM_NOT_ALLOWED")) return "CLAIM_NOT_ALLOWED";
    if (raw.includes("PROFILE_ALREADY_CLAIMED")) return "PROFILE_ALREADY_CLAIMED";
    if (raw.includes("PLAYER_NOT_FOUND")) return "PLAYER_NOT_FOUND";
    if (raw.includes("NOT_AUTHENTICATED")) return "NOT_AUTHENTICATED";
    if (raw.includes("USER_ALREADY_HAS_PROFILE")) return "USER_ALREADY_HAS_PROFILE";
    return "UNKNOWN";
}

function errorMessageFor(code: ClaimErrorCode): string {
    switch (code) {
        case "CLAIM_NOT_ALLOWED":
            return "No pudimos validar este reclamo. Verificá que el perfil pertenezca al partido compartido.";
        case "PROFILE_ALREADY_CLAIMED":
            return "Este perfil ya fue reclamado por otro usuario.";
        case "PLAYER_NOT_FOUND":
            return "No encontramos el perfil que intentás reclamar.";
        case "NOT_AUTHENTICATED":
            return "Necesitás iniciar sesión para reclamar tu perfil.";
        case "USER_ALREADY_HAS_PROFILE":
            return "Ya tenés un perfil en PASALA. Si necesitás reclamar otro, contactá soporte.";
        default:
            return "No pudimos completar el reclamo. Intentá nuevamente en unos minutos.";
    }
}

export async function claimProfileAction(input: { targetPlayerId: string; matchId?: string | null; next?: string | null }) {
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
