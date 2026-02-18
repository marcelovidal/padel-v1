import { headers } from "next/headers";

/**
 * Returns the base URL for the application.
 * Priority:
 * 1. process.env.NEXT_PUBLIC_SITE_URL (Explicit override)
 * 2. Headers derivation (Server-side)
 *    - x-forwarded-proto + x-forwarded-host OR host
 * 3. Fallback to http://localhost:3000
 */
export function getSiteUrl(): string {
    // 1. Check explicit environment variable
    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (envUrl) {
        return envUrl.endsWith("/") ? envUrl.slice(0, -1) : envUrl;
    }

    // 2. Try to derive from headers (Server Context)
    try {
        const headersList = headers();
        const host = headersList.get("x-forwarded-host") || headersList.get("host");
        const proto = headersList.get("x-forwarded-proto") || "https";

        if (host) {
            return `${proto}://${host}`;
        }
    } catch (e) {
        // Fail silently if called outside of request context (e.g. edge case client-side without headers hook)
        // In client-side, window.location.origin is usually a better alternative but we prefer passing it from server.
    }

    // 3. Last resort fallback (Localhost as per request)
    return "http://localhost:3000";
}
