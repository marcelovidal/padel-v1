import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, ArrowDownIcon } from "lucide-react";
import { PublicContainer } from "@/components/public/PublicContainer";
import { FAQAccordion } from "@/components/public/FAQAccordion";
import { PasalaIndex } from "@/components/player/PasalaIndex";
import { getPrimaryCtaHref } from "@/lib/auth/public-cta";
import { getRegisterClubHref } from "@/lib/auth/public-cta.shared";
import { publicFaqItems } from "@/lib/public/content";
import { ClubDemoPanel } from "@/components/public/ClubDemoPanel";
import { PlayerEventsDemoPanel } from "@/components/public/PlayerEventsDemoPanel";

export const metadata: Metadata = {
  title: "PASALA | Padel para jugadores y clubes de la Patagonia",
  description:
    "Registrá tus partidos, medí tu progreso con el Índice PASALA y conectá con la comunidad de pádel de la Patagonia argentina.",
};

// ─── Acto I — Hero foto completa ─────────────────────────────────────────────

function ActoI({ primaryHref, clubHref }: { primaryHref: string; clubHref: string }) {
  return (
    <section className="relative min-h-screen">
      <Image
        src="/landing/jugadora.webp"
        alt="Jugadora de pádel en cancha, Patagonia"
        fill
        className="object-cover object-center"
        priority
      />
      {/* Overlay degradado de abajo hacia arriba */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(8,8,8,0.92) 0%, rgba(8,8,8,0.55) 45%, rgba(8,8,8,0.15) 100%)",
        }}
      />

      {/* Contenido posicionado en la parte inferior */}
      <div className="relative z-10 flex min-h-screen flex-col justify-end">
        <PublicContainer className="pb-16 pt-40">
          {/* Geografía */}
          <p
            className="mb-6 text-[11px] font-black uppercase tracking-[0.25em]"
            style={{ color: "rgba(240,237,230,0.5)" }}
          >
            Patagonia argentina · General Roca · San Martín de los Andes · El Calafate
          </p>

          {/* Claim principal */}
          <h1
            className="font-serif text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl"
          >
            El pádel no termina
            <br />
            <em style={{ color: "#F0EDE6", fontStyle: "italic" }}>
              cuando termina
            </em>
            <br />
            <span style={{ color: "#90caf9" }}>el partido.</span>
          </h1>

          {/* Bajada + CTAs en fila */}
          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <p
              className="max-w-md text-base leading-relaxed sm:text-lg"
              style={{ color: "rgba(240,237,230,0.65)" }}
            >
              Registrá tu juego, medí tu progreso y construí tu historia
              deportiva. Pensado para grupos reales, WhatsApp y clubes de la
              Patagonia.
            </p>

            <div className="flex shrink-0 flex-wrap gap-3">
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
                className="inline-flex items-center gap-2 rounded-xl border px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:bg-white/10"
                style={{ borderColor: "rgba(240,237,230,0.3)" }}
              >
                Registrar mi club
              </Link>
            </div>
          </div>

          {/* Stats + scroll indicator */}
          <div
            className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t pt-6"
            style={{ borderColor: "rgba(240,237,230,0.12)" }}
          >
            <div className="flex flex-wrap gap-8">
              {[
                ["76+", "jugadores activos"],
                ["200+", "partidos registrados"],
                ["5", "clubes en el sistema"],
              ].map(([num, label]) => (
                <div key={label}>
                  <span className="text-2xl font-black text-white">{num}</span>
                  <span
                    className="ml-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "rgba(240,237,230,0.4)" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
            <div
              className="hidden items-center gap-2 sm:flex"
              style={{ color: "rgba(240,237,230,0.35)" }}
            >
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Scrolleá</span>
              <ArrowDownIcon className="h-3.5 w-3.5" />
            </div>
          </div>
        </PublicContainer>
      </div>
    </section>
  );
}

// ─── Acto II — El ritual (club-bar.webp) ─────────────────────────────────────

function ActoII() {
  return (
    <section style={{ background: "#080808" }} className="py-0">
      <div className="grid lg:grid-cols-2">
        {/* Foto izquierda */}
        <div className="relative min-h-[60vw] lg:min-h-[640px]">
          <Image
            src="/landing/club-bar.webp"
            alt="Bar del club de pádel, Patagonia"
            fill
            className="object-cover object-center"
          />
          <div
            className="absolute inset-0 lg:hidden"
            style={{ background: "linear-gradient(to top, rgba(8,8,8,0.7) 0%, transparent 60%)" }}
          />
        </div>

        {/* Texto derecha */}
        <div className="flex flex-col justify-center px-8 py-16 lg:px-16 lg:py-20">
          <p
            className="mb-4 text-[11px] font-black uppercase tracking-[0.22em]"
            style={{ color: "rgba(240,237,230,0.3)" }}
          >
            Por qué PASALA
          </p>
          <h2
            className="font-serif text-4xl font-bold leading-[1.1] text-white sm:text-5xl"
          >
            No es el partido.
            <br />
            <em className="italic" style={{ color: "rgba(240,237,230,0.6)" }}>
              Es lo que queda
            </em>
            <br />
            después.
          </h2>
          <p
            className="mt-6 max-w-md text-base leading-relaxed"
            style={{ color: "rgba(240,237,230,0.5)" }}
          >
            En la Patagonia el pádel es un ritual social. El after, el grupo,
            la pertenencia al club. PASALA es la capa digital que lo ordena sin
            reemplazarlo.
          </p>

          <div className="mt-10 space-y-4">
            {[
              {
                num: "01",
                title: "El resultado",
                body: "Antes era un mensaje de WhatsApp que se perdía. Ahora es historial.",
              },
              {
                num: "02",
                title: "El grupo",
                body: "WhatsApp ya conecta. PASALA ordena lo que pasa adentro de la cancha.",
              },
              {
                num: "03",
                title: "La comunidad",
                body: "Torneos, ligas, rankings. El club como eje de pertenencia.",
              },
            ].map((item) => (
              <div key={item.num} className="flex gap-4">
                <span
                  className="mt-0.5 shrink-0 font-mono text-xs font-black"
                  style={{ color: "#1565C0" }}
                >
                  {item.num}
                </span>
                <div>
                  <span className="text-sm font-bold text-white">{item.title} — </span>
                  <span className="text-sm" style={{ color: "rgba(240,237,230,0.5)" }}>
                    {item.body}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Acto III — La app (jugador-movil.webp) ────────────────────────────────

function ActoIII({ primaryHref }: { primaryHref: string }) {
  return (
    <section style={{ background: "#F0EDE6" }} className="py-0">
      <div className="grid lg:grid-cols-2">
        {/* Texto izquierda */}
        <div className="flex flex-col justify-center px-8 py-16 lg:px-16 lg:py-20">
          <p
            className="mb-4 text-[11px] font-black uppercase tracking-[0.22em]"
            style={{ color: "rgba(8,8,8,0.35)" }}
          >
            Para jugadores
          </p>
          <h2
            className="font-serif text-4xl font-bold leading-[1.1] sm:text-5xl"
            style={{ color: "#080808" }}
          >
            Tu juego,
            <br />
            <em className="italic" style={{ color: "#1565C0" }}>
              en números.
            </em>
          </h2>
          <p
            className="mt-6 max-w-md text-base leading-relaxed"
            style={{ color: "rgba(8,8,8,0.55)" }}
          >
            El Índice PASALA mide lo que importa: no solo cuánto ganás, sino
            contra quién y cómo mejorás partido a partido.
          </p>

          {/* Demo compacto PASALA Index */}
          <div
            className="mt-8 rounded-2xl p-5 shadow-[0_12px_40px_rgba(8,8,8,0.08)]"
            style={{ background: "white", border: "1px solid rgba(8,8,8,0.07)" }}
          >
            <PasalaIndex value={78} winScore={62} perfScore={74} />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                ["128", "Partidos"],
                ["62%", "Win rate"],
                ["+4", "Racha"],
                ["78/100", "Índice"],
              ].map(([val, lbl]) => (
                <div
                  key={lbl}
                  className="rounded-xl p-3"
                  style={{ background: "#F0EDE6" }}
                >
                  <p className="text-xl font-black" style={{ color: "#080808" }}>{val}</p>
                  <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(8,8,8,0.4)" }}>{lbl}</p>
                </div>
              ))}
            </div>
          </div>

          <Link
            href={primaryHref}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-xl px-5 py-3 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
            style={{ background: "#1565C0" }}
          >
            Crear mi perfil — gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Foto derecha */}
        <div className="relative min-h-[70vw] lg:min-h-[680px]">
          <Image
            src="/landing/jugador-movil.webp"
            alt="Jugador mirando su celular en el club de pádel"
            fill
            className="object-cover object-center"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Acto IV — La acción (jugador-accion.webp) — eventos ──────────────────

function ActoIV({ primaryHref }: { primaryHref: string }) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative min-h-[520px] sm:min-h-[600px]">
        <Image
          src="/landing/jugador-accion.webp"
          alt="Jugadores de pádel bajo las luces con montañas nevadas"
          fill
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(8,8,8,0.88) 0%, rgba(8,8,8,0.55) 50%, rgba(8,8,8,0.2) 100%)",
          }}
        />
        <div className="absolute inset-0 flex items-center">
          <PublicContainer>
            <div className="max-w-xl">
              <p
                className="mb-4 text-[11px] font-black uppercase tracking-[0.22em]"
                style={{ color: "rgba(240,237,230,0.4)" }}
              >
                Liga · Torneo · Reserva
              </p>
              <h2 className="font-serif text-4xl font-bold leading-[1.1] text-white sm:text-5xl">
                Inscribite.
                <br />
                <em className="italic" style={{ color: "rgba(240,237,230,0.65)" }}>
                  Seguí el fixture.
                </em>
                <br />
                Compartí.
              </h2>
              <p
                className="mt-5 text-base leading-relaxed"
                style={{ color: "rgba(240,237,230,0.55)" }}
              >
                Buscás tu compañero, mandás la solicitud y seguís el estado
                desde tu perfil. Todo en un solo lugar.
              </p>
              <Link
                href={primaryHref}
                className="mt-8 inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-black uppercase tracking-wide text-white transition hover:opacity-90"
                style={{ background: "#1565C0" }}
              >
                Crear mi perfil
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </PublicContainer>
        </div>
      </div>

      {/* Demo panel debajo */}
      <div style={{ background: "white" }} className="py-16">
        <PublicContainer>
          <PlayerEventsDemoPanel />
        </PublicContainer>
      </div>
    </section>
  );
}

