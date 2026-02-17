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
 * Resuelve la prioridad del avatar:
 * 1. Storage Privado (si tiene avatar_url)
 * 2. Google Avatar (user_metadata)
 * 3. Iniciales (fallback)
 */
export function getAvatarInfo(data: AvatarData) {
    const { player, user } = data;

    // 1. Storage URL (el path guardado en DB)
    if (player?.avatar_url) {
        return { type: "storage", url: player.avatar_url };
    }

    // 2. Google / Auth Metadata
    const googleAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
    if (googleAvatar) {
        return { type: "external", url: googleAvatar };
    }

    // 3. Fallback a iniciales
    const nameToUse = player?.display_name ||
        (player?.first_name ? `${player.first_name} ${player.last_name || ""}` : null) ||
        user?.user_metadata?.full_name ||
        "Jugador";

    return { type: "initials", initials: getInitials(nameToUse) };
}
