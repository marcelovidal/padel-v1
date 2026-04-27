import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPublicCtaContext } from "@/lib/auth/public-cta";
import { resolvePublicCtaHref } from "@/lib/auth/public-cta.shared";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingJugador } from "@/components/landing/LandingJugador";
import { LandingClubes } from "@/components/landing/LandingClubes";
import { LandingEntrenador } from "@/components/landing/LandingEntrenador";
import { LandingContacto } from "@/components/landing/LandingContacto";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PASALA — El pádel de la Patagonia",
  description:
    "El pádel no termina cuando termina el partido. Reservá canchas, registrá partidos, seguí tu evolución. La app de pádel de la Patagonia.",
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const ctaContext = await getPublicCtaContext();
  const primaryHref = resolvePublicCtaHref(ctaContext.state, "/");

  return (
    <>
      <LandingNav
        primaryHref={primaryHref}
        isAuthenticated={ctaContext.isAuthenticated}
        displayName={ctaContext.displayName}
        isClubOwner={ctaContext.state === "club_ready"}
      />

      {/* ─── ACTO 1 — HERO ─────────────────────────────────────────── */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Video full-screen — poster actúa como fallback mientras carga */}
        <video
          autoPlay
          muted
          loop
          playsInline
          poster="/landing/hero-jugadora2.png"
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ zIndex: 1 }}
        >
          <source src="/landing/video.mp4" type="video/mp4" />
        </video>

        {/* Overlay izquierda → derecha */}
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        {/* Overlay abajo → arriba */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Contenido — abajo-izquierda */}
        <div
          className="absolute bottom-10 left-6 z-20 md:bottom-16 md:left-8"
          style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5)" }}
        >
          <p
            className="mb-4 uppercase tracking-widest text-white/60"
            style={{ fontSize: "11px" }}
          >
            Patagonia · Argentina
          </p>

          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontWeight: "400",
              lineHeight: "1.05",
            }}
          >
            <span
              className="block text-white"
              style={{ fontSize: "clamp(44px, 6vw, 80px)" }}
            >
              El pádel no termina
            </span>
            <span
              className="block"
              style={{
                fontSize: "clamp(44px, 6vw, 80px)",
                color: "#1565C0",
                fontStyle: "italic",
              }}
            >
              cuando termina
            </span>
            <span
              className="block text-white"
              style={{ fontSize: "clamp(44px, 6vw, 80px)" }}
            >
              el partido.
            </span>
          </h1>

          {/* Scroll hint */}
          <div className="mt-6 flex items-center gap-3">
            <div className="w-8 border-t border-white/30" />
            <span
              className="uppercase tracking-widest text-white/40"
              style={{ fontSize: "10px" }}
            >
              Scrolleá
            </span>
          </div>
        </div>

        {/* ── Card flotante Índice PASALA — solo desktop ── */}
        <style>{`
          @keyframes fadeSlideUp {
            from { opacity: 0; transform: translateY(24px); }
            to   { opacity: 1; transform: translateY(0);    }
          }
        `}</style>
        {/* Div de posicionamiento — solo maneja right/top/-translate-y-1/2 */}
        <div className="absolute right-8 top-1/2 z-20 hidden -translate-y-1/2 md:right-16 md:block">
          {/* Div de animación — relative para ser containing block del badge */}
          <div
            className="relative"
            style={{ animation: "fadeSlideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.4s both" }}
          >

            {/* Badge EN VIVO */}
            <div className="absolute left-1/2 top-[-10px] z-10 -translate-x-1/2 whitespace-nowrap">
              <span className="inline-flex items-center rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-medium text-white">
                <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                EN VIVO
              </span>
            </div>

            {/* Card — glass */}
            <div
              className="w-[360px] overflow-hidden rounded-2xl"
              style={{
                background: "rgba(255, 255, 255, 0.78)",
                backdropFilter: "blur(16px) saturate(180%)",
                WebkitBackdropFilter: "blur(16px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.6)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.18), 0 0 0 0.5px rgba(255,255,255,0.4)",
              }}
            >
              {/* Header */}
              <div className="px-6 pb-4 pt-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Índice PASALA</p>
                <p
                  className="text-base font-semibold text-slate-900"
                  style={{ textShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
                >
                  Sofía R.
                </p>
                <p className="text-xs text-slate-500">Avanzada · 5ª CAT</p>
              </div>

              {/* Bloque del número */}
              <div className="px-6 py-5">
                <div className="flex items-start gap-1">
                  <span
                    className="text-7xl font-bold leading-none text-[#1565C0]"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.08)" }}
                  >
                    73
                  </span>
                  <span className="mt-1 text-base text-slate-300">/100</span>
                </div>
                <p className="mt-1 text-sm text-[#1565C0]">Top 12% en la Patagonia</p>
              </div>

              {/* Separador */}
              <div className="mx-6" style={{ borderTop: "1px solid rgba(0,0,0,0.05)" }} />

              {/* Barras de métricas */}
              <div className="px-6 pb-5 pt-4">
                {[
                  { label: "Efectividad",    value: "68%",   width: "68%", color: "bg-blue-400",    glow: true  },
                  { label: "Forma reciente", value: "↑ 82%", width: "82%", color: "bg-emerald-400", glow: false },
                  { label: "Nivel rivales",  value: "46",    width: "46%", color: "bg-blue-300",    glow: false },
                ].map((bar) => (
                  <div key={bar.label} className="mb-2.5 last:mb-0">
                    <div className="mb-1 flex justify-between">
                      <span className="text-xs text-slate-500">{bar.label}</span>
                      <span className="text-xs font-semibold text-slate-700">{bar.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                      <div
                        className={`h-full rounded-full ${bar.color}`}
                        style={{
                          width: bar.width,
                          ...(bar.glow ? { boxShadow: "0 0 6px rgba(96, 165, 250, 0.6)" } : {}),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{
                  background: "rgba(248, 250, 252, 0.85)",
                  borderTop: "1px solid rgba(0,0,0,0.06)",
                }}
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">4 PJ</p>
                  <p className="text-xs text-slate-400">partidos</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#1565C0]"># 5 de 77</p>
                  <p className="text-xs text-slate-400">ranking</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <LandingJugador />

      {/* ─── ACTO 2 — PARA EL CLUB ─────────────────────────────────── */}
      <LandingClubes />

      {/* ─── ACTO 4 — PARA ENTRENADORES ────────────────────────────── */}
      <LandingEntrenador />

      {/* ─── ACTO 5 — CONTACTO ─────────────────────────────────────── */}
      <LandingContacto />

      {/* ─── ACTO 6 — CIERRE ───────────────────────────────────────── */}
      <section className="relative flex h-[400px] items-center justify-center overflow-hidden md:h-[480px]">
        <Image
          src="/landing/padel-familia.png"
          alt="Familia jugando pádel"
          fill
          className="object-cover"
          style={{ objectPosition: "center 30%" }}
          loading="lazy"
        />
        {/* Overlay blanco semitransparente */}
        <div className="absolute inset-0 bg-white/80" />
        <div className="relative z-10 px-6 text-center">
          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "clamp(32px, 4vw, 44px)",
              fontWeight: "400",
              color: "#080808",
              marginBottom: "12px",
            }}
          >
            Tu pádel empieza acá.
          </h2>
          <p
            className="text-slate-600"
            style={{ fontSize: "13px", marginBottom: "36px" }}
          >
            Gratis para jugadores. Sin tarjeta de crédito.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/welcome"
              className="rounded-full bg-[#1565C0] px-8 py-4 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#1244a0]"
            >
              Registrate gratis
            </Link>
            <Link href="/player/login">
              <span className="inline-flex items-center gap-2 rounded-full border border-white bg-white/90 px-8 py-4 text-sm font-semibold text-[#1565C0] shadow-sm transition-colors hover:bg-white">
                Ya tengo cuenta · Ingresá
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer className="border-t border-stone-200 bg-white px-6 py-6 md:px-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span
            style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontSize: "15px",
              color: "#1565C0",
            }}
          >
            Pasala
          </span>
          <span className="tracking-wide text-slate-500" style={{ fontSize: "11px" }}>
            General Roca · Patagonia · Argentina
          </span>
          <span className="text-slate-500" style={{ fontSize: "11px" }}>
            pasala.com.ar
          </span>
        </div>
      </footer>
    </>
  );
}
