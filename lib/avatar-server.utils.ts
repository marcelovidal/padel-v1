import { createClient } from "@/lib/supabase/server";
import { getAvatarInfo } from "./avatar.utils";

export interface ResolvedAvatar {
    src: string | null;
    initials: string;
}

/**
 * Versión de servidor de resolución de avatar que genera URLs firmadas
 * para imágenes privadas en Supabase Storage.
 */
export async function resolveAvatarSrc(data: {
    player?: any;
    user?: any;
}): Promise<ResolvedAvatar> {
    const info = getAvatarInfo(data);

    if (info.type === "storage" && info.url) {
        const supabase = await createClient();
        const { data: signedData, error } = await supabase.storage
            .from("avatars")
            .createSignedUrl(info.url, 3600); // 1 hour cache

        if (!error && signedData) {
            return { src: signedData.signedUrl, initials: info.initials || "??" };
        }
        // If signed URL fails, fallback to initials
        return { initials: info.initials || "??", src: null };
    }

    if (info.type === "external" && info.url) {
        return { src: info.url, initials: info.initials || "??" };
    }

    return { initials: info.initials || "??", src: null };
}
