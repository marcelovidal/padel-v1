"use server";

import { MatchService } from "@/services/match.service";
import { revalidatePath } from "next/cache";

export async function recordShareAction(matchId: string, channel: string = 'whatsapp') {
    try {
        const matchSvc = new MatchService();
        await matchSvc.recordShareEvent(matchId, channel);
        revalidatePath(`/player/matches/${matchId}/confirmed`);
        return { success: true };
    } catch (error: any) {
        console.error("Error recording share event:", error);
        return { error: error.message || "Error al registrar el evento de compartir" };
    }
}
