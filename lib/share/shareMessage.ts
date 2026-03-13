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

export function buildPublicPlayerUrl(playerId: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/p/${playerId}`;
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

// ── OG image URL builders ────────────────────────────────────

export function buildOgMatchUrl(matchId: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/api/og/match?id=${encodeURIComponent(matchId)}`;
}

export function buildOgMatchStoryUrl(matchId: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/api/og/match-story?id=${encodeURIComponent(matchId)}`;
}

export function buildOgPlayerUrl(playerId: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/api/og/player?id=${encodeURIComponent(playerId)}`;
}

export function buildOgClubRankingUrl(clubId: string, clubName: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/api/og/club-ranking?clubId=${encodeURIComponent(clubId)}&name=${encodeURIComponent(clubName)}`;
}

export function buildOgLeagueUrl(leagueId: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/api/og/league?leagueId=${encodeURIComponent(leagueId)}`;
}

// ── /share/* public page URL builders ─────────────────────────

export function buildShareMatchUrl(matchId: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/share/match/${matchId}`;
}

export function buildSharePlayerUrl(playerId: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/share/player/${playerId}`;
}

export function buildShareRankingUrl(clubId: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/share/ranking/${clubId}`;
}

export function buildShareLeagueUrl(leagueId: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/share/league/${leagueId}`;
}

export function buildShareBadgeUrl(playerName: string, badgeKey: string, siteUrl: string): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    return `${base}/share/badge/${encodeURIComponent(playerName)}/${encodeURIComponent(badgeKey)}`;
}

export function buildOgBadgeUrl(
    playerId: string,
    badgeKey: string,
    playerName: string,
    unlockedAt: string,
    siteUrl: string
): string {
    const base = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
    const params = new URLSearchParams({ playerId, badgeKey, playerName, unlockedAt });
    return `${base}/api/og/badge?${params.toString()}`;
}

// ── WhatsApp text builders by card type ──────────────────────

export function buildWhatsAppTextForCard(type: "match" | "player" | "ranking" | "league" | "badge", context: { clubName?: string; playerName?: string; badgeTitle?: string }, shareUrl: string): string {
    const texts: Record<string, string> = {
        match:   `¡Jugué en PASALA! Mirá el resultado 👊\n${shareUrl}`,
        player:  `Mi perfil de jugador en PASALA 🎾\n${shareUrl}`,
        ranking: `Así está el ranking en ${context.clubName ?? "el club"} 🏆\n${shareUrl}`,
        league:  `Tabla de posiciones actualizada 📊\n${shareUrl}`,
        badge:   `¡Desbloqueé "${context.badgeTitle ?? "un logro"}" en PASALA! ⭐\n${shareUrl}`,
    };
    return texts[type] ?? shareUrl;
}

export function buildPlayerInviteMessage(
    player: { id: string; display_name?: string | null; city?: string | null; region_code?: string | null },
    siteUrl: string
): string {
    const publicProfileUrl = buildPublicPlayerUrl(player.id, siteUrl);
    const label = player.display_name || "Jugador";
    const city = player.city || "Sin ciudad";
    const region = player.region_code ? ` (${player.region_code})` : "";

    return [
        "Te agregué en PASALA 👇",
        `${label} — ${city}${region}`,
        "Mirá tu perfil acá:",
        publicProfileUrl,
    ].join("\n");
}
