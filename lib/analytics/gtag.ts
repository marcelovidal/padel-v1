export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

type GtagParams = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function isGaEnabled() {
  return Boolean(GA_MEASUREMENT_ID);
}

export function pageview(url: string) {
  if (typeof window === "undefined" || !window.gtag || !isGaEnabled()) {
    return;
  }

  const parsedUrl = new URL(url);

  window.gtag("event", "page_view", {
    page_location: url,
    page_path: parsedUrl.pathname + parsedUrl.search,
    send_to: GA_MEASUREMENT_ID,
  });
}

export function trackEvent(eventName: string, params: GtagParams = {}) {
  if (typeof window === "undefined" || !window.gtag || !isGaEnabled()) {
    return;
  }

  window.gtag("event", eventName, params);
}
