import type { Metadata } from "next";

const siteBase =
  process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.trim() !== ""
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "https://pasala.com.ar";

const metadataBase = (() => {
  try {
    return new URL(siteBase);
  } catch {
    return new URL("https://pasala.com.ar");
  }
})();

export const metadata: Metadata = {
  metadataBase,
  title: {
    default: "PASALA | Padel para jugadores y clubes",
    template: "%s | PASALA",
  },
  description:
    "Resultados, estadisticas y perfil de padel para grupos reales. Carga partidos, comparti por WhatsApp y deja que cada jugador reclame su perfil.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "PASALA",
    url: "/",
    title: "PASALA | Padel para jugadores y clubes",
    description:
      "Resultados, estadisticas y perfil de padel para grupos reales. Carga partidos y comparti por WhatsApp.",
    images: [
      {
        url: "/og.svg",
        width: 1200,
        height: 630,
        alt: "PASALA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PASALA | Padel para jugadores y clubes",
    description:
      "Resultados, estadisticas y perfil de padel para grupos reales.",
    images: ["/og.svg"],
  },
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
