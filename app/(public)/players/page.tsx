import Link from "next/link";
import { Metadata } from "next";
import { Activity, ArrowRight, BarChart3, Calendar, ListOrdered, Trophy, Users } from "lucide-react";
import { PublicSection } from "@/components/public/PublicSection";
import { FeatureCard } from "@/components/public/FeatureCard";
import { StatCard } from "@/components/public/StatCard";
import { getPrimaryCtaHref } from "@/lib/auth/public-cta";
import { PlayerEventsDemoPanel } from "@/components/public/PlayerEventsDemoPanel";

export const metadata: Metadata = {
  title: "Para jugadores",
  description:
    "PASALA para jugadores: historial, indice de rendimiento, ranking del club, ligas, torneos y reservas. Todo desde tu perfil.",
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
        description="Historial, metricas, ranking, ligas y torneos. Todo en un perfil que crece con cada partido."
      >
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Partidos" value="Todo en un lugar" />
          <StatCard label="Ranking" value="En tu club" />
          <StatCard label="Eventos" value="Ligas y torneos" />
          <StatCard label="Claim" value="Perfil propio" />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-blue-700"
          >
            Crear mi perfil
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/faq"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
          >
            Ver FAQ
          </Link>
        </div>
      </PublicSection>

      <PublicSection title="Todo lo que obtenes desde el primer partido" className="bg-slate-50/70">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Historial automatico"
            description="Cada resultado queda registrado con equipos, sets y club. Consultable en cualquier momento."
            icon={<Activity className="h-5 w-5" />}
          />
          <FeatureCard
            title="Indice PASALA"
            description="Un puntaje unico que mide crecimiento, consistencia y nivel competitivo en el tiempo."
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <FeatureCard
            title="Ranking del club"
            description="Posicion real en el ranking interno de tu club, actualizado a medida que jugás."
            icon={<ListOrdered className="h-5 w-5" />}
          />
          <FeatureCard
            title="Ligas y torneos"
            description="Inscribite como dupla a ligas con fixture y torneos con bracket. Todo desde la app."
            icon={<Trophy className="h-5 w-5" />}
          />
          <FeatureCard
            title="Reservas de canchas"
            description="Reserva turnos directamente desde el flujo del partido o de forma independiente."
            icon={<Calendar className="h-5 w-5" />}
          />
          <FeatureCard
            title="Invitados + reclamo"
            description="Te cargan en un partido sin cuenta. Reclamas tu perfil desde el link y consolidás el historial."
            icon={<Users className="h-5 w-5" />}
          />
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Inscripcion a eventos"
        title="Asi te inscribis a una liga o torneo"
        description="Busca tu companero, manda la solicitud y segui el estado desde tu perfil. Todo en un solo lugar."
      >
        <PlayerEventsDemoPanel />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-blue-700"
          >
            Crear mi perfil
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            Ver preguntas frecuentes
          </Link>
        </div>
      </PublicSection>
    </div>
  );
}
