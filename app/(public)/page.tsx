import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PublicContainer } from "@/components/public/PublicContainer";
import { FAQAccordion } from "@/components/public/FAQAccordion";
import { MatchScore } from "@/components/matches/MatchScore";
import { PasalaIndex } from "@/components/player/PasalaIndex";
import { getPrimaryCtaHref } from "@/lib/auth/public-cta";
import { getRegisterClubHref } from "@/lib/auth/public-cta.shared";
import { publicFaqItems, shareDemoMessage } from "@/lib/public/content";
import { ClubDemoPanel } from "@/components/public/ClubDemoPanel";
import { PlayerEventsDemoPanel } from "@/components/public/PlayerEventsDemoPanel";

export const metadata: Metadata = {
  title: "PASALA | Padel para jugadores y clubes de la Patagonia",
  description:
    "Registrá tus partidos, medí tu progreso con el Índice PASALA y conectá con la comunidad de pádel de la Patagonia argentina.",
};

const samplePlayersByTeam = {
  A: [
    { id: "sample-a1", first_name: "Axel", last_name: "Perez", avatar_url: null },
    { id: "sample-a2", first_name: "Luca", last_name: "Gonzalez", avatar_url: null },
  ],
  B: [
    { id: "sample-b1", first_name: "Rene", last_name: "Martinez", avatar_url: null },
    { id: "sample-b2", first_name: "Ciro", last_name: "Vidal", avatar_url: null },
  ],
};

// ─── Acto I — La apertura ────────────────────────────────────────────────────

