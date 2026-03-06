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
    clubLocation?: string | null;
    clubUnclaimed?: boolean;
    clubGeneratedPending?: boolean;
    league?: {
        id: string;
        name: string;
        seasonLabel?: string | null;
        groupName?: string | null;
    } | null;
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
    const playersByTeam = match.playersByTeam || { A: [], B: [] };
    const rosterCount = (playersByTeam.A?.length || 0) + (playersByTeam.B?.length || 0);
    const notesText = String(match?.notes || "");
    const clubGeneratedPending =
        effectiveStatus === "scheduled" &&
        rosterCount < (match.max_players || 4) &&
        notesText.toLowerCase().includes("partido generado por club");

    const club = Array.isArray(match?.clubs) ? match.clubs[0] : match?.clubs;
    const leagueInfo = (() => {
        if (match?.league?.id && match?.league?.name) {
            return {
                id: match.league.id,
                name: match.league.name,
                seasonLabel: match.league.season_label ?? null,
                groupName: match.league.group_name ?? null,
            };
        }
        const lm = Array.isArray(match?.league_matches) ? match.league_matches[0] : match?.league_matches;
        const lg = Array.isArray(lm?.league_groups) ? lm.league_groups[0] : lm?.league_groups;
        const ld = Array.isArray(lg?.league_divisions) ? lg.league_divisions[0] : lg?.league_divisions;
        const cl = Array.isArray(ld?.club_leagues) ? ld.club_leagues[0] : ld?.club_leagues;
        if (!cl?.id || !cl?.name) return null;
        return {
            id: cl.id,
            name: cl.name,
            seasonLabel: cl.season_label ?? null,
            groupName: lg?.name ?? null,
        };
    })();

    return {
        id: match.id,
        clubName: match.club_name,
        matchAt: new Date(match.match_at),
        status: effectiveStatus,
        statusLabel: statusLabels[effectiveStatus] || effectiveStatus,
        maxPlayers: match.max_players,
        playersByTeam,
        results: calculatedHasResults
            ? {
                sets: match.match_results.sets,
                winnerTeam: match.match_results.winner_team,
            }
            : null,
        playerTeam: ctx?.playerTeam,
        hasAssessment: ctx?.hasAssessment ?? match.hasAssessment,
        hasResults: ctx?.hasResults ?? calculatedHasResults,
        clubLocation: club
            ? [club.city, club.region_name || club.region_code].filter(Boolean).join(" - ")
            : null,
        clubUnclaimed: club
            ? (typeof club.claimed === "boolean"
                ? !club.claimed
                : club.claim_status !== "claimed")
            : false,
        clubGeneratedPending,
        league: leagueInfo,
    };
}
