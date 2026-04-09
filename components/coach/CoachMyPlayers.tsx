"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Flame, Clock, Activity } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/Badge";
import type { CoachProfile, CoachStudentRow } from "@/repositories/coach.repository";

interface Props {
  students: CoachStudentRow[];
  coachProfile: CoachProfile | null;
}

function StateBadge({ state }: { state: CoachStudentRow["player_state"] }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    en_forma:  { label: "En forma",  className: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: <TrendingUp  className="h-3 w-3" /> },
    estable:   { label: "Estable",   className: "bg-blue-50 text-blue-700 border border-blue-200",         icon: <Minus        className="h-3 w-3" /> },
    bajando:   { label: "Bajando",   className: "bg-amber-50 text-amber-700 border border-amber-200",      icon: <TrendingDown className="h-3 w-3" /> },
    inactivo:  { label: "Inactivo",  className: "bg-slate-100 text-slate-600 border border-slate-200",     icon: <Clock        className="h-3 w-3" /> },
    en_racha:  { label: "En racha",  className: "bg-rose-50 text-rose-700 border border-rose-200",         icon: <Flame        className="h-3 w-3" /> },
  };
  const c = config[state] ?? config.estable;
  return (
    <Badge className={`inline-flex items-center gap-1 ${c.className}`}>
      {c.icon}
      {c.label}
    </Badge>
  );
}

export function CoachMyPlayers({ students, coachProfile }: Props) {
  return (
    <div className="space-y-8">
      {students.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-black uppercase tracking-wide text-gray-500">Mis alumnos</h2>
          <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead className="border-b border-gray-100 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-gray-500">Jugador</th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-gray-500">PASALA</th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-gray-500">Estado</th>
                    <th className="px-4 py-3 text-left text-[11px] font-black uppercase tracking-wide text-gray-500">Desafíos</th>
                    <th className="px-4 py-3 text-right text-[11px] font-black uppercase tracking-wide text-gray-500">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <UserAvatar src={s.avatar_url} initials={s.display_name.slice(0, 2)} size="sm" />
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{s.display_name}</p>
                            <p className="text-[11px] text-gray-400">
                              {s.last_match_at
                                ? `Último partido: ${new Date(s.last_match_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}`
                                : "Sin partidos"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-gray-900">
                            {s.pasala_index != null ? s.pasala_index.toFixed(1) : "-"}
                          </span>
                          {s.index_delta_30d != null && (
                            <span className={`text-[11px] font-semibold ${s.index_delta_30d > 0 ? "text-emerald-600" : s.index_delta_30d < 0 ? "text-red-500" : "text-gray-400"}`}>
                              {s.index_delta_30d > 0 ? "+" : ""}{s.index_delta_30d.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StateBadge state={s.player_state} />
                      </td>
                      <td className="px-4 py-3">
                        {s.challenge_count > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                            <Activity className="h-3 w-3" />
                            {s.challenge_count}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/player/coach?tab=legajo&player=${s.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-blue-300 hover:text-blue-700 transition-colors"
                        >
                          Ver legajo
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-50">
            <Activity className="h-8 w-8 text-gray-300" />
          </div>
          <div>
            <p className="font-bold text-gray-900">Sin alumnos activos</p>
            <p className="text-sm text-gray-500 mt-1">
              Invitá jugadores desde el{" "}
              <Link href="/player/players" className="text-blue-600 underline font-semibold">
                directorio
              </Link>{" "}
              para sumarlos como alumnos.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
