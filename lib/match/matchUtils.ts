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
 * Cantidad de jugadores que el partido necesita para estar completo.
 * Se apoya en max_players (CHECK 2..4 en base); ante cualquier valor
 * inesperado cae en 4, que es el tamaño real de un partido de padel.
 */
export function getExpectedRosterSize(match: any): number {
    const raw = Number(match?.max_players);
    if (!Number.isFinite(raw) || raw < 2 || raw > 4) return 4;
    return raw;
}

/**
 * Cuenta los jugadores cargados en un partido.
 * Tolera las tres formas en que llega un partido según el origen:
 *  - match_players[] (repository.findById, admin)
 *  - playersByTeam { A, B } (repository.findByPlayerId, MatchCard)
 *  - players_count (RPCs agregados, ej. panel del club)
 */
export function getMatchRosterCount(match: any): number {
    if (!match) return 0;

    if (Array.isArray(match.match_players)) {
        return match.match_players.length;
    }

    const byTeam = match.playersByTeam;
    if (byTeam) {
        return (byTeam.A?.length || 0) + (byTeam.B?.length || 0);
    }

    if (typeof match.players_count === "number") {
        return match.players_count;
    }

    return 0;
}

/**
 * Jugadores que faltan cargar para que el partido esté completo.
 */
export function getMissingPlayersCount(match: any): number {
    if (!match) return 0;
    return Math.max(0, getExpectedRosterSize(match) - getMatchRosterCount(match));
}

/**
 * Un partido con menos jugadores de los que necesita está INCOMPLETO,
 * sin importar la fecha: el orden lógico es jugadores → resultado →
 * autoevaluación, y los dos últimos no tienen sentido sin el primero.
 * Los cancelados quedan fuera: no hay nada que completar.
 */
export function isMatchIncomplete(match: any): boolean {
    if (!match) return false;
    if (match.status === "cancelled") return false;
    return getMissingPlayersCount(match) > 0;
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

