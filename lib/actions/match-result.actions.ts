"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const submitResultSchema = z.object({
    match_id: z.string().uuid(),
    set1_a: z.number().int().min(0, "Los juegos no pueden ser negativos"),
    set1_b: z.number().int().min(0, "Los juegos no pueden ser negativos"),
    set2_a: z.number().int().min(0, "Los juegos no pueden ser negativos"),
    set2_b: z.number().int().min(0, "Los juegos no pueden ser negativos"),
    set3_a: z.number().int().min(0, "Los juegos no pueden ser negativos").optional().nullable(),
    set3_b: z.number().int().min(0, "Los juegos no pueden ser negativos").optional().nullable(),
});

export async function submitMatchResultAsPlayer(prevState: any, formData: FormData) {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "No estás autenticado" };
    }

    // 2. Extract and Validate
    const rawData = {
        match_id: formData.get("match_id"),
        set1_a: Number(formData.get("set1_a")),
        set1_b: Number(formData.get("set1_b")),
        set2_a: Number(formData.get("set2_a")),
        set2_b: Number(formData.get("set2_b")),
        set3_a: formData.get("set3_a") ? Number(formData.get("set3_a")) : null,
        set3_b: formData.get("set3_b") ? Number(formData.get("set3_b")) : null,
    };

    const validated = submitResultSchema.safeParse(rawData);
    if (!validated.success) {
        return { error: validated.error.errors[0].message };
    }

    const { match_id, set1_a, set1_b, set2_a, set2_b, set3_a, set3_b } = validated.data;

    try {
        const sb = supabase as any;

        const { data, error } = await sb.rpc("player_submit_match_result", {
            p_match_id: match_id,
            p_set1_a: set1_a,
            p_set1_b: set1_b,
            p_set2_a: set2_a,
            p_set2_b: set2_b,
            p_set3_a: set3_a,
            p_set3_b: set3_b
        });

        if (error) {
            throw error;
        }

    } catch (err: any) {
        // Map common errors
        if (err.message?.includes('MATCH_NOT_FOUND_OR_NOT_PARTICIPANT')) {
            return { error: "No se encontró el partido o no participas en él." };
        }
        if (err.message?.includes('RESULT_ALREADY_EXISTS')) {
            return { error: "Ya existe un resultado para este partido." };
        }
        if (err.message?.includes('MATCH_NOT_COMPLETED')) {
            return { error: "Solo se pueden cargar resultados para partidos finalizados." };
        }
        if (err.message?.includes('INVALID_SCORES')) {
            return { error: "Los marcadores proporcionados no son válidos." };
        }

        return { error: err.message || "Error al cargar el resultado" };
    }

    revalidatePath("/player/matches");
    revalidatePath("/player");
    revalidatePath("/player/profile");
    revalidatePath(`/player/matches/${match_id}`);
    redirect(`/player/matches/${match_id}`);
}
