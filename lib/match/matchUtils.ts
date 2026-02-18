import { Database } from "@/types/database";

type MatchResult = Database["public"]["Tables"]["match_results"]["Row"];

/**
 * Tipos de sets soportados en la base de datos
 */
type SetDb =
    | { a: number; b: number }
    | { team_a_games: number; team_b_games: number };

/**
 * Formato normalizado de sets para la UI
 */
export type NormalizedSet = { a: number | null; b: number | null };

/**
 * Formato normalizado de match_results para la UI
 */
export type NormalizedMatchResult = {
    match_id: string;
    sets: NormalizedSet[];
    winner_team: "A" | "B" | null;
    recorded_at: string;
} | null;

/**
 * Normaliza sets de cualquier formato a { a, b }
 * Soporta tanto el formato viejo { a, b } como el nuevo { team_a_games, team_b_games }
 */
export function normalizeSets(sets?: SetDb[] | null): NormalizedSet[] {
    if (!sets || !Array.isArray(sets)) return [];
    return sets.map((s: any) => ({
        a: s.a ?? s.team_a_games ?? null,
        b: s.b ?? s.team_b_games ?? null,
    }));
}

/**
 * Normaliza un objeto match_results completo
 * Convierte sets a formato { a, b } y preserva winner_team y recorded_at
 * Esta es la función principal que debe usarse en repositorios para garantizar
 * que todos los componentes reciban datos en formato consistente
 */
export function normalizeMatchResult(result: any): NormalizedMatchResult {
    if (!result) return null;

    return {
        match_id: result.match_id,
        sets: normalizeSets(result.sets),
        winner_team: result.winner_team,
        recorded_at: result.recorded_at
    };
}

/**
 * Unifies the logic to check if a match has a valid result recorded.
 * Handles both repository objects (where match_results might be a single object or null)
 * and raw objects from different joins.
 * Now uses normalizeSets to ensure compatibility with all set formats.
 */
export function hasMatchResult(match: any): boolean {
    if (!match) return false;

    // Case 1: match_results is a single object (repository common shape)
    if (match.match_results && !Array.isArray(match.match_results)) {
        const res = match.match_results;
        const normalized = normalizeSets(res.sets);
        return normalized.length >= 2;
    }

    // Case 2: match_results is an array (result of some joins)
    if (Array.isArray(match.match_results) && match.match_results.length > 0) {
        const firstResult = match.match_results[0];
        if (firstResult && firstResult.sets) {
            const normalized = normalizeSets(firstResult.sets);
            return normalized.length >= 2;
        }
    }

    // Fallback: check manual flag if repository set it
    if (match.hasResults !== undefined) {
        return !!match.hasResults;
    }

    return false;
}
/**
 * Calculates the "effective" status of a match for UI purposes.
 * It's a defensive fallback: if the DB still says 'scheduled' but the time
 * has passed, we treat it as 'completed' so the user can see results or load them.
 */
export function getEffectiveStatus(match: any): "scheduled" | "completed" | "cancelled" {
    if (!match) return "scheduled";
    if (match.status === "cancelled") return "cancelled";
    if (match.status === "completed") return "completed";

    // If scheduled, check if time has passed (give 5 mins buffer)
    const matchTime = new Date(match.match_at).getTime();
    const now = new Date().getTime();
    const buffer = 5 * 60 * 1000; // 5 minutes

    if (now > (matchTime + buffer)) {
        return "completed";
    }

    return "scheduled";
}

/**
 * Formats match sets as a string (e.g., "6–4 6–4").
 * Uses en-dash (–) for professional look or hyphen as fallback.
 */
export function formatMatchSets(sets?: NormalizedSet[] | null): string {
    if (!sets || !Array.isArray(sets) || sets.length === 0) return "Sin resultado";

    return sets
        .filter(s => s.a !== null && s.b !== null)
        .map(s => `${s.a}–${s.b}`)
        .join(" ");
}

/** Formats a player as "F. Apellido" matching the match score UI display. */
function formatPlayerShortName(firstName?: string | null, lastName?: string | null): string {
    if (!firstName && !lastName) return "?";
    if (!lastName) return firstName!;
    return `${firstName!.charAt(0)}. ${lastName}`;
}

/**
 * Generates the standardized 4-line WhatsApp share message.
 * Handles two different match data shapes:
 *  - Detail page: match.match_players[] with nested .players { first_name, last_name }
 *  - List view:   match.playersByTeam { A: [{first_name, last_name}], B: [...] }
 */
export function generateMatchShareMessage(match: any, siteUrl: string): string {
    const sets = match.match_results?.sets || match.results?.sets || [];
    const setsFormatted = formatMatchSets(sets);

    let teamANames = "";
    let teamBNames = "";

    if (match.playersByTeam) {
        // List view shape: { A: [{first_name, last_name, ...}], B: [...] }
        teamANames = (match.playersByTeam.A as any[])
            .map((p: any) => formatPlayerShortName(p?.first_name, p?.last_name))
            .join(" / ");
        teamBNames = (match.playersByTeam.B as any[])
            .map((p: any) => formatPlayerShortName(p?.first_name, p?.last_name))
            .join(" / ");
    } else if (match.match_players) {
        // Detail page shape: [{ team: "A", players: { first_name, last_name } }]
        const teamA = (match.match_players as any[]).filter((p: any) => p.team === "A");
        const teamB = (match.match_players as any[]).filter((p: any) => p.team === "B");
        teamANames = teamA.map((p: any) => formatPlayerShortName(p.players?.first_name, p.players?.last_name)).join(" / ");
        teamBNames = teamB.map((p: any) => formatPlayerShortName(p.players?.first_name, p.players?.last_name)).join(" / ");
    }

    const publicLink = `${siteUrl}/m/${match.id}`;

    return [
        "Partido cargado en PASALA ->",
        `${teamANames} vs ${teamBNames}`,
        `Resultado: ${setsFormatted}`,
        publicLink,
    ].join("\n");
}
