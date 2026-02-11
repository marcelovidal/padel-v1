"use server";

import { revalidatePath } from "next/cache";
import { MatchService } from "@/services/match.service";
import { createAssessmentSchema } from "@/schemas/assessment.schema";
import { AssessmentService } from "@/services/assessment.service";
import { createClient } from "@/lib/supabase/server";

const assessmentService = new AssessmentService();
const matchService = new MatchService();

export async function createAssessmentAction(
    prevState: { error?: string; ok?: boolean } | null,
    formData: FormData
) {
    try {
        const toNullableNumber = (key: string) => {
            const raw = formData.get(key);
            if (raw === null) return null;
            const s = String(raw).trim();
            if (s === '') return null;
            const n = parseInt(s, 10);
            return isNaN(n) ? null : n;
        };

        const data = {
            match_id: formData.get("match_id") as string,
            player_id: formData.get("player_id") as string,
            volea: toNullableNumber("volea"),
            globo: toNullableNumber("globo"),
            remate: toNullableNumber("remate"),
            bandeja: toNullableNumber("bandeja"),
            vibora: toNullableNumber("vibora"),
            bajada_pared: toNullableNumber("bajada_pared"),
            saque: toNullableNumber("saque"),
            recepcion_saque: toNullableNumber("recepcion_saque"),
            comments: (formData.get("comments") as string) || null,
            submitted_by: (formData.get("submitted_by") as string) || null,
        };

        const validated = createAssessmentSchema.parse(data);

        // Guardrail: if caller provided allowed player id from route, validate it matches
        const allowedFromRoute = (formData.get("player_id_from_route") as string) || null;
        if (allowedFromRoute && validated.player_id !== allowedFromRoute) {
            throw new Error("No autorizado para crear autoevaluación para este jugador");
        }

        // Verify match exists and is completed, and that player belongs to match
        const match = await matchService.getMatchById(validated.match_id);
        if (!match) throw new Error("Partido no encontrado");
        const isCompleted = match.status === "completed" || !!match.match_results?.winner_team;
        if (!isCompleted) throw new Error("No se puede crear autoevaluación: el partido no tiene resultado");
        const belongs = (match.match_players || []).some((mp: any) => mp.player_id === validated.player_id);
        if (!belongs) throw new Error("El jugador no pertenece a este partido");

        // Prefer submitted_by from authenticated user if available
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();
        if (user) {
            data.submitted_by = user.id;
        }

        // Normalize optional fields to explicit nulls so they match DB Insert shape
        const payload = {
            ...validated,
            volea: validated.volea ?? null,
            globo: validated.globo ?? null,
            remate: validated.remate ?? null,
            bandeja: validated.bandeja ?? null,
            vibora: validated.vibora ?? null,
            bajada_pared: validated.bajada_pared ?? null,
            saque: validated.saque ?? null,
            recepcion_saque: validated.recepcion_saque ?? null,
        };

        await assessmentService.createAssessment(payload as any);

        revalidatePath(`/admin/matches/${validated.match_id}`);
        revalidatePath(`/player/matches/${validated.match_id}`);
        revalidatePath(`/player/matches`);
        revalidatePath(`/player`);
        revalidatePath(`/player/profile`); // Revalidate player profile too

        return { ok: true };
    } catch (error: any) {
        if (error?.name === "ZodError") {
            return { ok: false, error: error.errors[0]?.message || "Datos inválidos" };
        }

        const msg = String(error?.message || "Error al guardar la autoevaluación");
        const isDuplicate = msg.includes("duplicate key") || msg.includes("unique") || msg.includes("23505");

        return {
            ok: false,
            error: isDuplicate ? "Ya existe una autoevaluación para este jugador en este partido." : msg,
        };
    }
}
