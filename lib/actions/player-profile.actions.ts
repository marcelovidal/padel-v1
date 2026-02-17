"use server";

import { revalidatePath } from "next/cache";
import { PlayerService } from "@/services/player.service";

export async function updatePlayerProfileAction(formData: FormData) {
    const playerService = new PlayerService();

    const playerId = formData.get("player_id") as string;
    const displayName = formData.get("display_name") as string;
    const position = formData.get("position") as "drive" | "reves" | "cualquiera";
    const city = formData.get("city") as string || undefined;
    const city_id = formData.get("city_id") as string || undefined;
    const region_code = formData.get("region_code") as string || undefined;
    const region_name = formData.get("region_name") as string || undefined;
    const country_code = formData.get("country_code") as string || 'AR';
    const avatar_url = formData.get("avatar_url") as string || undefined;

    if (!playerId || !displayName) {
        return { error: "ID y Nombre son obligatorios" };
    }

    try {
        await playerService.updatePlayerProfile({
            player_id: playerId,
            display_name: displayName,
            position,
            city,
            city_id,
            region_code,
            region_name,
            country_code,
            avatar_url
        });

        revalidatePath("/player/profile");
        revalidatePath("/player/players");
        revalidatePath(`/player/players/${playerId}`);
        revalidatePath("/player/matches/new");

        return { data: playerId };
    } catch (error: any) {
        console.error("Error updating player profile:", error);
        if (error.message === 'NOT_ALLOWED') {
            return { error: "No tienes permiso para editar este perfil" };
        }
        return { error: error.message || "Error al actualizar el perfil" };
    }
}
