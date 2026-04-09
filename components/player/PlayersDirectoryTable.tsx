"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CalendarPlus, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { coachCreateBookingAction } from "@/lib/actions/coach.actions";
import type { CoachProfile } from "@/repositories/coach.repository";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DirectoryRow = {
  id: string;
  display_name: string;
  city: string | null;
  city_id: string | null;
  region_code: string | null;
  region_name: string | null;
  category: number | null;
  user_id: string | null;
  pasala_index: number | null;
  level: "ROOKIE" | "AMATEUR" | "COMPETITIVO" | "PRO" | "ELITE";
  win_rate: number;
  played: number;
  current_streak: string;
  activity_level: "muy_activo" | "activo" | "ocasional" | "inactivo" | "nuevo";
  is_same_city: boolean;
  avatarData?: { src: string | null; initials: string };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function categoryLabel(value?: number | null) {
  if (!value) return "-";
  return `${value}ta`;
}

function levelClass(level: DirectoryRow["level"]) {
  if (level === "ELITE")       return "bg-amber-50 text-amber-700 border border-amber-200";
  if (level === "PRO")         return "bg-violet-50 text-violet-700 border border-violet-200";
  if (level === "COMPETITIVO") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (level === "AMATEUR")     return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function levelLabel(level: DirectoryRow["level"]) {
  if (level === "ROOKIE") return "INICIAL";
  return level;
}

function activityMeta(activity: DirectoryRow["activity_level"]) {
  if (activity === "muy_activo") return { label: "Muy activo", className: "bg-rose-50 text-rose-700 border border-rose-200" };
  if (activity === "activo")     return { label: "Activo",     className: "bg-emerald-50 text-emerald-700 border border-emerald-200" };
  if (activity === "ocasional")  return { label: "Ocasional",  className: "bg-amber-50 text-amber-700 border border-amber-200" };
  if (activity === "inactivo")   return { label: "Inactivo",   className: "bg-slate-100 text-slate-700 border border-slate-200" };
  return { label: "Nuevo", className: "bg-cyan-50 text-cyan-700 border border-cyan-200" };
}

function pasalaProgress(value: number | null) {
  const score = Number(value ?? 0);
  return Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
}

function formatCityWithProvinceAbbr(city: string | null, regionCode: string | null, regionName: string | null) {
  if (!city && !regionName) return "";
  const parts = [city, regionCode ?? regionName].filter(Boolean);
  return parts.join(", ");
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  players: DirectoryRow[];
  meId: string;
  coachProfile: CoachProfile | null;
}

export function PlayersDirectoryTable({ players, meId, coachProfile }: Props) {
  const [scheduleFor, setScheduleFor] = useState<DirectoryRow | null>(null);

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] table-fixed">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr className="text-left">
                <th className="w-[19%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Jugador</th>
                <th className="w-[13%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Ubicacion</th>
                <th className="w-[8%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Categoria</th>
                <th className="w-[15%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Indice PASALA</th>
                <th className="w-[10%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Nivel</th>
                <th className="w-[7%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">WR</th>
                <th className="w-[6%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">PJ</th>
                <th className="w-[6%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Racha</th>
                <th className="w-[9%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Actividad</th>
                <th className="w-[7%] px-3 py-2 text-right text-[11px] font-black uppercase tracking-wide text-gray-500">Accion</th>
              </tr>
            </thead>
            <tbody>
              {players.length > 0 ? (
                players.map((p) => {
                  const activity = activityMeta(p.activity_level);
                  const pasala = pasalaProgress(p.pasala_index);
                  const isMe = p.id === meId;
                  return (
                    <tr key={p.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar src={p.avatarData?.src || null} initials={p.avatarData?.initials || p.display_name?.slice(0, 2)} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{p.display_name}</p>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {isMe && <Badge className="bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white">Tu perfil</Badge>}
                              {p.is_same_city && (
                                <Badge className="border border-indigo-100 bg-indigo-50/50 text-[8px] font-medium lowercase tracking-normal text-indigo-500">
                                  tu ciudad
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">
                        <span className="line-clamp-2">{formatCityWithProvinceAbbr(p.city, p.region_code, p.region_name)}</span>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className="border border-gray-200 bg-gray-100 text-gray-700">Cat. {categoryLabel(p.category)}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="w-full max-w-[150px]">
                          <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-gray-700">
                            <span>{p.pasala_index == null ? "-" : p.pasala_index.toFixed(1)}</span>
                            <span>/100</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                            <div className="h-full rounded-full bg-blue-600" style={{ width: `${pasala}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={levelClass(p.level)}>{levelLabel(p.level)}</Badge>
                      </td>
                      <td className="px-3 py-2 text-sm font-semibold text-gray-800">{p.win_rate.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-sm font-semibold text-gray-800">{p.played}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-gray-800">{p.current_streak || "-"}</td>
                      <td className="px-3 py-2">
                        <Badge className={activity.className}>{activity.label}</Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1.5">
                          {coachProfile && !isMe && (
                            <button
                              onClick={() => setScheduleFor(p)}
                              title="Agendar sesión"
                              className="inline-flex items-center justify-center h-7 w-7 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                            >
                              <CalendarPlus className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <Link
                            href={`/p/${p.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-gray-300 transition-colors"
                          >
                            Ver perfil
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-20 text-center">
                    <div className="space-y-3">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50">
                        <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">No se encontraron jugadores</p>
                        <p className="text-sm text-gray-500">Proba con otro filtro o termino de busqueda</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {scheduleFor && coachProfile && (
        <QuickScheduleModal
          player={scheduleFor}
          coachProfile={coachProfile}
          onClose={() => setScheduleFor(null)}
          onSuccess={() => setScheduleFor(null)}
        />
      )}
    </>
  );
}

// ── Quick schedule modal ──────────────────────────────────────────────────────

const DURATIONS = [30, 45, 60] as const;

function QuickScheduleModal({
  player,
  coachProfile,
  onClose,
  onSuccess,
}: {
  player: DirectoryRow;
  coachProfile: CoachProfile;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState<30 | 45 | 60>(60);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canSubmit = !!date && !!time && !!coachProfile.primary_club_id;

  function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await coachCreateBookingAction({
        playerId: player.id,
        scheduledAt: `${date}T${time}:00`,
        durationMinutes: duration,
        clubId: coachProfile.primary_club_id!,
        notesCoach: notes.trim() || null,
      });
      if ("error" in result && result.error) {
        setError(result.error);
      } else {
        onSuccess();
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="text-base font-black text-gray-900">Agendar sesión</p>
            <p className="text-sm text-gray-500 mt-0.5">con {player.display_name}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-5 space-y-4">
          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Fecha</label>
              <input
                type="date"
                value={date}
                min={today}
                onChange={e => setDate(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Hora</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Duración</label>
            <div className="flex gap-2">
              {DURATIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-bold transition-colors ${
                    duration === d
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              Notas <span className="font-normal normal-case text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Ej: Traé raqueta, trabajamos volea..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none"
            />
          </div>

          {!coachProfile.primary_club_id && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Necesitás configurar tu club principal antes de agendar sesiones.{" "}
              <a href="/player/coach?tab=perfil" className="underline font-bold">Configurar perfil</a>
            </p>
          )}

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-black uppercase tracking-widest transition-colors"
          >
            {isPending ? "Agendando..." : "Agendar sesión"}
          </button>
        </div>
      </div>
    </div>
  );
}
