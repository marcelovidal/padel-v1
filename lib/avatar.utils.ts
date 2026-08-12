export interface AvatarData {
    player?: {
        avatar_url?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        display_name?: string | null;
    } | null;
    user?: {
        user_metadata?: {
            avatar_url?: string;
            picture?: string;
            full_name?: string;
        };
    } | null;
}

export function getInitials(name?: string | null): string {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
}

/**
 * Una URL que ya se puede usar tal cual en un `src`, en vez de un path que hay
 * que resolver contra Supabase Storage.
 *
 * El bucket `club-logos` es publico y `ClubProfileForm` guarda en avatar_url la
 * URL publica completa, no el path — necesita ser estable para Open Graph. El
 * bucket `avatars` es privado y guarda el path, que se firma por 600s.
 */
function isDirectUrl(value: string): boolean {
    return /^(https?:\/\/|\/\/|\/|data:|blob:)/i.test(value);
}

/**
 * Resuelve la prioridad del avatar:
 * 1. avatar_url — URL directa (rama externa) o path de storage privado (rama firmada)
 * 2. Google Avatar (user_metadata)
 * 3. Iniciales (fallback)
 *
 * Las tres ramas devuelven `initials`: quien resuelve la rama de storage
 * necesita a que caer si la firma falla.
 */
export function getAvatarInfo(data: AvatarData) {
    const { player, user } = data;

    const nameToUse = player?.display_name ||
        (player?.first_name ? `${player.first_name} ${player.last_name || ""}` : null) ||
        user?.user_metadata?.full_name ||
        "Jugador";
    const initials = getInitials(nameToUse);

    if (player?.avatar_url) {
        // Discriminar por prefijo: firmar una URL completa contra el bucket
        // `avatars` falla siempre y termina cayendo a las iniciales, que es
        // como el logo publico de un club dejaba de verse.
        return isDirectUrl(player.avatar_url)
            ? { type: "external", url: player.avatar_url, initials }
            : { type: "storage", url: player.avatar_url, initials };
    }

    // 2. Google / Auth Metadata
    const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    if (googleAvatar) {
        return { type: "external", url: googleAvatar, initials };
    }

    // 3. Fallback a iniciales
    return { type: "initials", initials };
}
