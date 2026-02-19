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

        // Public/server fallback: sign with service role when no user session is available.
        if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
            try {
                const { createClient: createSupabaseClient } = await import("@supabase/supabase-js");
                const serviceClient = createSupabaseClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL,
                    process.env.SUPABASE_SERVICE_ROLE_KEY
                );
                const { data: serviceSigned } = await serviceClient.storage
                    .from("avatars")
                    .createSignedUrl(info.url, 600);

                if (serviceSigned?.signedUrl) {
                    return { src: serviceSigned.signedUrl };
                }
            } catch {
                // ignore and continue fallback
            }
        }

        // If signed URL fails, fallback to initials
        return { initials: info.initials, src: null };
    }

    if (info.type === "external") {
        return { src: info.url };
    }

    return { initials: info.initials, src: null };
}
