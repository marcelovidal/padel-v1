import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, BarChart3, ShieldCheck, Share2, Trophy, Users, Zap } from "lucide-react";
import { PublicContainer } from "@/components/public/PublicContainer";
import { PublicSection } from "@/components/public/PublicSection";
import { FeatureCard } from "@/components/public/FeatureCard";
import { StatCard } from "@/components/public/StatCard";
import { FAQAccordion } from "@/components/public/FAQAccordion";
import { getPrimaryCtaHref } from "@/lib/auth/public-cta";
import { getRegisterClubHref } from "@/lib/auth/public-cta.shared";
import { publicFaqItems, shareDemoMessage } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "Inicio",
  description:
    "Resultados, estadisticas y ranking personal de padel. Carga partidos y comparti por WhatsApp para activar reclamos de perfil.",
};

export default async function PublicHomePage() {
  const primaryHref = await getPrimaryCtaHref("/");
  const clubHref = getRegisterClubHref();

  return (
    <div>
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-b from-white via-blue-50/40 to-slate-50 py-16 sm:py-24">
        <div className="pointer-events-none absolute -top-16 right-0 h-72 w-72 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-0 h-72 w-72 rounded-full bg-cyan-200/35 blur-3xl" />
        <PublicContainer className="relative grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="inline-flex rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              Stage Public Web
            </p>
            <h1 className="text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
              El padel se juega.
              <br />
              <span className="text-blue-600">PASALA lo registra.</span>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Resultados, estadisticas y ranking personal. Comparti el partido en
              WhatsApp y hace que el resto reclame su perfil.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-blue-700"
              >
                Crear mi perfil
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="#share-demo"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Ver como se comparte
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(2,6,23,0.12)]">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Partido simulado</p>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-blue-700">
                Compartible
              </span>
            </div>
            <p className="text-lg font-black text-slate-900">Cancha 2 · Club Centro</p>
            <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-sm font-bold text-slate-900">P. Vidal</p>
                <p className="text-xs text-slate-500">L. Martos</p>
              </div>
              <p className="text-2xl font-black tracking-tight text-slate-900">6-4 6-3</p>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">M. Martin</p>
                <p className="text-xs text-slate-500">F. Boeto</p>
              </div>
            </div>
            <button
              type="button"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-sm font-black uppercase tracking-wide text-white"
            >
              <Share2 className="h-4 w-4" />
              Compartir por WhatsApp
            </button>
          </div>
        </PublicContainer>
      </section>

      <PublicSection>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="mb-5 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            Pensado para grupos reales (clubes, ciudades, torneos)
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              title="Historial automatico"
              description="Cada partido suma contexto y queda disponible para consulta inmediata."
              icon={<BarChart3 className="h-5 w-5" />}
            />
            <FeatureCard
              title="Indice PASALA"
              description="Mide rendimiento, constancia y evolucion para que cada partido tenga lectura real."
              icon={<Zap className="h-5 w-5" />}
            />
            <FeatureCard
              title="Reclamo de perfil"
              description="Si apareces en un match compartido, reclamas tu perfil y consolidas historial."
              icon={<ShieldCheck className="h-5 w-5" />}
            />
          </div>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Como funciona"
        title="Tres pasos, cero friccion"
        description="PASALA se apoya en el flujo real del grupo y lo transforma en datos accionables."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            title="1. Cargas el partido"
            description="Armas equipos y datos base en menos de un minuto."
          />
          <FeatureCard
            title="2. Cargas el resultado"
            description="El match impacta tus metricas e historial automaticamente."
          />
          <FeatureCard
            title="3. Compartis por WhatsApp"
            description="El rival entra desde /m/[id] y puede reclamar su perfil."
          />
        </div>
      </PublicSection>

      <PublicSection id="players-preview" eyebrow="Para jugadores" title="Tu rendimiento, sin planillas">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Partidos jugados" value="128" hint="Historial consolidado" />
          <StatCard label="Efectividad" value="62%" hint="Ventana de 90 dias" />
          <StatCard label="Racha actual" value="+4" hint="Ultimos partidos" />
          <StatCard label="Indice PASALA" value="78/100" hint="Version 1.0" />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/players"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-slate-800"
          >
            Ver para jugadores
          </Link>
          <Link
            href={primaryHref}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
          >
            Empezar ahora
          </Link>
        </div>
      </PublicSection>

      <PublicSection
        id="clubs-preview"
        eyebrow="Para clubes"
        title="Tu club visible, reclamable y listo para crecer"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FeatureCard
            title="Ficha publica del club"
            description="Tu sede, canchas y contacto quedan visibles para jugadores de la zona."
            icon={<Users className="h-5 w-5" />}
          />
          <FeatureCard
            title="Proximamente: reservas y gestion"
            description="Base lista para operar turnos, disponibilidad y pipeline comercial."
            icon={<Trophy className="h-5 w-5" />}
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/clubs"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-slate-800"
          >
            Ver para clubes
          </Link>
          <Link
            href={clubHref}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700 transition hover:bg-slate-50"
          >
            Registrar club
          </Link>
        </div>
      </PublicSection>

      <PublicSection
        id="share-demo"
        eyebrow="Demo sharing"
        title="WhatsApp como motor viral"
        description="No vende. Solo informa. Esa es la magia."
        className="bg-slate-100/70"
      >
        <div className="rounded-3xl border border-slate-300 bg-slate-900 p-6 text-slate-100">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mensaje sugerido</p>
          <pre className="mt-4 whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-100">
            {shareDemoMessage}
          </pre>
        </div>
      </PublicSection>

      <PublicSection
        eyebrow="Pricing inicial"
        title="Modelo simple para activar adopcion"
        description="Lanzamiento orientado a crecimiento de red."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Jugadores</p>
            <p className="mt-2 text-3xl font-black text-slate-900">Free</p>
            <p className="mt-2 text-sm text-slate-600">
              Historial, perfil, metricas y reclamo de perfil sin costo.
            </p>
          </div>
          <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-6">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">Clubes</p>
            <p className="mt-2 text-3xl font-black text-slate-900">Gratis por lanzamiento</p>
            <p className="mt-2 text-sm text-slate-600">
              Claim del club + ficha publica. Proximamente reservas y gestion de canchas.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Link
            href={clubHref}
            className="inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:bg-blue-700"
          >
            Registrar club
          </Link>
        </div>
      </PublicSection>

      <PublicSection eyebrow="FAQ" title="Preguntas frecuentes">
        <FAQAccordion items={publicFaqItems} />
      </PublicSection>
    </div>
  );
}

