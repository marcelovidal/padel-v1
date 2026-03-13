import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, BarChart3, Building2, Calendar, ClipboardCheck, MapPin, Trophy } from "lucide-react";
import { PublicSection } from "@/components/public/PublicSection";
import { FeatureCard } from "@/components/public/FeatureCard";
import { getRegisterClubHref } from "@/lib/auth/public-cta.shared";
import { ClubDemoPanel } from "@/components/public/ClubDemoPanel";

export const metadata: Metadata = {
  title: "Para clubes",
  description:
    "PASALA para clubes: ranking interno, ligas con fixture, torneos con bracket, reservas de canchas y ficha publica. Todo en un solo panel.",
  alternates: {
    canonical: "/clubs",
  },
};

export default function PublicClubsPage() {
  const clubHref = getRegisterClubHref();

  return (
    <div>
      <PublicSection
        eyebrow="Para clubes"
        title="Toda la gestion del club en un solo panel"
        description="Ranking, ligas, torneos, reservas y ficha publica. Todo integrado sobre la misma base de jugadores."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Ranking interno"
            description="Posiciones reales basadas en partidos registrados. Recalculable en cualquier momento desde el panel."
            icon={<BarChart3 className="h-5 w-5" />}
          />
          <FeatureCard
            title="Ligas con fixture"
            description="Crea ligas, arma grupos, genera fixture automaticamente y gestioná playoffs completos."
            icon={<Trophy className="h-5 w-5" />}
          />
          <FeatureCard
            title="Torneos con bracket"
            description="Torneos de dobles con inscripcion en duo, bracket visual y carga de resultados online."
            icon={<Trophy className="h-5 w-5" />}
          />
          <FeatureCard
            title="Reservas de canchas"
            description="Turnos por cancha integrados al flujo de partidos. Los jugadores reservan desde su perfil."
            icon={<Calendar className="h-5 w-5" />}
          />
          <FeatureCard
            title="Ficha publica"
            description="Presencia digital del club con canchas, eventos activos y jugadores de la comunidad."
            icon={<Building2 className="h-5 w-5" />}
          />
          <FeatureCard
            title="Reclamo validado"
            description="El ownership se verifica con revision administrativa. Solo el club real puede administrar su panel."
            icon={<ClipboardCheck className="h-5 w-5" />}
          />
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            ["100% gratis", "Durante el lanzamiento, sin costos ocultos ni limite de uso."],
            ["Sin instalacion", "Todo desde el navegador. Sin apps adicionales ni configuracion tecnica."],
            ["Comunidad incluida", "Los jugadores del club ya usan PASALA. El club se suma a la red existente."],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">{k}</p>
              <p className="mt-2 text-sm text-slate-700">{v}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={clubHref}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-blue-700"
          >
            Registrar club
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
          >
            Ver pricing
          </Link>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Panel de administracion"
        title="Asi se ve el panel de tu club"
        description="Navegá entre las secciones para explorar ranking, ligas, torneos y reservas con datos de ejemplo."
        className="bg-slate-50/70"
      >
        <ClubDemoPanel />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={clubHref}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-blue-700"
          >
            Registrar mi club
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"
          >
            Ver precios
          </Link>
        </div>
      </PublicSection>

      <PublicSection eyebrow="Como funciona el reclamo" title="Del registro a la gestion en minutos" className="bg-slate-50/70">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { paso: "1", title: "Registras tu club", desc: "Completás nombre, ciudad y datos basicos. El proceso tarda menos de 2 minutos." },
            { paso: "2", title: "Revision administrativa", desc: "El equipo de PASALA valida la identidad del club antes de activar el panel completo." },
            { paso: "3", title: "Gestion activa", desc: "Con el club confirmado tenes acceso al panel completo: ranking, eventos, reservas y ficha publica." },
          ].map(({ paso, title, desc }) => (
            <div key={paso} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Paso {paso}</p>
              <h3 className="mt-2 text-lg font-black tracking-tight text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-center">
          <Link
            href={clubHref}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-blue-700"
          >
            Registrar mi club gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </PublicSection>
    </div>
  );
}
