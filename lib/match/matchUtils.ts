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
