"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveCoachSetupAction } from "@/lib/actions/coach.actions";
import type { PlayerClubSearchResult } from "@/repositories/club.repository";

const ESPECIALIDADES = [
  { value: "iniciacion",       label: "Iniciación" },
  { value: "tecnica",          label: "Técnica" },
  { value: "competicion",      label: "Competición" },
  { value: "alto_rendimiento", label: "Alto rendimiento" },
  { value: "todos_los_niveles",label: "Todos los niveles" },
];

const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface AvailabilitySlot {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

interface Props {
  clubs: PlayerClubSearchResult[];
}

export function CoachSetupForm({ clubs }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tarifaPublica, setTarifaPublica] = useState(false);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const router = useRouter();

  function addSlot() {
    setSlots((prev) => [...prev, { day_of_week: 1, start_time: "09:00", end_time: "11:00", slot_duration_minutes: 60 }]);
  }

  function removeSlot(i: number) {
    setSlots((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateSlot(i: number, field: keyof AvailabilitySlot, value: string | number) {
    setSlots((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("tarifa_publica", tarifaPublica ? "true" : "false");

    startTransition(async () => {
      const result = await saveCoachSetupAction(fd);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Club principal */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Club principal</h2>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            ¿En qué club das clases?
          </label>
          <select
            name="primary_club_id"
            className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
          >
            <option value="">Seleccioná un club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.city ? ` — ${c.city}` : ""}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1.5">Podés agregar más clubes después.</p>
        </div>
      </div>

      {/* Especialidad + Bio */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Tu perfil</h2>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Especialidad</label>
          <select
            name="especialidad"
            className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Seleccioná tu especialidad</option>
            {ESPECIALIDADES.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">Bio</label>
          <textarea
            name="bio"
            rows={3}
            placeholder="Contales a tus futuros alumnos quién sos y cómo trabajás..."
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
          />
        </div>
      </div>

      {/* Tarifa */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Tarifa</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Tarifa por hora (ARS)</label>
            <input
              name="tarifa_por_hora"
              type="number"
              min={0}
              placeholder="0"
              className="w-full h-11 rounded-xl border border-gray-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-2 mt-5">
            <button
              type="button"
              onClick={() => setTarifaPublica((v) => !v)}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${tarifaPublica ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform mt-0.5 ${tarifaPublica ? "translate-x-5.5" : "translate-x-0.5"}`} />
            </button>
            <span className="text-xs font-semibold text-gray-600">Mostrar públicamente</span>
          </div>
        </div>
      </div>

      {/* Disponibilidad */}
      <div className="rounded-3xl border border-gray-100 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Disponibilidad semanal</h2>
          <button
            type="button"
            onClick={addSlot}
            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            + Agregar franja
          </button>
        </div>
        <p className="text-xs text-gray-400">Configurá cuándo estás disponible para que los jugadores puedan reservar.</p>
        {slots.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Sin franjas configuradas todavía.</p>
        ) : (
          <div className="space-y-3">
            {slots.map((slot, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_1fr_auto_auto] gap-2 items-center">
                <select
                  value={slot.day_of_week}
                  onChange={(e) => updateSlot(i, "day_of_week", Number(e.target.value))}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-2 text-sm font-semibold focus:outline-none"
                >
                  {DAYS.map((d, idx) => (
                    <option key={idx} value={idx}>{d}</option>
                  ))}
                </select>
                <input
                  type="time"
                  value={slot.start_time}
                  onChange={(e) => updateSlot(i, "start_time", e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 px-2 text-sm focus:outline-none"
                />
                <input
                  type="time"
                  value={slot.end_time}
                  onChange={(e) => updateSlot(i, "end_time", e.target.value)}
                  className="h-10 rounded-xl border border-gray-200 px-2 text-sm focus:outline-none"
                />
                <select
                  value={slot.slot_duration_minutes}
                  onChange={(e) => updateSlot(i, "slot_duration_minutes", Number(e.target.value))}
                  className="h-10 rounded-xl border border-gray-200 bg-white px-2 text-sm focus:outline-none"
                >
                  <option value={30}>30 min</option>
                  <option value={45}>45 min</option>
                  <option value={60}>60 min</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeSlot(i)}
                  className="h-10 w-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 text-center">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98]"
      >
        {isPending ? "Guardando..." : "Guardar y activar mi perfil"}
      </button>
    </form>
  );
}
