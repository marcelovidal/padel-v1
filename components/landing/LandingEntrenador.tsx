"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export function LandingEntrenador() {
  const photoRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          setTimeout(() => setCardsVisible(true), 150);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    if (photoRef.current) observer.observe(photoRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="entrenadores" className="bg-white">
      <style>{`
        @keyframes entPhotoIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes entCardUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch">

        {/* ── MITAD IZQUIERDA — Foto ─────────────────────────────────── */}
        <div
          ref={photoRef}
          className="relative h-[300px] overflow-hidden lg:h-full lg:min-h-[600px]"
          style={
            visible
              ? { animation: "entPhotoIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) both" }
              : { opacity: 0 }
          }
        >
          <Image
            src="/landing/entrenador.png"
            alt="Entrenador con alumnos en cancha nocturna"
            fill
            className="object-cover"
            style={{ objectPosition: "left center" }}
            loading="lazy"
          />
          {/* Overlay suave hacia la derecha */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20" />
          {/* Gradiente en borde derecho para disimular corte */}
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-white/60 to-transparent" />

          {/* Badge sobre la card */}
          <div className="absolute bottom-6 left-6 z-10">
            <div className="relative">
              <div className="absolute left-4 top-[-10px] z-10">
                <span className="inline-block rounded-full bg-[#1565C0] px-2 py-0.5 text-[9px] font-semibold text-white">
                  ENTRENADOR VERIFICADO
                </span>
              </div>
              {/* Card flotante de perfil */}
              <div
                style={{
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.8)",
                  borderRadius: "1rem",
                  padding: "1rem 1.25rem",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                    style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
                  >
                    CR
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Carlos Romero</p>
                    <p className="text-xs text-slate-500">Técnico federado · Club Andino</p>
                    <div className="mt-1 flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className="text-xs text-amber-400">★</span>
                      ))}
                      <span className="ml-1 text-xs text-slate-400">(12 alumnos)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── MITAD DERECHA — Contenido ──────────────────────────────── */}
        <div className="flex flex-col justify-center bg-white px-6 py-10 lg:px-10 lg:py-16">

          {/* Label + Claim */}
          <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-[#1565C0]">
            PARA ENTRENADORES
          </p>
          <h2
            className="mb-4 text-4xl font-normal leading-tight text-[#080808] lg:text-5xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            Tu método.<br />
            Sus resultados.<br />
            <span className="italic">Todo en la app.</span>
          </h2>
          <p className="mb-10 text-base text-slate-500">
            Gestioná tus clases, seguí la evolución de cada alumno y conectate
            con los clubes de la Patagonia.
          </p>

          {/* Tres feature cards */}
          <div className="grid grid-cols-1 gap-3">

            {/* Card 1 — Perfil público */}
            <div
              className="rounded-2xl border border-stone-100 bg-stone-50 p-5"
              style={
                cardsVisible
                  ? { animation: "entCardUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0s both" }
                  : { opacity: 0 }
              }
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" className="h-4 w-4">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-800">Perfil público</span>
              </div>
              <p className="text-xs leading-relaxed text-slate-500">
                Los jugadores te encuentran, ven tu especialidad y reservan clases
                directamente desde su perfil.
              </p>
              <div className="mt-3">
                <p className="mb-1 text-[10px] text-slate-400">Tus alumnos:</p>
                <div className="flex -space-x-2">
                  {[
                    { i: "FV", c: "bg-blue-200 text-blue-700" },
                    { i: "MC", c: "bg-emerald-200 text-emerald-700" },
                    { i: "PR", c: "bg-amber-200 text-amber-700" },
                    { i: "LT", c: "bg-purple-200 text-purple-700" },
                    { i: "+8", c: "bg-slate-100 text-slate-500" },
                  ].map(({ i, c }) => (
                    <div key={i} className={`flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[8px] font-bold ${c}`}>
                      {i}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2 — Agenda de clases */}
            <div
              className="rounded-2xl border border-stone-100 bg-stone-50 p-5"
              style={
                cardsVisible
                  ? { animation: "entCardUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both" }
                  : { opacity: 0 }
              }
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" className="h-4 w-4">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-800">Agenda de clases</span>
              </div>
              <div>
                {[
                  { dot: "bg-blue-500",    hora: "Lun 21 · 18:00", clase: "Clase avanzada · Cancha 1",    cupo: "4/6" },
                  { dot: "bg-emerald-500", hora: "Mar 22 · 07:00", clase: "Preparación física · Cancha 3", cupo: "3/4" },
                  { dot: "bg-amber-500",   hora: "Mié 23 · 10:00", clase: "Iniciación · Cancha 2",        cupo: "6/8" },
                ].map(({ dot, hora, clase, cupo }) => (
                  <div key={hora} className="flex items-center gap-2 border-b border-stone-100 py-1.5 last:border-0">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
                    <span className="text-xs font-medium text-slate-700 whitespace-nowrap">{hora}</span>
                    <span className="flex-1 truncate text-xs text-slate-400">{clase}</span>
                    <span className="text-xs font-medium text-emerald-600">{cupo}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3 — Evolución del alumno */}
            <div
              className="rounded-2xl border border-stone-100 bg-stone-50 p-5"
              style={
                cardsVisible
                  ? { animation: "entCardUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both" }
                  : { opacity: 0 }
              }
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" className="h-4 w-4">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                </div>
                <span className="text-sm font-semibold text-slate-800">Evolución de tus alumnos</span>
              </div>
              {/* Mini perfil alumno */}
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                  MC
                </div>
                <span className="text-sm font-semibold text-slate-800">M. Castro</span>
                <span className="ml-auto text-xs font-bold text-[#1565C0]">Índice: 63.9</span>
              </div>
              {/* Barra de progreso */}
              <p className="mb-1 text-[10px] text-slate-400">Progreso (últimos 30 días)</p>
              <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-stone-200">
                <div className="h-full w-[64%] rounded-full bg-[#1565C0]" />
              </div>
              <p className="mb-2 text-xs text-emerald-600">↑ 4.2 puntos este mes</p>
              {/* Desafío activo */}
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5">
                <span className="text-amber-500">⚡</span>
                <span className="text-[10px] font-semibold text-amber-700">Desafío activo:</span>
                <span className="text-[10px] text-amber-600">Ganar 3 partidos seguidos</span>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-8">
            <Link href="/welcome">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#1565C0] px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors duration-200 hover:bg-[#1244a0]">
                Crear mi perfil de entrenador →
              </span>
            </Link>
            <Link href="/player/login" className="mt-2 inline-block text-xs text-slate-500 underline underline-offset-2 transition-colors hover:text-[#1565C0]">
              ¿Ya tenés cuenta? Ingresá →
            </Link>
            <span className="mt-3 block text-xs text-slate-400">
              Ya hay entrenadores usando PASALA en la Patagonia.
            </span>
          </div>
        </div>

      </div>
    </section>
  );
}
