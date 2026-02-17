"use server";

import { requirePlayer } from "@/lib/auth";
import { AssessmentRepository } from "@/repositories/assessment.repository";

export async function getPlayerMatchAssessmentAction(matchId: string) {
    try {
        const { player } = await requirePlayer();
        const repository = new AssessmentRepository();

        const assessment = await repository.findByMatchAndPlayer(matchId, player.id);

        if (!assessment) {
            return { success: true, data: null };
        }

        return { success: true, data: assessment };
    } catch (error: any) {
        return { success: false, error: error?.message || "Error al obtener la autoevaluación" };
    }
}
