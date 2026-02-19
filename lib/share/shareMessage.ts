import { formatMatchSets } from "@/lib/match/matchUtils";

function formatPlayerShortName(firstName?: string | null, lastName?: string | null): string {
    if (!firstName && !lastName) return "?";
    if (!lastName) return firstName || "?";
    return `${firstName?.charAt(0)}. ${lastName}`;
}

export function buildPublicMatchUrl(matchId: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/m/${matchId}`;
}

export function buildShareMessage(match: any, siteUrl: string): string {
    const sets = match.match_results?.sets || match.results?.sets || [];
    const setsFormatted = formatMatchSets(sets);
    const winnerTeam = match.match_results?.winner_team || match.results?.winner_team || null;

    let teamANames = "";
    let teamBNames = "";

    if (match.playersByTeam) {
        teamANames = (match.playersByTeam.A as any[])
            .map((p: any) => formatPlayerShortName(p?.first_name, p?.last_name))
            .join(" / ");
        teamBNames = (match.playersByTeam.B as any[])
            .map((p: any) => formatPlayerShortName(p?.first_name, p?.last_name))
            .join(" / ");
    } else if (match.match_players) {
        const teamA = (match.match_players as any[]).filter((p: any) => p.team === "A");
        const teamB = (match.match_players as any[]).filter((p: any) => p.team === "B");
        teamANames = teamA.map((p: any) => formatPlayerShortName(p.players?.first_name, p.players?.last_name)).join(" / ");
        teamBNames = teamB.map((p: any) => formatPlayerShortName(p.players?.first_name, p.players?.last_name)).join(" / ");
    }

    const publicLink = buildPublicMatchUrl(match.id, siteUrl);

    if (winnerTeam === "A" || winnerTeam === "B") {
        const winners = winnerTeam === "A" ? teamANames : teamBNames;
        const losers = winnerTeam === "A" ? teamBNames : teamANames;
        return [
            `Partido cargado en PASALA. El resultado fue ganadores ${winners} a ${losers} ${setsFormatted}`,
            publicLink,
        ].join("\n");
    }

    return [
        `Partido cargado en PASALA. Resultado: ${teamANames} vs ${teamBNames} ${setsFormatted}`,
        publicLink,
    ].join("\n");
}
