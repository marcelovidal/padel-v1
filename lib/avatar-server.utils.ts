import { createClient } from "@/lib/supabase/server";
import { getAvatarInfo } from "./avatar.utils";

/**
 * Versión de servidor de resolución de avatar que genera URLs firmadas
 * para imágenes privadas en Supabase Storage.
 */
export async function resolveAvatarSrc(data: {
    player?: any;
    user?: any;
}) {
    const info = getAvatarInfo(data);

    if (info.type === "storage" && info.url) {
        const supabase = await createClient();
        const { data: signedData, error } = await supabase.storage
            .from("avatars")
            .createSignedUrl(info.url, 600); // 10 min cache

        if (!error && signedData) {
            return { src: signedData.signedUrl };
        }
        // If signed URL fails, fallback to initials
        return { initials: info.initials, src: null };
    }

    if (info.type === "external") {
        return { src: info.url };
    }

    return { initials: info.initials, src: null };
}
