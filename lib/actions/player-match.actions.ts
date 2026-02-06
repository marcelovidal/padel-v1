"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const createMatchSchema = z.object({
    date: z.string().min(1, "La fecha es requerida"),
    time: z.string().min(1, "La hora es requerida"),
    club_name: z.string().min(1, "El club es requerido"),
    player_id: z.string().uuid(),
    partner_id: z.string().uuid("Selecciona un compañero"),
    opponent1_id: z.string().uuid("Selecciona rival 1"),
    opponent2_id: z.string().uuid("Selecciona rival 2"),
});

export async function createMatchAsPlayer(prevState: any, formData: FormData) {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "No estás autenticado" };
    }

    // 2. Validate Input
    const rawData = {
        date: formData.get("date"),
        time: formData.get("time"),
        club_name: formData.get("club_name"),
        player_id: formData.get("player_id"),
        partner_id: formData.get("partner_id"),
        opponent1_id: formData.get("opponent1_id"),
        opponent2_id: formData.get("opponent2_id"),
    };

    const validated = createMatchSchema.safeParse(rawData);
    if (!validated.success) {
        return { error: validated.error.errors[0].message };
    }

    const { date, time, club_name, player_id, partner_id, opponent1_id, opponent2_id } = validated.data;

    // 3. Logic Validation
    const allPlayers = [player_id, partner_id, opponent1_id, opponent2_id];
    const uniquePlayers = new Set(allPlayers);
    if (uniquePlayers.size !== 4) {
        return { error: "No puedes repetir jugadores en el partido" };
    }

    const matchTimestamp = `${date}T${time}:00`;

    try {
        const sb = supabase as any;

        // 4. Atomic Creation via SECURITY DEFINER RPC
        const { data: matchId, error: matchError } = await sb.rpc("player_create_match_with_players", {
            p_match_at: matchTimestamp,
            p_club_name: club_name,
            p_partner_id: partner_id,
            p_opp1_id: opponent1_id,
            p_opp2_id: opponent2_id,
            p_notes: null, // Notes not supported in form yet, but handled by RPC
            p_max_players: 4
        });

        if (matchError) {
            throw matchError;
        }

    } catch (err: any) {
        // Map common errors
        if (err.message?.includes('PLAYER_PROFILE_NOT_FOUND')) {
            return { error: "Tu usuario no tiene un perfil de jugador vinculado." };
        }
        if (err.message?.includes('DUPLICATE_PLAYERS')) {
            return { error: "No puedes repetir jugadores en el partido." };
        }

        return { error: err.message || "Error al crear el partido" };
    }

    revalidatePath("/player/matches");
    revalidatePath("/player");
    redirect("/player/matches");
}

export async function updateMatchAsPlayer(matchId: string, formData: FormData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    const date = formData.get("date") as string;
    const time = formData.get("time") as string;
    const club_name = formData.get("club_name") as string;
    const notes = formData.get("notes") as string;

    const matchTimestamp = `${date}T${time}:00`;

    try {
        const { error } = await (supabase as any).rpc("player_update_match", {
            p_match_id: matchId,
            p_match_at: matchTimestamp,
            p_club_name: club_name,
            p_notes: notes || null
        });

        if (error) throw error;

    } catch (err: any) {
        return { error: err.message || "Error al actualizar el partido" };
    }

    revalidatePath("/player/matches");
    revalidatePath(`/player/matches/${matchId}`);
    redirect(`/player/matches/${matchId}`);
}

export async function cancelMatchAsPlayer(matchId: string) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "No autenticado" };

    try {
        const { error } = await (supabase as any).rpc("player_cancel_match", {
            p_match_id: matchId
        });

        if (error) throw error;

    } catch (err: any) {
        return { error: err.message || "Error al cancelar el partido" };
    }

    revalidatePath("/player/matches");
    revalidatePath(`/player/matches/${matchId}`);
    revalidatePath("/player");
    redirect("/player/matches");
}

