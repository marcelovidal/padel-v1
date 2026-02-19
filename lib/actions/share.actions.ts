"use server";

import { MatchService } from "@/services/match.service";
import { revalidatePath } from "next/cache";

type ShareChannel = "whatsapp" | "copylink" | "webshare";
type ShareContext = "match" | "directory" | "profile";

export async function recordShareAction(matchId: string, channel: ShareChannel = "whatsapp") {
    return recordShareEventAction({
        channel,
        context: "match",
        matchId,
    });
}

export async function recordShareEventAction(input: {
    channel?: ShareChannel;
    context?: ShareContext;
    matchId?: string | null;
}) {
    try {
        const matchSvc = new MatchService();
        await matchSvc.recordShareEvent({
            channel: input.channel || "whatsapp",
            context: input.context || "match",
            matchId: input.matchId || null,
        });
        if (input.matchId) {
            revalidatePath(`/player/matches/${input.matchId}/confirmed`);
        }
        return { success: true };
    } catch (error: any) {
        console.error("Error recording share event:", error);
        return { error: error.message || "Error al registrar el evento de compartir" };
    }
}
