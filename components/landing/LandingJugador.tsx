"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

interface CardData {
  label: string;
  stat?: string;
  statClass?: string;
  desc?: string;
  badges?: string[];
  detail?: string;
  custom?: React.ReactNode;
}

const CARDS: CardData[] = [
  // ── 0: ÚLTIMO PARTIDO ───────────────────────────────────────────
  {
    label: "ÚLTIMO PARTIDO",
    custom: (
      <>
        <div className="mt-2 flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-semibold text-[#0C0C0C]">Club Andino · Gral. Roca</p>
            <p className="text-sm text-[#6B6965]">Sáb. 19 abr. · 20:00hs</p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
            FINALIZADO
          </span>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center gap-3 border-b border-stone-100 pb-1">
            <span className="flex-1 text-xs uppercase tracking-wider text-[#6B6965]">
              Equipos
            </span>
            <span className="w-5 text-center text-xs uppercase tracking-wider text-[#6B6965]">
              S1
            </span>
            <span className="w-5 text-center text-xs uppercase tracking-wider text-[#6B6965]">
              S2
            </span>
            <span className="w-16" />
          </div>

          <div className="mb-2 flex items-center gap-3">
            <span className="flex-1 text-base font-semibold text-[#0C0C0C]">
              M. Castro / R. Peña
            </span>
            <span className="w-5 text-center text-base font-bold text-[#E5352A]">6</span>
            <span className="w-5 text-center text-base font-bold text-[#E5352A]">6</span>
            <span className="w-16 rounded-full bg-[#E5352A] px-2 py-0.5 text-center text-xs text-white">
              GANADOR
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex-1 text-base text-[#6B6965]">Lucas T. / Diego M.</span>
            <span className="w-5 text-center text-base text-[#6B6965]">3</span>
            <span className="w-5 text-center text-base text-[#6B6965]">4</span>
            <span className="w-16" />
          </div>
        </div>

        <div className="mt-4 flex items-start justify-between border-t border-stone-100 pt-3">
          <div>
            <p className="text-xs text-[#6B6965]">Autoevaluación</p>
            <p className="text-sm font-medium text-emerald-600">Completa ✓</p>
          </div>
          <p className="text-sm text-[#6B6965]">3 sets jugados</p>
        </div>
      </>
    ),
  },

  // ── 1: RANKING DEL CLUB ─────────────────────────────────────────
  {
    label: "RANKING DEL CLUB",
    custom: (
      <>
        <div className="mt-2 mb-4 flex items-center justify-between">
          <p className="text-sm text-[#6B6965]">Club Andino · General Roca</p>
          <span className="rounded-full bg-[#F5F2EE] border border-[#E5352A]/30 px-2 py-0.5 text-xs font-semibold text-[#E5352A]">
            4ª CAT
          </span>
        </div>

        <div className="space-y-1">
          <div className="mb-2 flex items-center gap-2 border-b border-stone-100 pb-1">
            <span className="w-5 text-xs uppercase tracking-wider text-slate-300">#</span>
            <span className="flex-1 text-xs uppercase tracking-wider text-slate-300">Jugador</span>
            <span className="w-8 text-center text-xs uppercase tracking-wider text-slate-300">PTS</span>
            <span className="w-10 text-center text-xs uppercase tracking-wider text-slate-300">IDX</span>
            <span className="w-8 text-center text-xs uppercase tracking-wider text-slate-300">WR</span>
          </div>

          <div className="flex items-center gap-2 py-0.5">
            <span className="w-5 text-center text-sm font-bold text-[#E5352A]">1</span>
            <div className="flex flex-1 items-center gap-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">MC</span>
              <span className="text-sm text-slate-600">M. Castro</span>
            </div>
            <span className="w-8 text-center text-sm text-[#6B6965]">24</span>
            <span className="w-10 text-center text-sm font-semibold text-slate-700">81</span>
            <span className="w-8 text-center text-sm text-[#6B6965]">79%</span>
          </div>

          <div className="flex items-center gap-2 py-0.5">
            <span className="w-5 text-center text-sm font-bold text-[#E5352A]">2</span>
            <div className="flex flex-1 items-center gap-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">PR</span>
              <span className="text-sm text-slate-600">P. Ríos</span>
            </div>
            <span className="w-8 text-center text-sm text-[#6B6965]">21</span>
            <span className="w-10 text-center text-sm font-semibold text-slate-700">77</span>
            <span className="w-8 text-center text-sm text-[#6B6965]">74%</span>
          </div>

          <div className="flex items-center gap-2 rounded-lg bg-[#E5352A]/8 px-1.5 py-1">
            <span className="w-5 text-center text-sm font-bold text-[#E5352A]">3</span>
            <div className="flex flex-1 items-center gap-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E5352A] text-xs font-bold text-white">FV</span>
              <span className="text-sm font-semibold text-[#E5352A]">F. Vidal</span>
              <span className="rounded-full bg-[#E5352A]/15 px-1.5 text-xs font-bold text-[#E5352A]">vos</span>
            </div>
            <span className="w-8 text-center text-sm font-medium text-[#E5352A]">18</span>
            <span className="w-10 text-center text-sm font-bold text-[#E5352A]">73</span>
            <span className="w-8 text-center text-sm font-medium text-[#E5352A]">68%</span>
          </div>

          <div className="flex items-center gap-2 py-0.5">
            <span className="w-5 text-center text-sm text-[#6B6965]">4</span>
            <div className="flex flex-1 items-center gap-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">LT</span>
              <span className="text-sm text-[#6B6965]">Lucas T.</span>
            </div>
            <span className="w-8 text-center text-sm text-[#6B6965]">15</span>
            <span className="w-10 text-center text-sm text-slate-600">69</span>
            <span className="w-8 text-center text-sm text-[#6B6965]">61%</span>
          </div>

          <div className="flex items-center gap-2 py-0.5">
            <span className="w-5 text-center text-sm text-[#6B6965]">5</span>
            <div className="flex flex-1 items-center gap-1.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">DM</span>
              <span className="text-sm text-[#6B6965]">D. Morales</span>
            </div>
            <span className="w-8 text-center text-sm text-[#6B6965]">12</span>
            <span className="w-10 text-center text-sm text-slate-600">65</span>
            <span className="w-8 text-center text-sm text-[#6B6965]">55%</span>
          </div>
        </div>

        <div className="mt-4 border-t border-stone-100 pt-3">
          <p className="text-right text-xs font-semibold text-[#E5352A]">
            Ver ranking completo →
          </p>
        </div>
      </>
    ),
  },

  // ── 2: ENCONTRÁ TU PRÓXIMO RIVAL ────────────────────────────────
  {
    label: "ENCONTRÁ TU PRÓXIMO RIVAL",
    custom: (
      <>
        <div className="mt-2">
          <div className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5">
            <svg className="h-3.5 w-3.5 shrink-0 text-[#6B6965]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <span className="text-sm text-[#6B6965]">Buscá por nombre o club…</span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#E5352A] bg-[#E5352A] px-2.5 py-0.5 text-xs font-semibold text-white">
              4ª categoría
            </span>
            <span className="rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs text-[#6B6965]">
              Club Andino
            </span>
            <span className="rounded-full border border-stone-200 bg-white px-2.5 py-0.5 text-xs text-[#6B6965]">
              Gral. Roca
            </span>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-[#6B6965]">
            Resultado más relevante
          </p>
          <div className="flex items-center gap-3 rounded-xl border border-stone-100 bg-white p-3 shadow-sm">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
              LT
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-[#0C0C0C]">Lucas T.</p>
              <p className="text-xs text-[#6B6965]">Club Andino · 4ª cat · índice 69</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600">
              86% WR juntos
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-stone-100 pt-3">
          <p className="text-right text-xs font-semibold text-[#E5352A]">
            Buscar rivales en la app →
          </p>
        </div>
      </>
    ),
  },

  // ── 3: ATRIBUTOS TÉCNICOS ────────────────────────────────────────
  {
    label: "ATRIBUTOS TÉCNICOS",
    custom: (
      <>
        <p className="text-xs text-[#6B6965] mt-0.5 mb-3">
          Promedio basado en tus evaluaciones
        </p>

        <svg
          viewBox="0 0 120 120"
          width={120}
          height={120}
          className="mx-auto"
        >
          <polygon
            points="60,10 96,25 110,60 96,95 60,110 24,95 10,60 24,25"
            fill="none"
            stroke="#e7e5e4"
            strokeWidth={1}
          />
          <polygon
            points="60,18 90,30 102,60 90,90 60,102 30,90 18,60 30,30"
            fill="rgba(96,165,250,0.4)"
            stroke="#3b82f6"
            strokeWidth={1.5}
          />
          <text x="57" y="7" textAnchor="middle" fontSize="7" fill="#94a3b8">Volea</text>
          <text x="98" y="23" textAnchor="start" fontSize="7" fill="#94a3b8">Globo</text>
          <text x="112" y="62" textAnchor="start" fontSize="7" fill="#94a3b8">Remate</text>
          <text x="98" y="98" textAnchor="start" fontSize="7" fill="#94a3b8">Bandeja</text>
          <text x="54" y="113" textAnchor="middle" fontSize="7" fill="#94a3b8">Víbora</text>
          <text x="16" y="98" textAnchor="end" fontSize="7" fill="#94a3b8">Bajada</text>
          <text x="4" y="62" textAnchor="end" fontSize="7" fill="#94a3b8">Saque</text>
          <text x="16" y="23" textAnchor="end" fontSize="7" fill="#94a3b8">Recep</text>
        </svg>

        <div className="mt-3">
          <p className="text-xs tracking-wider text-[#6B6965] uppercase mb-2">
            FORMA RECIENTE (ÚLTIMOS 10)
          </p>
          <div className="flex gap-1">
            {(["L","W","W","W","L","W","W","W","W","W"] as const).map((r, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold ${
                  r === "W" ? "bg-emerald-500 text-white" : "bg-red-400 text-white"
                }`}
              >
                {r}
              </div>
            ))}
          </div>
        </div>
      </>
    ),
  },

  // ── 4: TU RENDIMIENTO ────────────────────────────────────────────
  {
    label: "TU RENDIMIENTO",
    custom: (
      <>
        <p className="text-xs text-[#6B6965] mt-0.5">
          Basado en tus 18 partidos registrados
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs uppercase tracking-wider text-[#6B6965]">JUGADOS</p>
            <p className="text-3xl sm:text-4xl font-bold text-[#0C0C0C] leading-none mt-1">18</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs uppercase tracking-wider text-[#6B6965]">GANADOS</p>
            <p className="text-3xl sm:text-4xl font-bold text-[#E5352A] leading-none mt-1">11</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs uppercase tracking-wider text-[#6B6965]">EFECTIVIDAD</p>
            <p className="text-3xl sm:text-4xl font-bold text-[#0C0C0C] leading-none mt-1">61.1%</p>
          </div>
          <div className="bg-stone-50 rounded-xl p-3">
            <p className="text-xs uppercase tracking-wider text-[#6B6965]">RACHA</p>
            <p className="text-3xl sm:text-4xl font-bold text-red-400 leading-none mt-1">L1</p>
            <p className="text-xs text-[#6B6965]">última: derrota</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs tracking-wider text-[#6B6965] uppercase mb-2">
            COMPONENTES ÍNDICE PASALA
          </p>
          {[
            { label: "Efectividad (35%)",    width: "61%", color: "bg-blue-500",    val: "61" },
            { label: "Nivel rivales (25%)",  width: "40%", color: "bg-purple-400",  val: "40" },
            { label: "Técnica (26%)",        width: "22%", color: "bg-blue-400",    val: "22" },
            { label: "Forma reciente (12%)", width: "80%", color: "bg-emerald-400", val: "80" },
            { label: "Experiencia (8%)",     width: "75%", color: "bg-amber-400",   val: "75" },
          ].map(({ label, width, color, val }) => (
            <div key={label} className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-[#6B6965] w-24 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width }} />
              </div>
              <span className="text-xs text-[#6B6965] w-5 text-right">{val}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
];

export function LandingJugador() {
  // ── Carrusel con barra de progreso ──────────────────────────────
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const activeRef = useRef(0);
  const progressRef = useRef(0);

  useEffect(() => {
    const tick = setInterval(() => {
      progressRef.current += 100 / 50; // 50 ticks × 100ms = 5 s

      if (progressRef.current >= 100) {
        progressRef.current = 0;
        activeRef.current = (activeRef.current + 1) % CARDS.length;
        setActive(activeRef.current);
        setProgress(0);
      } else {
        setProgress(progressRef.current);
      }
    }, 100);
    return () => clearInterval(tick);
  }, []); // montado una sola vez — refs evitan closure stale

  const goTo = useCallback((i: number) => {
    activeRef.current = i;
    progressRef.current = 0;
    setActive(i);
    setProgress(0);
  }, []);

  // ── Animación de la foto basada en scroll ────────────────────────
  const photoRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!photoRef.current) return;
      const rect = photoRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const prog = Math.min(
        Math.max((windowHeight - rect.top) / (windowHeight * 0.6), 0),
        1
      );
      setScrollProgress(prog);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const card = CARDS[active];

  return (
    <section
      id="jugadores"
      className="relative px-8 pb-24 pt-36"
      style={{
        marginTop: "-120px",
        zIndex: 10,
        background: "linear-gradient(to bottom, transparent 0%, white 120px)",
      }}
    >
      <style>{`
        @keyframes cardFade {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">

        {/* ── FOTO — mobile: arriba (order-1), desktop: derecha (order-2) ── */}
        <div
          ref={photoRef}
          className="relative order-1 lg:order-2"
          style={{
            opacity: scrollProgress,
            transform: `scale(${0.88 + scrollProgress * 0.12}) translateY(${
              (1 - scrollProgress) * 40
            }px)`,
            transition: "opacity 0.1s ease-out, transform 0.1s ease-out",
          }}
        >
          {/* Rectángulo decorativo detrás */}
          <div
            className="absolute inset-0 rounded-2xl bg-stone-100"
            style={{ transform: "translate(16px, 16px)", zIndex: -1 }}
          />
          <Image
            src="/landing/jugador-movil.png"
            alt="Jugador revisando su perfil en PASALA"
            width={600}
            height={800}
            className="relative w-full rounded-2xl object-cover"
          />
        </div>

        {/* ── CARRUSEL — mobile: abajo (order-2), desktop: izquierda (order-1) ── */}
        <div className="order-2 lg:order-1">

          {/* Encabezado fijo */}
          <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[#E5352A]">
            PARA JUGADORES
          </p>
          <h2
            className="mb-10 text-4xl font-normal leading-tight text-[#080808] lg:text-5xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            El partido terminó.
            <br />
            Tu juego recién empieza.
          </h2>

          {/* Área de la tarjeta activa */}
          <div className="relative min-h-[260px] overflow-hidden">
            <div
              key={active}
              style={{ animation: "cardFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) both" }}
            >
              <div className="rounded-2xl border-2 border-[#E5352A] bg-[#F5F2EE] p-4 sm:p-7 shadow-md">
                <div className="flex flex-col">
                  <p className="mb-3 text-[10px] uppercase tracking-widest text-[#E5352A]">
                    {card.label}
                  </p>
                  {card.custom ? (
                    card.custom
                  ) : (
                    <>
                      <p
                        className={`font-bold leading-none text-[#E5352A] ${
                          card.statClass ?? "text-6xl"
                        }`}
                      >
                        {card.stat}
                      </p>
                      {card.desc && (
                        <p className="mt-3 text-sm font-medium text-slate-700">{card.desc}</p>
                      )}
                      {card.badges && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {card.badges.map((b) => (
                            <span
                              key={b}
                              className="inline-flex items-center rounded border border-stone-200 bg-white px-2 py-1 font-mono text-[11px] text-slate-700"
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                      {card.detail && (
                        <p className="mt-1 text-xs text-[#6B6965]">{card.detail}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabs de navegación */}
          <div className="mt-6 flex flex-wrap gap-2">
            {(["PARTIDO", "RANKING", "RIVAL", "ATRIBUTOS", "RENDIMIENTO"] as const).map((tab, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={tab}
                className={`rounded-full px-3 py-1.5 text-[10px] font-bold tracking-widest transition-colors ${
                  i === active
                    ? "bg-[#0C0C0C] text-white"
                    : "border border-[#0C0C0C]/20 bg-transparent text-[#6B6965] hover:border-[#0C0C0C]/40"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Barra de progreso */}
          <div className="mt-3 flex items-center gap-1.5">
            {CARDS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Tarjeta ${i + 1}`}
                className="flex-1"
              >
                {i === active ? (
                  <div className="h-1 w-full overflow-hidden rounded-full bg-[#0C0C0C]/15">
                    <div
                      className="h-full rounded-full bg-[#E5352A]"
                      style={{ width: `${progress}%`, transition: "width 0.1s linear" }}
                    />
                  </div>
                ) : (
                  <div className="h-1 w-full rounded-full bg-[#0C0C0C]/15" />
                )}
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8">
            <Link href="/welcome">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#E5352A] px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors duration-200 hover:bg-[#B82820] hover:shadow-lg">
                Creá tu perfil gratis
                <span className="text-base">→</span>
              </span>
            </Link>
            <Link href="/player/login" className="mt-2 inline-block text-xs text-[#6B6965] underline underline-offset-2 transition-colors hover:text-[#E5352A]">
              ¿Ya tenés cuenta? Ingresá →
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}
