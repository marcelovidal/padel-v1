"use client";

import { useState } from "react";

type Rol = "jugador" | "Dueño de club" | "Entrenador";

const ROLES: { value: Rol; label: string }[] = [
  { value: "jugador",        label: "Jugador"       },
  { value: "Dueño de club",  label: "Dueño de club" },
  { value: "Entrenador",     label: "Entrenador"    },
];

export function LandingContacto() {
  const [nombre,   setNombre]   = useState("");
  const [email,    setEmail]    = useState("");
  const [mensaje,  setMensaje]  = useState("");
  const [rol,      setRol]      = useState<Rol>("jugador");
  const [enviando, setEnviando] = useState(false);
  const [enviado,  setEnviado]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async () => {
    if (!nombre || !email || !mensaje) return;
    setEnviando(true);
    setError("");

    try {
      const mensajeCompleto = `Soy ${rol}.\n\n${mensaje}`;
      const res = await fetch("/api/support/public-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nombre,
          email,
          message: mensajeCompleto,
          currentUrl: window.location.href,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setEnviado(true);
      } else {
        setError(data.error || "Hubo un error al enviar.");
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const resetForm = () => {
    setEnviado(false);
    setNombre("");
    setEmail("");
    setMensaje("");
    setRol("jugador");
  };

  const inputClass =
    "w-full border border-stone-200 rounded-xl px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-[#1565C0] focus:ring-2 focus:ring-blue-50 transition-colors mb-4";

  return (
    <section id="contacto" className="relative overflow-hidden px-8 py-24" style={{ background: "#0a1628" }}>
      {/* Círculos decorativos de fondo */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" style={{ top: 0, left: "25%", transform: "translateX(-50%)" }} />
        <div className="absolute h-80 w-80 rounded-full bg-blue-400/5 blur-3xl" style={{ bottom: 0, right: "25%" }} />
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-16 lg:grid-cols-2">

        {/* ── COLUMNA IZQUIERDA — Copy ───────────────────────────────── */}
        <div className="flex flex-col justify-center">
          <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-blue-400/60">
            CONTACTO
          </p>
          <h2
            className="mb-4 text-4xl font-normal leading-tight text-white lg:text-5xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            ¿Querés saber más?
          </h2>
          <p className="mb-8 text-base text-slate-400">
            Escribinos y te contamos cómo PASALA puede funcionar para vos,
            tu club o tus alumnos.
          </p>

          <div className="flex flex-col gap-4">
            {/* WhatsApp */}
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 shrink-0 text-emerald-500">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 0C5.373 0 0 5.373 0 12c0 2.136.561 4.14 1.541 5.874L.057 23.882l6.19-1.622A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.894a9.878 9.878 0 01-5.031-1.378l-.361-.214-3.741.981.999-3.648-.235-.374A9.859 9.859 0 012.106 12C2.106 6.58 6.58 2.106 12 2.106c5.421 0 9.894 4.474 9.894 9.894 0 5.421-4.473 9.894-9.894 9.894z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-white">+54 298 431-5287</div>
                <a
                  href="https://wa.me/5492984315287"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Escribir ahora →
                </a>
              </div>
            </div>

            {/* Ubicación */}
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-5 w-5 shrink-0 text-slate-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
              <span className="text-sm text-slate-400">
                General Roca · Patagonia · Argentina
              </span>
            </div>
          </div>
        </div>

        {/* ── COLUMNA DERECHA — Formulario ──────────────────────────── */}
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          {enviado ? (
            <div className="py-12 text-center">
              <div className="mb-4 text-5xl">✓</div>
              <p className="text-lg font-semibold text-slate-900">¡Mensaje enviado!</p>
              <p className="mt-2 text-sm text-slate-500">
                Te respondemos a la brevedad. También podés escribirnos por WhatsApp.
              </p>
              <a
                href="https://wa.me/5492984315287"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
              >
                Abrir WhatsApp →
              </a>
              <button
                onClick={resetForm}
                className="mx-auto mt-3 block text-xs text-slate-400 hover:underline"
              >
                Enviar otro mensaje
              </button>
            </div>
          ) : (
            <>
              <p className="mb-6 text-lg font-semibold text-slate-900">
                Mandanos un mensaje
              </p>

              {/* Selector de rol */}
              <p className="mb-2 text-xs font-medium text-slate-600">Soy...</p>
              <div className="mb-5 flex flex-wrap gap-2">
                {ROLES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRol(value)}
                    className={`cursor-pointer rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                      rol === value
                        ? "border-[#1565C0] bg-[#1565C0] text-white"
                        : "border-stone-200 bg-white text-slate-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Campo nombre */}
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Tu nombre
              </label>
              <input
                type="text"
                placeholder="Ej: Martín González"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={inputClass}
              />

              {/* Campo email */}
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Email
              </label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />

              {/* Campo mensaje */}
              <label className="mb-1 block text-xs font-medium text-slate-600">
                ¿En qué te podemos ayudar?
              </label>
              <textarea
                rows={4}
                placeholder="Contanos si sos jugador, entrenador o dueño de club, y en qué podemos ayudarte..."
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                className={`${inputClass} resize-none`}
              />

              <button
                type="button"
                onClick={handleSubmit}
                disabled={enviando || !nombre || !email || !mensaje}
                className="mt-2 w-full rounded-xl bg-[#1565C0] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1244a0] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {enviando ? "Enviando..." : "Enviar mensaje"}
              </button>

              {error && (
                <p className="mt-2 text-center text-xs text-red-500">{error}</p>
              )}
            </>
          )}
        </div>

      </div>
    </section>
  );
}

