"use server";

import { PlayerService } from "@/services/player.service";
import { revalidatePath } from "next/cache";

const playerService = new PlayerService();

export async function createGuestPlayerAction(formData: FormData) {
    const display_name = formData.get("display_name") as string;
    const first_name = formData.get("first_name") as string || undefined;
    const last_name = formData.get("last_name") as string || undefined;
    const phone = formData.get("phone") as string || undefined;
    const position = formData.get("position") as any || "cualquiera";
    const city = formData.get("city") as string || undefined;
    const city_id = formData.get("city_id") as string || undefined;
    const region_code = formData.get("region_code") as string || undefined;
    const region_name = formData.get("region_name") as string || undefined;
    const country_code = formData.get("country_code") as string || 'AR';

    if (!display_name) {
        return { error: "El nombre a mostrar es obligatorio" };
    }

    try {
        const playerId = await playerService.createGuestPlayer({
            display_name,
            first_name,
            last_name,
            phone,
            position,
            city,
            city_id,
            region_code,
            region_name,
            country_code
        });

        revalidatePath("/player/matches/new");
        return { data: playerId };
    } catch (error: any) {
        console.error("Error creating guest player:", error);
        return { error: error.message || "Error al crear el jugador invitado" };
    }
}

export async function findSimilarPlayersAction(query: string) {
    if (!query || query.length < 2) return { data: [] };

    try {
        const players = await playerService.findSimilarPlayers(query);
        return { data: players };
    } catch (error: any) {
        return { error: error.message || "Error al buscar jugadores similares" };
    }
}

export async function claimProfileAction(playerId: string) {
    try {
        const claimedId = await playerService.claimProfile(playerId);
        revalidatePath("/player");
        revalidatePath("/player/profile");
        return { data: claimedId };
    } catch (error: any) {
        if (error.message?.includes("USER_ALREADY_HAS_PLAYER")) {
            return { error: "Tu usuario ya tiene un perfil de jugador vinculado." };
        }
        if (error.message?.includes("TARGET_NOT_FOUND_OR_ALREADY_CLAIMED")) {
            return { error: "El perfil seleccionado ya no está disponible para ser reclamado." };
        }
        return { error: error.message || "Error al reclamar el perfil" };
    }
}