function ActoI({ primaryHref, clubHref }: { primaryHref: string; clubHref: string }) {
  return (
    <section style={{ background: "#F0EDE6" }} className="relative overflow-hidden">
      {/* Línea decorativa de cancha — fondo sutil */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(8,8,8,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(8,8,8,0.04) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <PublicContainer className="relative py-20 sm:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_420px]">
          {/* Texto */}
          <div className="space-y-8">
            {/* Geografía */}
            <p
              className="text-[11px] font-black uppercase tracking-[0.22em]"
              style={{ color: "rgba(8,8,8,0.4)" }}
            >
              Patagonia argentina · General Roca · San Martín de los Andes · El Calafate
            </p>

            {/* Claim principal — serif editorial */}
            <h1
              className="font-serif text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
              style={{ color: "#080808" }}
            >
              El pádel no termina
              <br />
              cuando termina
              <br />
              <span style={{ color: "#1565C0" }}>el partido.</span>
            </h1>

            {/* Bajada */}
            <p
              className="max-w-lg text-lg leading-relaxed"
              style={{ color: "rgba(8,8,8,0.6)" }}
            >
              Registrá tu juego, medí tu progreso y construí tu historia deportiva.
              Pensado para grupos reales, WhatsApp y clubes de la Patagonia.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={primaryHref}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
                style={{ background: "#1565C0" }}
              >
                Crear mi perfil
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={clubHref}
                className="inline-flex items-center gap-2 rounded-xl border px-6 py-3.5 text-sm font-black uppercase tracking-wide transition"
                style={{
                  borderColor: "rgba(8,8,8,0.2)",
                  color: "#080808",
                  background: "transparent",
                }}
              >
                Registrar mi club
              </Link>
            </div>

            {/* Stats sociales */}
            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-6"
              style={{ borderColor: "rgba(8,8,8,0.1)" }}
            >
              {[
                ["76+", "jugadores activos"],
                ["200+", "partidos registrados"],
                ["5", "clubes en el sistema"],
              ].map(([num, label]) => (
                <div key={label} className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black" style={{ color: "#080808" }}>
                    {num}
                  </span>
                  <span
                    className="text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "rgba(8,8,8,0.45)" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual — partido demo */}
          <div
            className="overflow-hidden rounded-3xl p-5 shadow-[0_32px_80px_rgba(8,8,8,0.18)]"
            style={{ background: "#080808" }}
          >
            <div
              className="mb-3 flex items-center justify-between rounded-xl px-3 py-2"
              style={{ background: "rgba(240,237,230,0.06)" }}
            >
              <p
                className="text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ color: "rgba(240,237,230,0.5)" }}
              >
                Club Roca Pádel · en vivo
              </p>
              <span
                className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                style={{ background: "rgba(21,101,192,0.3)", color: "#90caf9" }}
              >
                Match point
              </span>
            </div>

            <div
              className="rounded-2xl p-3"
              style={{ background: "rgba(240,237,230,0.04)", border: "1px solid rgba(240,237,230,0.08)" }}
            >
              <MatchScore
                variant="result"
                results={{
                  sets: [
                    { a: 6, b: 4 },
                    { a: 4, b: 6 },
                    { a: 7, b: 6 },
                  ],
                  winnerTeam: "A",
                }}
                playersByTeam={samplePlayersByTeam}
                showPlayers
              />
            </div>

            <div
              className="mt-3 rounded-2xl p-3"
              style={{ background: "rgba(240,237,230,0.04)", border: "1px solid rgba(240,237,230,0.08)" }}
            >
              <p
                className="mb-2 text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ color: "rgba(240,237,230,0.4)" }}
              >
                Compartido por WhatsApp
              </p>
              <div
                className="rounded-xl rounded-tl-sm p-3 text-sm leading-relaxed text-white"
                style={{ background: "#005C4B" }}
              >
                Partido cargado en PASALA 👇
                <br />
                Perez/Gonzalez vs Martinez/Vidal
                <br />
                Resultado: 6-4 4-6 7-6
                <br />
                <span style={{ color: "rgba(255,255,255,0.6)" }}>pasala.com.ar/m/…</span>
              </div>
            </div>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}

// ─── Acto II — El ritual ─────────────────────────────────────────────────────

function ActoII() {
  return (
    <section style={{ background: "#080808" }} className="py-20 sm:py-28">
      <PublicContainer>
        <div className="grid gap-16 lg:grid-cols-[1fr_1fr]">
          {/* Claim */}
          <div className="space-y-6">
            <p
              className="text-[11px] font-black uppercase tracking-[0.22em]"
              style={{ color: "rgba(240,237,230,0.3)" }}
            >
              Por qué PASALA
            </p>
            <h2
              className="font-serif text-4xl font-bold leading-[1.1] sm:text-5xl"
              style={{ color: "#F0EDE6" }}
            >
              No es el partido.
              <br />
              Es lo que queda
              <br />
              <span style={{ color: "#1565C0" }}>después.</span>
            </h2>
            <p
              className="max-w-md text-base leading-relaxed"
              style={{ color: "rgba(240,237,230,0.5)" }}
            >
              En la Patagonia el pádel es un ritual social. El after, el grupo,
              la pertenencia al club. PASALA es la capa digital que lo ordena
              sin reemplazarlo.
            </p>
          </div>

          {/* Tres pilares */}
          <div className="grid gap-4 sm:grid-cols-1">
            {[
              {
                num: "01",
                title: "El resultado",
                body: "Antes era un mensaje de WhatsApp que se perdía. Ahora es historial, estadísticas y progreso medible.",
              },
              {
                num: "02",
                title: "El grupo",
                body: "WhatsApp ya conecta. PASALA ordena lo que pasa adentro de la cancha — quién ganó, cómo evolucionó.",
              },
              {
                num: "03",
                title: "La comunidad",
                body: "Torneos, ligas, rankings. El club como eje de pertenencia, no solo como proveedor de cancha.",
              },
            ].map((item) => (
              <div
                key={item.num}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(240,237,230,0.04)",
                  border: "1px solid rgba(240,237,230,0.08)",
                }}
              >
                <div className="flex items-start gap-4">
                  <span
                    className="mt-0.5 font-mono text-xs font-black"
                    style={{ color: "#1565C0" }}
                  >
                    {item.num}
                  </span>
                  <div>
                    <h3
                      className="font-serif text-lg font-bold"
                      style={{ color: "#F0EDE6" }}
                    >
                      {item.title}
                    </h3>
                    <p
                      className="mt-1 text-sm leading-relaxed"
                      style={{ color: "rgba(240,237,230,0.5)" }}
                    >
                      {item.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diferenciadores */}
        <div
          className="mt-16 grid gap-px rounded-3xl overflow-hidden"
          style={{ background: "rgba(240,237,230,0.06)" }}
        >
          {[
            ["WhatsApp-first", "Onboarding sin cuenta — el grupo invita y cada jugador reclama su perfil cuando quiere."],
            ["Índice PASALA", "Algoritmo propio de rating específico para pádel amateur: efectividad, nivel de rivales, forma reciente."],
            ["Diseño local", "No es una adaptación global. Es una app construida para los clubes y jugadores de la Patagonia."],
            ["Dual audience", "El mismo ecosistema sirve al jugador y al club — conectados, no separados."],
          ].map(([title, body]) => (
            <div
              key={title}
              className="flex flex-col gap-1 px-6 py-5 sm:flex-row sm:items-center sm:gap-8"
              style={{ background: "#080808" }}
            >
              <p
                className="w-48 shrink-0 text-sm font-black"
                style={{ color: "#F0EDE6" }}
              >
                {title}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(240,237,230,0.45)" }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </PublicContainer>
    </section>
  );
}

// ─── Acto III — El jugador ────────────────────────────────────────────────────

function ActoIII({ primaryHref }: { primaryHref: string }) {
  return (
    <section style={{ background: "#F0EDE6" }} className="py-20 sm:py-28">
      <PublicContainer>
        <div className="mb-12 max-w-2xl">
          <p
            className="mb-3 text-[11px] font-black uppercase tracking-[0.22em]"
            style={{ color: "rgba(8,8,8,0.4)" }}
          >
            Para jugadores
          </p>
          <h2
            className="font-serif text-4xl font-bold leading-[1.1] sm:text-5xl"
            style={{ color: "#080808" }}
          >
            Tu juego,
            <br />
            en números.
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "rgba(8,8,8,0.55)" }}>
            El Índice PASALA mide lo que importa: no solo cuánto ganás, sino
            contra quién, cómo y qué tan seguido mejorás.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Demo PASALA Index */}
          <div
            className="rounded-3xl p-6 shadow-[0_14px_40px_rgba(8,8,8,0.07)]"
            style={{ background: "white", border: "1px solid rgba(8,8,8,0.08)" }}
          >
            <PasalaIndex value={78} winScore={62} perfScore={74} />
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                ["Partidos", "128", "Historial consolidado"],
                ["Win rate", "62%", "Últimos 90 días"],
                ["Racha", "+4", "Partidos seguidos ganados"],
                ["Índice PASALA", "78 / 100", "Tu rating actual"],
              ].map(([label, value, hint]) => (
                <div
                  key={label}
                  className="rounded-2xl p-4"
                  style={{ background: "#F0EDE6" }}
                >
                  <p
                    className="text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{ color: "rgba(8,8,8,0.35)" }}
                  >
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-black" style={{ color: "#080808" }}>
                    {value}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "rgba(8,8,8,0.45)" }}>
                    {hint}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Features para jugadores */}
          <div className="flex flex-col gap-4">
            {[
              {
                title: "Reserva de canchas",
                body: "Seleccioná club, cancha y horario con confirmación inmediata.",
              },
              {
                title: "Calendario unificado",
                body: "Todos tus eventos en una sola vista: partidos, reservas, torneos y clases.",
              },
              {
                title: "Reclamo de perfil",
                body: "Te cargaron como invitado en un partido — reclamá tu historial con un clic.",
              },
              {
                title: "Social share",
                body: "Cards para compartir partidos y logros en Instagram y WhatsApp.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-5"
                style={{ background: "white", border: "1px solid rgba(8,8,8,0.08)" }}
              >
                <h3 className="font-semibold" style={{ color: "#080808" }}>
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: "rgba(8,8,8,0.5)" }}>
                  {item.body}
                </p>
              </div>
            ))}

            <Link
              href={primaryHref}
              className="inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
              style={{ background: "#1565C0" }}
            >
              Crear mi perfil — es gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}

// ─── Acto IV — Los eventos ────────────────────────────────────────────────────

function ActoIV({ primaryHref }: { primaryHref: string }) {
  return (
    <section style={{ background: "white", borderTop: "1px solid rgba(8,8,8,0.06)" }} className="py-20 sm:py-28">
      <PublicContainer>
        <div className="mb-10 max-w-2xl">
          <p
            className="mb-3 text-[11px] font-black uppercase tracking-[0.22em]"
            style={{ color: "rgba(8,8,8,0.35)" }}
          >
            Liga, torneo, reserva
          </p>
          <h2
            className="font-serif text-4xl font-bold leading-[1.1] sm:text-5xl"
            style={{ color: "#080808" }}
          >
            Inscribite en dos pasos.
            <br />
            Seguí todo
            <br />
            desde un lugar.
          </h2>
          <p className="mt-4 text-base leading-relaxed" style={{ color: "rgba(8,8,8,0.55)" }}>
            Buscás tu compañero, mandás la solicitud y seguís el estado desde
            tu perfil. Nada de grupos de WhatsApp perdidos.
          </p>
        </div>

        <PlayerEventsDemoPanel />

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
            style={{ background: "#1565C0" }}
          >
            Crear mi perfil
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/players"
            className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-black uppercase tracking-wide transition"
            style={{ borderColor: "rgba(8,8,8,0.15)", color: "#080808" }}
          >
            Ver jugadores activos
          </Link>
        </div>
      </PublicContainer>
    </section>
  );
}

// ─── Acto V — El club ─────────────────────────────────────────────────────────

function ActoV({ clubHref }: { clubHref: string }) {
  return (
    <section style={{ background: "#080808" }} className="py-20 sm:py-28">
      <PublicContainer>
        <div className="grid gap-16 lg:grid-cols-[1fr_1fr]">
          {/* Claim */}
          <div className="space-y-6">
            <p
              className="text-[11px] font-black uppercase tracking-[0.22em]"
              style={{ color: "rgba(240,237,230,0.3)" }}
            >
              Para clubes
            </p>
            <h2
              className="font-serif text-4xl font-bold leading-[1.1] sm:text-5xl"
              style={{ color: "#F0EDE6" }}
            >
              El partido
              <br />
              empieza antes
              <br />
              de llegar a la{" "}
              <span style={{ color: "#1565C0" }}>cancha.</span>
            </h2>
            <p
              className="max-w-md text-base leading-relaxed"
              style={{ color: "rgba(240,237,230,0.5)" }}
            >
              Un panel completo para gestionar reservas, ligas, torneos y el
              ranking interno de tu club. Sin planillas. Sin grupos de WhatsApp
              perdidos.
            </p>

            <div className="space-y-3">
              {[
                "Ranking interno basado en partidos reales",
                "Ligas con fixture, grupos y playoffs",
                "Torneos con inscripción en duo y bracket",
                "Reservas de canchas integradas al flujo",
                "Turnos fijos — reservas recurrentes semanales",
                "Métricas del club — hora pico, jugadores frecuentes",
              ].map((line) => (
                <div key={line} className="flex items-start gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0"
                    style={{ color: "#1565C0" }}
                  />
                  <span className="text-sm" style={{ color: "rgba(240,237,230,0.65)" }}>
                    {line}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={clubHref}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
                style={{ background: "#1565C0" }}
              >
                Registrar mi club
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/clubs"
                className="inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-black uppercase tracking-wide transition"
                style={{ borderColor: "rgba(240,237,230,0.15)", color: "rgba(240,237,230,0.7)" }}
              >
                Ver clubes activos
              </Link>
            </div>
          </div>

          {/* Demo panel */}
          <div>
            <ClubDemoPanel />
          </div>
        </div>
      </PublicContainer>
    </section>
  );
}

// ─── Acto VI — El llamado ─────────────────────────────────────────────────────

function ActoVI({ primaryHref, clubHref }: { primaryHref: string; clubHref: string }) {
  return (
    <section style={{ background: "#1565C0" }} className="py-20 sm:py-28">
      <PublicContainer>
        <div className="mx-auto max-w-3xl text-center space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-white/60">
              Piloto activo en la Patagonia
            </p>
            <h2 className="font-serif text-4xl font-bold leading-[1.1] text-white sm:text-5xl">
              Ya hay 76 jugadores
              <br />
              construyendo su historia
              <br />
              en General Roca.
            </h2>
            <p className="mx-auto max-w-lg text-base leading-relaxed text-white/65">
              PASALA está en lanzamiento piloto. Es el momento de entrar,
              construir tu historial desde cero y ser parte de la primera
              comunidad de pádel digital de la Patagonia.
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center justify-center gap-8 py-4">
            {[
              ["76+", "jugadores activos"],
              ["200+", "partidos registrados"],
              ["5", "clubes en el sistema"],
            ].map(([num, label]) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black text-white">{num}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/50">{label}</p>
              </div>
            ))}
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-black uppercase tracking-wide transition hover:bg-white/90"
              style={{ background: "#F0EDE6", color: "#080808" }}
            >
              Crear mi perfil — gratis
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={clubHref}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-8 py-4 text-sm font-black uppercase tracking-wide text-white transition hover:border-white/50 hover:bg-white/10"
            >
              Registrar mi club
            </Link>
          </div>

          <p className="text-xs text-white/35">
            Gratis para jugadores. Gratis para clubes durante el lanzamiento.
          </p>
        </div>
      </PublicContainer>
    </section>
  );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function SectionFaq() {
  return (
    <section
      style={{ background: "#F0EDE6", borderTop: "1px solid rgba(8,8,8,0.06)" }}
      className="py-20 sm:py-24"
    >
      <PublicContainer>
        <div className="mb-10">
          <p
            className="mb-3 text-[11px] font-black uppercase tracking-[0.22em]"
            style={{ color: "rgba(8,8,8,0.35)" }}
          >
            FAQ
          </p>
          <h2
            className="font-serif text-3xl font-bold"
            style={{ color: "#080808" }}
          >
            Preguntas frecuentes
          </h2>
        </div>
        <div className="max-w-2xl">
          <FAQAccordion items={publicFaqItems} />
        </div>
      </PublicContainer>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PublicHomePage() {
  const primaryHref = await getPrimaryCtaHref("/");
  const clubHref = getRegisterClubHref();

  return (
    <div>
      <ActoI primaryHref={primaryHref} clubHref={clubHref} />
      <ActoII />
      <ActoIII primaryHref={primaryHref} />
      <ActoIV primaryHref={primaryHref} />
      <ActoV clubHref={clubHref} />
      <ActoVI primaryHref={primaryHref} clubHref={clubHref} />
      <SectionFaq />
    </div>
  );
}
