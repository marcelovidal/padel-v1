import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getPrimaryCtaHref } from "@/lib/auth/public-cta";
import { LandingNav } from "@/components/landing/LandingNav";

export const metadata: Metadata = {
  title: "PASALA — El pádel de la Patagonia",
  description:
    "El pádel no termina cuando termina el partido. Reservá canchas, registrá partidos, seguí tu evolución. La app de pádel de la Patagonia.",
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const primaryHref = await getPrimaryCtaHref("/");

  return (
    <>
      <LandingNav primaryHref={primaryHref} />

      {/* ─── ACTO 1 — HERO ─────────────────────────────────────────── */}
      <section className="relative min-h-screen overflow-hidden bg-[#080808]">
        {/* Imagen de fondo: full-screen en mobile, lado derecho 52% en desktop */}
        <div className="absolute inset-0 md:inset-y-0 md:left-auto md:right-0 md:w-[52%]">
          <Image
            src="/landing/hero-jugadora2.png"
            alt="Jugadora de pádel en cancha patagónica"
            fill
            className="object-cover object-center"
            priority
            loading="eager"
          />
        </div>

        {/* Overlay mobile — oscuro uniforme */}
        <div
          className="absolute inset-0 md:hidden"
          style={{ background: "rgba(8,8,8,0.5)" }}
        />

        {/* Gradiente desktop — izquierda */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{ background: "linear-gradient(to right, #080808 40%, transparent)" }}
        />
        {/* Gradiente desktop — abajo */}
        <div
          className="absolute inset-0 hidden md:block"
          style={{ background: "linear-gradient(to top, #080808 0%, transparent 60%)" }}
        />

        {/* Tinte azul sutil */}
        <div
          className="absolute inset-0"
          style={{ background: "rgba(21,101,192,0.05)" }}
        />

        {/* Contenido — abajo-izquierda */}
        <div className="absolute bottom-0 left-0 space-y-5 px-6 pb-10 md:px-10 md:pb-16">
          <p
            style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontSize: "11px",
              color: "#1565C0",
              letterSpacing: "0.18em",
              marginBottom: "20px",
            }}
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
              style={{ fontSize: "clamp(36px, 4.5vw, 56px)" }}
            >
              El pádel no termina
            </span>
            <span
              className="block"
              style={{
                fontSize: "clamp(36px, 4.5vw, 56px)",
                color: "rgba(255,255,255,0.3)",
                fontStyle: "italic",
              }}
            >
              cuando termina
            </span>
            <span
              className="block text-white"
              style={{ fontSize: "clamp(36px, 4.5vw, 56px)" }}
            >
              el partido.
            </span>
          </h1>

          {/* Scroll hint */}
          <div className="flex items-center gap-3 pt-2">
            <div
              style={{
                width: "28px",
                height: "1px",
                background: "rgba(21,101,192,0.5)",
              }}
            />
            <span
              className="uppercase"
              style={{
                fontSize: "10px",
                letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.2)",
              }}
            >
              Scrolleá
            </span>
          </div>
        </div>
      </section>

      {/* ─── ACTO 2 — LA ESCENA HUMANA ─────────────────────────────── */}
      <section style={{ background: "#F0EDE6" }} className="px-6 py-16 md:px-10 md:py-[72px]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 md:grid-cols-2">
          {/* Frase */}
          <div className="flex flex-col justify-center">
            <p
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "clamp(22px, 2.5vw, 30px)",
                fontWeight: "400",
                lineHeight: "1.45",
                color: "#1A1A1A",
              }}
            >
              Hay algo que pasa después de la última pelota.{" "}
              <span style={{ fontStyle: "italic", color: "#1565C0" }}>
                Eso también es pádel.
              </span>
            </p>
          </div>

          {/* Foto */}
          <div>
            <div className="relative h-[240px] overflow-hidden md:h-[300px]">
              <Image
                src="/landing/bar-cancha-noche.png"
                alt="Bar de pádel de noche en la Patagonia"
                fill
                className="object-cover"
                loading="lazy"
              />
            </div>
            <p
              className="mt-3 uppercase tracking-widest"
              style={{ fontSize: "11px", color: "#999" }}
            >
              Patagonia Padel Club · San Martín de los Andes
            </p>
          </div>
        </div>
      </section>

      {/* ─── ACTO 3 — NÚMEROS ──────────────────────────────────────── */}
      <section className="bg-[#080808] px-6 py-16 md:px-10 md:py-[64px]">
        <div className="mx-auto max-w-6xl">
          <p
            className="mb-12 uppercase tracking-widest"
            style={{ fontSize: "10px", color: "rgba(21,101,192,0.7)" }}
          >
            La comunidad en números
          </p>

          <div className="grid grid-cols-1 gap-0 md:grid-cols-3">
            {[
              { num: "76", plus: true, desc: "jugadores activos\nen la Patagonia" },
              { num: "200", plus: true, desc: "partidos registrados\ncon resultado" },
              { num: "5", plus: false, desc: "clubes en\nel sistema" },
            ].map((stat) => (
              <div
                key={stat.num}
                className="py-6 md:pr-8"
                style={{ borderTop: "0.5px solid rgba(21,101,192,0.2)" }}
              >
                <div className="flex items-end gap-1">
                  <span
                    style={{
                      fontFamily: "Georgia, serif",
                      fontStyle: "italic",
                      fontSize: "clamp(56px, 6vw, 72px)",
                      color: "#1976D2",
                      lineHeight: "1",
                    }}
                  >
                    {stat.num}
                  </span>
                  {stat.plus && (
                    <span
                      className="mb-2"
                      style={{ fontSize: "28px", color: "rgba(21,101,192,0.4)" }}
                    >
                      +
                    </span>
                  )}
                </div>
                <p
                  className="mt-2 whitespace-pre-line"
                  style={{
                    fontSize: "12px",
                    color: "rgba(255,255,255,0.3)",
                    lineHeight: "1.6",
                  }}
                >
                  {stat.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ACTO 4 — PARA EL JUGADOR ──────────────────────────────── */}
      <section style={{ background: "#F0EDE6" }} className="px-6 py-16 md:px-10 md:py-[72px]">
        <div className="mx-auto max-w-6xl">
          {/* Header 2 columnas */}
          <div
            className="grid grid-cols-1 gap-6 pb-7 md:grid-cols-2 md:gap-10"
            style={{ borderBottom: "0.5px solid #E8E4DC" }}
          >
            <p
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "clamp(26px, 3vw, 36px)",
                fontWeight: "400",
                color: "#1A1A1A",
                lineHeight: "1.2",
              }}
            >
              Para el jugador que quiere<br />más que ganar.
            </p>
            <div className="flex items-center">
              <p style={{ fontSize: "13px", color: "#888", lineHeight: "1.7" }}>
                Reservá, registrá tus partidos, seguí tu evolución y
                conectá con tu comunidad de pádel.
              </p>
            </div>
          </div>

          {/* Imagen banner */}
          <div className="relative my-8 h-[180px] w-full overflow-hidden md:h-[280px]">
            <Image
              src="/landing/cancha-accion.png"
              alt="Jugadores en cancha de pádel"
              fill
              className="object-cover"
              style={{ objectPosition: "center 40%" }}
              loading="lazy"
            />
          </div>

          {/* Features con imagen secundaria flotante */}
          <div className="clearfix">
            {/* Imagen secundaria — solo desktop, float right */}
            <div
              className="relative hidden overflow-hidden md:block"
              style={{
                float: "right",
                marginLeft: "32px",
                width: "40%",
                height: "320px",
              }}
            >
              <Image
                src="/landing/jugador-movil.png"
                alt="Jugador revisando el partido en su móvil"
                fill
                className="object-cover"
                loading="lazy"
              />
            </div>

            {/* Grid de features */}
            <div className="grid grid-cols-2 gap-0 md:grid-cols-1">
              {[
                {
                  n: "i.",
                  title: "Índice PASALA",
                  desc: "Tu rating de 0 a 100 basado en tu historial real.",
                },
                {
                  n: "ii.",
                  title: "Reservá tu cancha",
                  desc: "Club, cancha y horario en segundos. Sin llamadas.",
                },
                {
                  n: "iii.",
                  title: "Torneos y ligas",
                  desc: "Inscribite y seguí tu posición en tiempo real.",
                },
                {
                  n: "iv.",
                  title: "Tu entrenador",
                  desc: "Conectá con entrenadores de tu zona.",
                },
              ].map((f) => (
                <div
                  key={f.n}
                  className="py-4 pr-4"
                  style={{ borderTop: "0.5px solid #E8E4DC" }}
                >
                  <p>
                    <span
                      style={{
                        fontFamily: "Georgia, serif",
                        fontStyle: "italic",
                        fontSize: "13px",
                        color: "#1565C0",
                      }}
                    >
                      {f.n}
                    </span>{" "}
                    <span
                      style={{ fontSize: "13px", fontWeight: "500", color: "#1A1A1A" }}
                    >
                      {f.title}
                    </span>
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#888",
                      lineHeight: "1.6",
                      marginTop: "2px",
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div style={{ clear: "both" }} />

          <Link
            href={primaryHref}
            className="mt-10 inline-block text-white"
            style={{
              background: "#1565C0",
              padding: "14px 32px",
              fontSize: "13px",
              fontWeight: "500",
            }}
          >
            Empezar gratis
          </Link>
        </div>
      </section>

      {/* ─── ACTO 5 — PARA EL CLUB ─────────────────────────────────── */}
      <section className="bg-[#060D16]" style={{ borderTop: "2px solid #1565C0" }}>
        <div className="flex min-h-[480px] flex-col md:flex-row">
          {/* Imagen — mobile arriba */}
          <div className="relative h-[280px] w-full md:hidden">
            <Image
              src="/landing/jugadores.png"
              alt="Jugadores de pádel en el club"
              fill
              className="object-cover object-center"
              loading="lazy"
            />
          </div>

          {/* Contenido izquierda — 55% */}
          <div className="w-full px-6 py-16 md:w-[55%] md:px-10 md:py-[72px]">
            <p
              className="mb-6 uppercase tracking-widest"
              style={{ fontSize: "10px", color: "rgba(21,101,192,0.8)" }}
            >
              Para clubes
            </p>

            <h2
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "clamp(32px, 3.5vw, 48px)",
                fontWeight: "400",
                color: "#fff",
                lineHeight: "1.1",
                marginBottom: "20px",
              }}
            >
              El partido empieza
              <br />
              <span style={{ fontStyle: "italic", color: "#1976D2" }}>
                antes de llegar
              </span>
              <br />
              a la cancha.
            </h2>

            <p
              style={{
                fontSize: "13px",
                color: "rgba(255,255,255,0.4)",
                lineHeight: "1.7",
                maxWidth: "380px",
                marginBottom: "40px",
              }}
            >
              Reservas, turnos fijos, torneos, ligas y métricas.
              <br />
              Todo desde un panel diseñado para los clubes
              <br />
              de la Patagonia.
            </p>

            {/* Features del club */}
            <div className="mb-10">
              {[
                {
                  title: "Reservas y turnos fijos",
                  desc: "Reserva esporádica y turnos fijos semanales automáticos.",
                },
                {
                  title: "Torneos y ligas",
                  desc: "Creá y gestioná la competencia de tu club.",
                },
                {
                  title: "Métricas del club",
                  desc: "Hora pico, jugadores frecuentes, llenado semanal.",
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="py-4"
                  style={{ borderTop: "0.5px solid rgba(21,101,192,0.2)" }}
                >
                  <p style={{ fontSize: "13px", fontWeight: "500", color: "#fff" }}>
                    {f.title}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "rgba(255,255,255,0.35)",
                      lineHeight: "1.6",
                      marginTop: "2px",
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Botón WhatsApp */}
            <a
              href="https://wa.me/542984315287?text=Hola!%20Quiero%20saber%20m%C3%A1s%20sobre%20PASALA%20para%20mi%20club"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 text-white"
              style={{
                background: "#25D366",
                padding: "14px 28px",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              {/* WhatsApp icon */}
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Hablemos por WhatsApp
            </a>
          </div>

          {/* Imagen — desktop derecha 45% */}
          <div className="relative hidden w-[45%] md:block">
            <Image
              src="/landing/jugadores.png"
              alt="Jugadores de pádel en el club"
              fill
              className="object-cover object-center"
              loading="lazy"
            />
          </div>
        </div>
      </section>

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
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,8,8,0.3) 0%, rgba(8,8,8,0.7) 100%)",
          }}
        />
        <div className="relative z-10 px-6 text-center">
          <h2
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "clamp(32px, 4vw, 44px)",
              fontWeight: "400",
              color: "#fff",
              marginBottom: "12px",
            }}
          >
            Tu pádel empieza acá.
          </h2>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255,255,255,0.6)",
              marginBottom: "36px",
            }}
          >
            Gratis para jugadores. Sin tarjeta de crédito.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href={primaryHref}
              className="text-white"
              style={{
                background: "#1565C0",
                padding: "14px 28px",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              Registrarme gratis
            </Link>
            <a
              href="https://wa.me/542984315287"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white"
              style={{
                border: "0.5px solid rgba(255,255,255,0.4)",
                padding: "14px 28px",
                fontSize: "13px",
                fontWeight: "500",
              }}
            >
              Soy dueño de un club
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ────────────────────────────────────────────────── */}
      <footer
        style={{ background: "#F0EDE6", borderTop: "0.5px solid #E8E4DC" }}
        className="px-6 py-6 md:px-10"
      >
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
          <span
            className="tracking-wide"
            style={{ fontSize: "11px", color: "#AAA" }}
          >
            General Roca · Patagonia · Argentina
          </span>
          <span style={{ fontSize: "11px", color: "#AAA" }}>
            pasala.com.ar
          </span>
        </div>
      </footer>
    </>
  );
}
