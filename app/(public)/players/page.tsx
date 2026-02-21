import Link from "next/link";
import { Metadata } from "next";
import { Activity, BarChart3, Radar, Users } from "lucide-react";
import { PublicSection } from "@/components/public/PublicSection";
import { FeatureCard } from "@/components/public/FeatureCard";
import { StatCard } from "@/components/public/StatCard";
import { getPrimaryCtaHref } from "@/lib/auth/public-cta";

export const metadata: Metadata = {
  title: "Para jugadores",
  description:
    "PASALA para jugadores: historial, estadisticas, indice de rendimiento y reclamo de perfil desde links compartidos.",
  alternates: {
    canonical: "/players",
  },
};

export default async function PublicPlayersPage() {
  const primaryHref = await getPrimaryCtaHref("/players");

  return (
    <div>
      <PublicSection
        eyebrow="Para jugadores"
        title="Tu historial de padel, ordenado y medible"
        description="Deja atras planillas sueltas. PASALA consolida partidos, performance y evolucion."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Partidos" value="Todo en un lugar" />
          <StatCard label="Rendimiento" value="Metricas claras" />
          <StatCard label="Rachas" value="Lectura rapida" />
          <StatCard label="Claim" value="Perfil propio" />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-blue-700"
          >
            Empezar como jugador
          </Link>
          <Link
            href="/faq"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
          >
            Ver FAQ
          </Link>
        </div>
      </PublicSection>

      <PublicSection title="Que obtenes desde el primer partido">
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            title="Historial automatico"
            description="Cada resultado queda registrado y se puede consultar en segundos."
            icon={<Activity className="h-5 w-5" />}
          />
          <FeatureCard
            title="Indice PASALA"
            description="Un puntaje unico para seguir crecimiento, consistencia y nivel competitivo."
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <FeatureCard
            title="Radar de habilidades"
            description="Visual de fortalezas y areas a trabajar para tomar mejores decisiones."
            icon={<Radar className="h-5 w-5" />}
          />
          <FeatureCard
            title="Invitados + reclamo"
            description="Podes cargar jugadores sin cuenta y ellos reclaman despues desde el link."
            icon={<Users className="h-5 w-5" />}
          />
        </div>
      </PublicSection>
    </div>
  );
}

