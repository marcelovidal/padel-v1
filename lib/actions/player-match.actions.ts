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
    notes: z.string().optional().nullable(),
});

export async function createMatchAsPlayer(prevState: any, formData: FormData) {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return { error: "No estás autenticado o tu sesión ha expirado" };
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
        notes: formData.get("notes"),
    };

    const validated = createMatchSchema.safeParse(rawData);
    if (!validated.success) {
        return { error: validated.error.errors[0].message };
    }

    const { date, time, club_name, player_id, partner_id, opponent1_id, opponent2_id, notes } = validated.data;

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
            p_status: "scheduled",
            p_notes: notes || null,
            p_max_players: 4
        });

        if (matchError) {
            throw matchError;
        }

    } catch (err: any) {
        if (process.env.NODE_ENV !== 'production') {
            console.error("Error creating match:", err);
        }

        // Map specific PG errors to user friendly messages
        if (err.message?.includes('No active player linked')) {
            return { error: "Tu usuario no tiene un perfil de jugador activo vinculado." };
        }
        if (err.code === '42501') {
            return { error: "Permiso denegado (42501). Verifica políticas RLS." };
        }
        return { error: err.message || "Error al crear el partido" };
    }

    revalidatePath("/player/matches");
    revalidatePath("/player");
    redirect("/player/matches");
}
