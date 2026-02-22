import Link from "next/link";
import { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { PublicContainer } from "@/components/public/PublicContainer";
import { PublicSection } from "@/components/public/PublicSection";
import { FeatureCard } from "@/components/public/FeatureCard";
import { FAQAccordion } from "@/components/public/FAQAccordion";
import { getPrimaryCtaHref } from "@/lib/auth/public-cta";
import { getRegisterClubHref } from "@/lib/auth/public-cta.shared";
import { publicFaqItems, shareDemoMessage } from "@/lib/public/content";

export const metadata: Metadata = {
  title: "PASALA | Padel amateur con historial y progreso",
  description:
    "Registra partidos 2 vs 2 de padel, comparte por WhatsApp, mide rendimiento y construye historial deportivo.",
};

function HeroCourtVisual() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 p-4 shadow-[0_22px_70px_rgba(2,6,23,0.45)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(59,130,246,0.4),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(16,185,129,0.28),transparent_35%),linear-gradient(180deg,#05111f_0%,#07172d_55%,#07162a_100%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:26px_26px]" />
      <div className="absolute inset-4 rounded-[20px] border border-cyan-200/20" />
      <div className="absolute left-[8%] right-[8%] top-1/2 h-px bg-white/60" />
      <div className="absolute left-[50%] top-[18%] h-[64%] w-px -translate-x-1/2 bg-white/20" />

      <div className="relative grid gap-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <p className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white/80">
              Padel indoor 2 vs 2
            </p>
            <span className="rounded-full bg-emerald-300/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">
              Match point
            </span>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-200">Equipo A</p>
                <p className="mt-1 text-sm font-bold text-white">P. Vidal</p>
                <p className="text-xs text-white/70">L. Martos</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/60">Sets</p>
                <p className="mt-1 text-sm font-black tabular-nums text-white">6-4</p>
                <p className="text-sm font-black tabular-nums text-white">4-6</p>
                <p className="text-sm font-black tabular-nums text-emerald-300">7-6</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-200">Equipo B</p>
                <p className="mt-1 text-sm font-bold text-white">M. Martin</p>
                <p className="text-xs text-white/70">F. Boeto</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Compartir por WhatsApp</p>
          <div className="mt-3 rounded-2xl bg-[#111B21] p-3">
            <div className="max-w-[340px] rounded-2xl rounded-tl-md bg-[#005C4B] p-3 text-sm leading-relaxed text-white">
              Partido cargado en PASALA 👇<br />
              Vidal/Martos vs Martin/Boeto<br />
              Resultado: 6-4 4-6 7-6<br />
              pasala.app/m/xxxx
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function PublicHomePage() {
  const primaryHref = await getPrimaryCtaHref("/");
  const clubHref = getRegisterClubHref();

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_12%_8%,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_85%_12%,rgba(16,185,129,0.14),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_38%,#f6f8fc_100%)] py-12 sm:py-16">
        <PublicContainer>
          <div className="grid items-start gap-8 lg:grid-cols-[1.02fr_0.98fr]">
            <div className="space-y-6 pt-2 sm:pt-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Producto serio de pádel
              </div>

              <h1 className="text-4xl font-black leading-[0.95] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                El pádel no termina
                <br />
                cuando termina
                <span className="block text-blue-600">el partido.</span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
                Registrá tus partidos de pádel. Medí tu progreso. Construí tu historia deportiva.
                Pensado para dobles, grupos de WhatsApp y clubes reales.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <Link href={primaryHref} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black uppercase tracking-wide text-white hover:bg-blue-700">
                  Crear mi perfil
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="#demo-share" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50">
                  Ver cómo funciona
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Historial", "Partidos 2 vs 2 ordenados"],
                  ["Progreso", "Métricas y rachas"],
                  ["WhatsApp", "Invitás y compartís"],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-[0_8px_24px_rgba(2,6,23,0.05)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{k}</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{v}</p>
                  </div>
                ))}
              </div>
            </div>

            <HeroCourtVisual />
          </div>
        </PublicContainer>
      </section>

      <PublicSection className="pt-10 sm:pt-14">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
          <FeatureCard title="Historial automático" description="Cada partido queda registrado con contexto de club y equipos." icon={<BarChart3 className="h-5 w-5" />} />
          <FeatureCard title="Índice PASALA" description="Seguimiento de rendimiento y evolución con lectura clara." icon={<Zap className="h-5 w-5" />} />
          <FeatureCard title="Reclamo de perfil" description="Te cargan como invitado y reclamás después desde el link." icon={<ShieldCheck className="h-5 w-5" />} />
          <FeatureCard title="Comunidad real" description="Flujo pensado para grupos recurrentes y competencia amateur." icon={<Users className="h-5 w-5" />} />
        </div>
      </PublicSection>

      <PublicSection eyebrow="Cómo funciona" title="Se adapta al flujo real del grupo" description="PASALA ordena el juego sin romper el hábito de organizar por WhatsApp." className="bg-slate-50/70">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Paso 1</p>
            <h3 className="mt-2 text-lg font-black tracking-tight text-slate-900">Cargás el partido 2 vs 2</h3>
            <p className="mt-2 text-sm text-slate-600">Armás parejas, club y datos base en segundos.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Paso 2</p>
            <h3 className="mt-2 text-lg font-black tracking-tight text-slate-900">Registrás resultado</h3>
            <p className="mt-2 text-sm text-slate-600">Impacta historial, métricas y progreso automáticamente.</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Paso 3</p>
            <h3 className="mt-2 text-lg font-black tracking-tight text-slate-900">Compartís por WhatsApp</h3>
            <p className="mt-2 text-sm text-slate-600">El grupo entra por link y reclama perfil cuando quiere.</p>
          </div>
        </div>
      </PublicSection>

      <PublicSection eyebrow="Para jugadores" title="Tu progreso, sin planillas sueltas">
        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(2,6,23,0.04)]">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ["Partidos", "128", "Historial consolidado"],
                ["Win rate", "62%", "Últimos 90 días"],
                ["Racha", "+4", "Lectura rápida"],
                ["Índice PASALA", "78/100", "Progreso personal"],
              ].map(([label, value, hint]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
                  <p className="mt-1 text-xs text-slate-500">{hint}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Evolución competitiva</p>
              <div className="mt-3 space-y-3">
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 w-[65%] rounded-full bg-blue-600" /></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 w-[52%] rounded-full bg-emerald-500" /></div>
                <div className="h-2 rounded-full bg-slate-100"><div className="h-2 w-[74%] rounded-full bg-indigo-500" /></div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <FeatureCard title="Historial de juego real" description="Pensado para la recurrencia amateur: dobles, clubes y grupos." icon={<Trophy className="h-5 w-5" />} />
            <FeatureCard title="Invitados + reclamo" description="Podés sumar jugadores sin cuenta y consolidar la red con el tiempo." icon={<ShieldCheck className="h-5 w-5" />} />
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-[0_16px_48px_rgba(37,99,235,0.25)]">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-100">Jugador amateur</p>
              <p className="mt-3 text-xl font-black leading-tight">“Esto es para cómo jugamos pádel, no una app deportiva genérica.”</p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/players" className="rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-blue-700">Ver jugadores</Link>
                <Link href={primaryHref} className="rounded-xl border border-white/25 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">Crear perfil</Link>
              </div>
            </div>
          </div>
        </div>
      </PublicSection>

      <PublicSection eyebrow="Clubes de pádel" title="Digitalizá la comunidad del club" description="Ranking interno, torneos, grupos de sábado y actividad local." className="bg-slate-50/70">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_14px_40px_rgba(2,6,23,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-600" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Club / comunidad</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FeatureCard title="Ranking interno" description="Base para comunidad y seguimiento competitivo." className="p-4" />
              <FeatureCard title="Torneos y grupos" description="Desde el grupo del sábado a eventos recurrentes." className="p-4" />
              <FeatureCard title="Ficha pública" description="Presencia digital de tu club y sus canchas." className="p-4" />
              <FeatureCard title="Próximamente reservas" description="Gestión sobre la misma base de comunidad." className="p-4" />
            </div>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-[0_16px_48px_rgba(2,6,23,0.24)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Organizador de club</p>
            <h3 className="mt-3 text-2xl font-black leading-tight">Una capa digital para la comunidad que ya existe</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/75">PASALA no reemplaza el vínculo social. Lo ordena, lo registra y lo vuelve medible.</p>
            <div className="mt-5 space-y-3">
              {[
                "Partidos asociados a clubes de pádel",
                "Flujo real de grupos y dobles",
                "Base para ranking y torneos",
              ].map((line) => (
                <div key={line} className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                  <span className="text-sm text-white/90">{line}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/clubs" className="rounded-xl bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-900">Ver clubes</Link>
              <Link href={clubHref} className="rounded-xl border border-white/20 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">Registrar club</Link>
            </div>
          </div>
        </div>
      </PublicSection>

      <PublicSection id="demo-share" eyebrow="Loop viral" title="WhatsApp sigue siendo el centro. PASALA ordena el juego." description="No vende, informa. Por eso se adapta al uso real.">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="rounded-3xl border border-slate-200 bg-slate-900 p-6 text-white shadow-[0_18px_50px_rgba(2,6,23,0.24)]">
            <div className="mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-emerald-300" />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Mensaje compartido</p>
            </div>
            <pre className="whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/5 p-4 font-mono text-sm leading-relaxed text-white/95">{shareDemoMessage}</pre>
          </div>
          <div className="space-y-4">
            <FeatureCard title="No parece una app de tenis" description="El lenguaje visual y funcional está centrado en pádel amateur." icon={<Trophy className="h-5 w-5" />} />
            <FeatureCard title="No depende de que todos tengan cuenta" description="Podés invitar y crecer la red de forma orgánica desde partidos reales." icon={<Users className="h-5 w-5" />} />
            <FeatureCard title="Se entiende en segundos" description="Marcador, dobles, clubes y WhatsApp como parte del producto." icon={<ShieldCheck className="h-5 w-5" />} />
          </div>
        </div>
      </PublicSection>

      <PublicSection eyebrow="Pricing inicial" title="Modelo simple para activar adopción" className="bg-slate-50/70">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(2,6,23,0.04)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Jugadores</p>
            <p className="mt-2 text-3xl font-black text-slate-900">Free</p>
            <p className="mt-2 text-sm text-slate-600">Historial, resultados, métricas y reclamo de perfil sin costo.</p>
            <div className="mt-5"><Link href={primaryHref} className="inline-flex rounded-xl bg-blue-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-blue-700">Crear mi perfil</Link></div>
          </div>
          <div className="rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 shadow-[0_10px_30px_rgba(59,130,246,0.08)]">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-700">Clubes</p>
            <p className="mt-2 text-3xl font-black text-slate-900">Gratis por lanzamiento</p>
            <p className="mt-2 text-sm text-slate-600">Claim + ficha pública. Próximamente reservas y gestión de canchas.</p>
            <div className="mt-5"><Link href={clubHref} className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-slate-800">Registrar club</Link></div>
          </div>
        </div>
      </PublicSection>

      <PublicSection eyebrow="FAQ" title="Preguntas frecuentes">
        <FAQAccordion items={publicFaqItems} />
      </PublicSection>
    </div>
  );
}
