import type { Metadata } from "next";
import { PublicHeader } from "@/components/public/PublicHeader";
import { PublicFooter } from "@/components/public/PublicFooter";
import { getPublicCtaContext } from "@/lib/auth/public-cta";

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
  alternates: {
    canonical: "/",
  },
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

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctaContext = await getPublicCtaContext();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <PublicHeader ctaContext={ctaContext} />
      <main>{children}</main>
      <PublicFooter />
    </div>
  );
}
