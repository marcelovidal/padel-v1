import { Database } from "@/types/database";

type MatchResult = Database["public"]["Tables"]["match_results"]["Row"];

/**
 * Unifies the logic to check if a match has a valid result recorded.
 * Handles both repository objects (where match_results might be a single object or null)
 * and raw objects from different joins.
 */
export function hasMatchResult(match: any): boolean {
    if (!match) return false;

    // Case 1: match_results is a single object (repository common shape)
    if (match.match_results && !Array.isArray(match.match_results)) {
        return !!(match.match_results.sets && (match.match_results.sets as any[]).length > 0);
    }

    // Case 2: match_results is an array (result of some joins)
    if (Array.isArray(match.match_results) && match.match_results.length > 0) {
        const firstResult = match.match_results[0];
        return !!(firstResult && firstResult.sets && (firstResult.sets as any[]).length > 0);
    }

    // Fallback: check manual flag if repository set it
    if (match.hasResults !== undefined) {
        return !!match.hasResults;
    }

    return false;
}
