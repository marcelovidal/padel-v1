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

    // 1. Auth check: Ensure we have a valid session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error("Auth Error:", authError);
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
        // 4. Insert Match
        // Note: We REMOVED created_by from the payload to rely on DEFAULT auth.uid()
        // and avoid RLS policy violations during explicit assignment.
        const sb = supabase as any;
        const { data: match, error: matchError } = await sb
            .from("matches")
            .insert({
                match_at: matchTimestamp,
                club_name: club_name,
                max_players: 4,
                status: "scheduled"
            })
            .select("id, created_by")
            .single();

        if (matchError) {
            console.error("Match Insert Error:", matchError);
            throw matchError;
        }

        console.log(`[INFO] Match created successfully: ${match.id} (Owner: ${match.created_by})`);

        // 5. Insert Players
        const playersToInsert = [
            { match_id: match.id, player_id: player_id, team: "A" },
            { match_id: match.id, player_id: partner_id, team: "A" },
            { match_id: match.id, player_id: opponent1_id, team: "B" },
            { match_id: match.id, player_id: opponent2_id, team: "B" },
        ];

        const { error: playersError } = await sb
            .from("match_players")
            .insert(playersToInsert);

        if (playersError) {
            console.error("Match Players Insert Error:", playersError);
            throw playersError;
        }

    } catch (err: any) {
        console.error("Error creating match:", err);
        if (err.code === '42501') {
            return { error: "No tienes permisos para crear este partido. Verifica la política RLS." };
        }
        return { error: err.message || "Error al crear el partido" };
    }

    revalidatePath("/player/matches");
    revalidatePath("/player");
    redirect("/player/matches");
}