// ─── Acto V — El club (club-familia.webp) ─────────────────────────────────

function ActoV({ clubHref }: { clubHref: string }) {
  return (
    <section style={{ background: "#080808" }} className="py-0">
      <div className="grid lg:grid-cols-2">
        {/* Texto izquierda */}
        <div className="flex flex-col justify-center px-8 py-16 lg:px-16 lg:py-20">
          <p
            className="mb-4 text-[11px] font-black uppercase tracking-[0.22em]"
            style={{ color: "rgba(240,237,230,0.3)" }}
          >
            Para clubes
          </p>
          <h2
            className="font-serif text-4xl font-bold leading-[1.1] text-white sm:text-5xl"
          >
            El partido empieza
            <br />
            <em className="italic" style={{ color: "rgba(240,237,230,0.55)" }}>
              antes de llegar
            </em>
            <br />
            <span style={{ color: "#90caf9" }}>a la cancha.</span>
          </h2>
          <p
            className="mt-6 max-w-md text-base leading-relaxed"
            style={{ color: "rgba(240,237,230,0.5)" }}
          >
            Reservas, ligas, torneos y el ranking interno de tu club. Sin
            planillas. Sin grupos de WhatsApp perdidos.
          </p>

          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            {[
              "Ranking interno real",
              "Ligas con fixture",
              "Torneos con brackets",
              "Reservas integradas",
              "Turnos fijos",
              "Métricas del club",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ background: "rgba(240,237,230,0.05)", border: "1px solid rgba(240,237,230,0.07)" }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "#1565C0" }}
                />
                <span className="text-sm" style={{ color: "rgba(240,237,230,0.7)" }}>
                  {item}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
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
              style={{ borderColor: "rgba(240,237,230,0.15)", color: "rgba(240,237,230,0.6)" }}
            >
              Ver clubes activos
            </Link>
          </div>
        </div>

        {/* Foto derecha */}
        <div className="relative min-h-[60vw] lg:min-h-[640px]">
          <Image
            src="/landing/club-familia.webp"
            alt="Comunidad del club de pádel, Patagonia"
            fill
            className="object-cover object-center"
          />
          <div
            className="absolute inset-0 lg:hidden"
            style={{ background: "linear-gradient(to top, rgba(8,8,8,0.6) 0%, transparent 50%)" }}
          />
        </div>
      </div>

      {/* Demo panel */}
      <div
        className="border-t py-16"
        style={{ borderColor: "rgba(240,237,230,0.06)" }}
      >
        <PublicContainer>
          <ClubDemoPanel />
        </PublicContainer>
      </div>
    </section>
  );
}

// ─── Acto VI — CTA final ──────────────────────────────────────────────────────

function ActoVI({ primaryHref, clubHref }: { primaryHref: string; clubHref: string }) {
  return (
    <section style={{ background: "#1565C0" }} className="py-20 sm:py-28">
      <PublicContainer>
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-4 text-sm font-black uppercase tracking-[0.22em] text-white/60">
            Piloto activo · General Roca, Río Negro
          </p>
          <h2 className="font-serif text-4xl font-bold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
            Ya hay 76 jugadores
            <br />
            <em className="italic" style={{ color: "rgba(255,255,255,0.7)" }}>
              construyendo su historia
            </em>
            <br />
            en la Patagonia.
          </h2>
          <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-white/60">
            PASALA está en lanzamiento piloto. Es el momento de entrar y
            ser parte de la primera comunidad de pádel digital de la Patagonia.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-8">
            {[["76+", "jugadores"], ["200+", "partidos"], ["5", "clubes"]].map(([n, l]) => (
              <div key={l} className="text-center">
                <p className="text-3xl font-black text-white">{n}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/45">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-black uppercase tracking-wide transition hover:opacity-90"
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
          <h2 className="font-serif text-3xl font-bold" style={{ color: "#080808" }}>
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
