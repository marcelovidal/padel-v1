import Link from "next/link";
import { Metadata } from "next";
import { PublicSection } from "@/components/public/PublicSection";
import { getPrimaryCtaHref } from "@/lib/auth/public-cta";
import { getRegisterClubHref } from "@/lib/auth/public-cta.shared";

export const metadata: Metadata = {
  title: "Precios",
  description: "Pricing inicial de PASALA para jugadores y clubes.",
  alternates: {
    canonical: "/pricing",
  },
};

export default async function PublicPricingPage() {
  const playerHref = await getPrimaryCtaHref("/pricing");
  const clubHref = getRegisterClubHref();

  return (
    <div>
      <PublicSection
        eyebrow="Pricing MVP"
        title="Simple para crecer rapido"
        description="Modelo inicial enfocado en adopcion. Costos claros y roadmap definido."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Jugadores</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Free</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>• Perfil personal y reclamo de cuenta</li>
              <li>• Historial de partidos</li>
              <li>• Indice PASALA y metricas</li>
            </ul>
            <Link
              href={playerHref}
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-slate-800"
            >
              Empezar como jugador
            </Link>
          </article>

          <article className="rounded-3xl border border-blue-200 bg-blue-50/70 p-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">Clubes</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900">
              Gratis por lanzamiento
            </h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>• Claim de club + ficha publica</li>
              <li>• Presencia en flujo de partidos</li>
              <li>• Proximamente: reservas y gestion</li>
            </ul>
            <Link
              href={clubHref}
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white transition hover:bg-blue-700"
            >
              Registrar club
            </Link>
          </article>
        </div>
      </PublicSection>
    </div>
  );
}

