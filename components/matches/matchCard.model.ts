import { Database, TeamType } from "@/types/database";
import { hasMatchResult, getEffectiveStatus } from "@/lib/match/matchUtils";

export type Match = Database["public"]["Tables"]["matches"]["Row"];
export type MatchResult = Database["public"]["Tables"]["match_results"]["Row"];

export type PlayerMini = { id: string; first_name: string; last_name: string; avatar_url?: string | null } | null;

export interface MatchCardModel {
    id: string;
    clubName: string;
    matchAt: Date;
    status: "scheduled" | "completed" | "cancelled";
    statusLabel: string;
    maxPlayers: number;
    playersByTeam: {
        A: PlayerMini[];
        B: PlayerMini[];
    };
    results?: {
        sets: Array<{ a: number | null; b: number | null }>;
        winnerTeam: TeamType;
    } | null;
    playerTeam?: TeamType; // Context for the current player
    hasAssessment?: boolean;
    hasResults?: boolean;
}

export function toMatchCardModel(
    match: any, // Can be improved with better types if available
    ctx?: { playerTeam?: TeamType; hasAssessment?: boolean; hasResults?: boolean }
): MatchCardModel {
    const statusLabels: Record<string, string> = {
        scheduled: "Programado",
        completed: "Finalizado",
        cancelled: "Cancelado",
    };

    const calculatedHasResults = hasMatchResult(match);
    const effectiveStatus = getEffectiveStatus(match);

    return {
        id: match.id,
        clubName: match.club_name,
        matchAt: new Date(match.match_at),
        status: effectiveStatus,
        statusLabel: statusLabels[effectiveStatus] || effectiveStatus,
        maxPlayers: match.max_players,
        playersByTeam: match.playersByTeam || { A: [], B: [] },
        results: calculatedHasResults
            ? {
                sets: match.match_results.sets,
                winnerTeam: match.match_results.winner_team,
            }
            : null,
        playerTeam: ctx?.playerTeam,
        hasAssessment: ctx?.hasAssessment ?? match.hasAssessment,
        hasResults: ctx?.hasResults ?? calculatedHasResults,
    };
}
