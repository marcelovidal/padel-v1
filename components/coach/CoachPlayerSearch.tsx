"use client";

import React, { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Search, UserPlus, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { Badge } from "@/components/ui/Badge";
import { invitePlayerAction, getPlayerCoachDetailsAction } from "@/lib/actions/coach.actions";
import type { PlayerCoachDetails } from "@/lib/actions/coach.actions";
import { formatCityWithProvinceAbbr } from "@/lib/utils/location";
import type { CoachProfile } from "@/repositories/coach.repository";

// ── Types ─────────────────────────────────────────────────────

type DirectoryRow = {
  id: string;
  display_name: string;
  city: string | null;
  city_id: string | null;
  region_code: string | null;
  region_name: string | null;
  category: number | null;
  avatar_url: string | null;
  pasala_index: number | null;
  level: "ROOKIE" | "AMATEUR" | "COMPETITIVO" | "PRO" | "ELITE";
  win_rate: number;
  played: number;
  current_streak: string;
  activity_level: "muy_activo" | "activo" | "ocasional" | "inactivo" | "nuevo";
  is_same_city: boolean;
};

type InviteStatus = "none" | "pending" | "active" | "inactive" | "invited_now";

interface Props {
  players: DirectoryRow[];
  coachPlayerStatuses: { player_id: string; status: string }[];
  coachProfile: CoachProfile | null;
  myPlayerId: string;
  initialQuery: string;
}

// ── Helpers ───────────────────────────────────────────────────

function levelClass(level: DirectoryRow["level"]) {
  if (level === "ELITE") return "bg-amber-50 text-amber-700 border border-amber-200";
  if (level === "PRO") return "bg-violet-50 text-violet-700 border border-violet-200";
  if (level === "COMPETITIVO") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (level === "AMATEUR") return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function levelLabel(level: DirectoryRow["level"]) {
  return level === "ROOKIE" ? "INICIAL" : level;
}

function activityMeta(activity: DirectoryRow["activity_level"]) {
  const map = {
    muy_activo: { label: "Muy activo",  className: "bg-rose-50 text-rose-700 border border-rose-200" },
    activo:     { label: "Activo",       className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    ocasional:  { label: "Ocasional",   className: "bg-amber-50 text-amber-700 border border-amber-200" },
    inactivo:   { label: "Inactivo",    className: "bg-slate-100 text-slate-700 border border-slate-200" },
    nuevo:      { label: "Nuevo",       className: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
  };
  return map[activity] ?? map.nuevo;
}

function pasalaProgress(value: number | null) {
  const n = Number(value ?? 0);
  return Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
}

function categoryLabel(v?: number | null) {
  return v ? `${v}ta` : "-";
}

// ── Skills Radar ──────────────────────────────────────────────

const SKILL_DEFS = [
  { key: "volea",          label: "Volea" },
  { key: "globo",          label: "Globo" },
  { key: "remate",         label: "Remate" },
  { key: "bandeja",        label: "Bandeja" },
  { key: "vibora",         label: "Víbora" },
  { key: "bajada_pared",   label: "Bajada" },
  { key: "saque",          label: "Saque" },
  { key: "recepcion_saque",label: "Recepción" },
];

function SkillsRadar({ skills }: { skills: Record<string, number> }) {
  const N      = SKILL_DEFS.length;
  const SIZE   = 160;
  const CENTER = SIZE / 2;
  const R      = 56;

  const angleOf = (i: number) => (2 * Math.PI * i) / N - Math.PI / 2;

  const dataPoints = SKILL_DEFS.map((s, i) => {
    const angle = angleOf(i);
    const v     = Math.max(0, Math.min(10, skills[s.key] ?? 0)) / 10;
    return { x: CENTER + v * R * Math.cos(angle), y: CENTER + v * R * Math.sin(angle) };
  });

  const gridLevels = [0.25, 0.5, 0.75, 1.0];

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="overflow-visible shrink-0">
      {/* Grid rings */}
      {gridLevels.map((scale) => {
        const pts = SKILL_DEFS.map((_, i) => {
          const a = angleOf(i);
          return `${CENTER + scale * R * Math.cos(a)},${CENTER + scale * R * Math.sin(a)}`;
        }).join(" ");
        return <polygon key={scale} points={pts} fill="none" stroke="#e5e7eb" strokeWidth="0.75" />;
      })}
      {/* Axes */}
      {SKILL_DEFS.map((_, i) => {
        const a = angleOf(i);
        return (
          <line key={i} x1={CENTER} y1={CENTER}
            x2={CENTER + R * Math.cos(a)} y2={CENTER + R * Math.sin(a)}
            stroke="#e5e7eb" strokeWidth="0.75" />
        );
      })}
      {/* Data polygon */}
      <polygon
        points={dataPoints.map(p => `${p.x},${p.y}`).join(" ")}
        fill="rgba(59,130,246,0.15)" stroke="#3b82f6" strokeWidth="1.5"
      />
      {/* Labels */}
      {SKILL_DEFS.map((s, i) => {
        const a   = angleOf(i);
        const lx  = CENTER + (R + 14) * Math.cos(a);
        const ly  = CENTER + (R + 14) * Math.sin(a);
        return (
          <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
            fontSize="7.5" fill="#6b7280">
            {s.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── Expand Panel ──────────────────────────────────────────────

function ExpandPanel({
  playerId,
  displayName,
  details,
  isLoading,
  inviteStatus,
  onInvite,
  isInviting,
}: {
  playerId: string;
  displayName: string;
  details: PlayerCoachDetails | null;
  isLoading: boolean;
  inviteStatus: InviteStatus;
  onInvite: () => void;
  isInviting: boolean;
}) {
  if (isLoading) {
    return (
      <td colSpan={10} className="bg-gray-50 px-6 py-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          Cargando datos del jugador...
        </div>
      </td>
    );
  }

  return (
    <td colSpan={10} className="bg-gray-50/80 px-6 py-4 border-t border-gray-100">
      <div className="flex flex-wrap gap-6">
        {/* Skills radar */}
        {details?.skills && (
          <div className="flex flex-col items-center gap-1">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400">Habilidades</p>
            <SkillsRadar skills={details.skills} />
          </div>
        )}

        {/* Last matches */}
        {details && details.lastMatches.length > 0 && (
          <div className="flex-1 min-w-[180px]">
            <p className="text-[10px] font-black uppercase tracking-wide text-gray-400 mb-2">Últimos partidos</p>
            <div className="space-y-1.5">
              {details.lastMatches.map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-black shrink-0 ${
                    m.outcome === "win"  ? "bg-emerald-100 text-emerald-700" :
                    m.outcome === "loss" ? "bg-red-100 text-red-600" :
                    "bg-gray-100 text-gray-400"
                  }`}>
                    {m.outcome === "win" ? "G" : m.outcome === "loss" ? "P" : "-"}
                  </span>
                  <span className="font-mono font-semibold text-gray-700">{m.score}</span>
                  <span className="text-gray-400">
                    {new Date(m.match_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No data state */}
        {details && details.lastMatches.length === 0 && !details.skills && (
          <p className="text-xs text-gray-400 self-center">Sin historial disponible</p>
        )}

        {/* Actions */}
        <div className="flex flex-col justify-center gap-2 ml-auto">
          <Link
            href={`/p/${playerId}`}
            target="_blank"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:border-gray-300 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
            Ver perfil completo
          </Link>
          {(inviteStatus === "none" || inviteStatus === "inactive") && (
            <button
              onClick={onInvite}
              disabled={isInviting}
              className="inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wide transition-colors"
            >
              <UserPlus className="h-3 w-3" />
              {inviteStatus === "inactive" ? "Reinvitar" : "Invitar"}
            </button>
          )}
        </div>
      </div>
    </td>
  );
}

// ── Main Component ────────────────────────────────────────────

export function CoachPlayerSearch({
  players,
  coachPlayerStatuses,
  coachProfile,
  myPlayerId,
  initialQuery,
}: Props) {
  // Build invite status map from server data
  const initialInviteMap = useMemo(() => {
    const map: Record<string, InviteStatus> = {};
    for (const s of coachPlayerStatuses) {
      map[s.player_id] =
        s.status === "active"  ? "active"  :
        s.status === "pending" ? "pending" :
        s.status === "inactive"? "inactive": "none";
    }
    return map;
  }, [coachPlayerStatuses]);

  const [inviteMap, setInviteMap]     = useState<Record<string, InviteStatus>>(initialInviteMap);
  const [filterCategory, setCategory] = useState("all");
  const [filterCity, setCity]         = useState("all");
  const [filterActivity, setActivity] = useState("all");
  const [sortBy, setSort]             = useState("pasala_desc");
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<Record<string, PlayerCoachDetails | null>>({});
  const [loadingId, setLoadingId]     = useState<string | null>(null);
  const [isInviting, startInvite]     = useTransition();

  // City options from players data
  const cityOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of players) {
      if (p.city && !map.has(p.city_id || p.city)) {
        map.set(p.city_id || p.city, p.city);
      }
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [players]);

  // Client-side filtering (excludes self)
  const filtered = useMemo(() => {
    let list = players.filter((p) => p.id !== myPlayerId);

    if (filterCategory !== "all") list = list.filter((p) => String(p.category ?? "") === filterCategory);
    if (filterCity !== "all")     list = list.filter((p) => (p.city_id || p.city || "") === filterCity);
    if (filterActivity !== "all") list = list.filter((p) => p.activity_level === filterActivity);

    list.sort((a, b) => {
      if (a.is_same_city !== b.is_same_city) return a.is_same_city ? -1 : 1;
      if (sortBy === "win_rate_desc") return b.win_rate - a.win_rate;
      if (sortBy === "played_desc")   return b.played - a.played;
      if (sortBy === "name_asc")      return a.display_name.localeCompare(b.display_name, "es");
      return pasalaProgress(b.pasala_index) - pasalaProgress(a.pasala_index);
    });

    return list;
  }, [players, myPlayerId, filterCategory, filterCity, filterActivity, sortBy]);

  function handleExpand(playerId: string) {
    if (expandedId === playerId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(playerId);
    if (expandedData[playerId] !== undefined) return; // already loaded

    setLoadingId(playerId);
    getPlayerCoachDetailsAction(playerId)
      .then((data) => {
        setExpandedData((prev) => ({ ...prev, [playerId]: data }));
      })
      .catch(() => {
        setExpandedData((prev) => ({ ...prev, [playerId]: null }));
      })
      .finally(() => {
        setLoadingId(null);
      });
  }

  function handleInvite(playerId: string) {
    if (!coachProfile) return;
    // Optimistic update
    setInviteMap((prev) => ({ ...prev, [playerId]: "invited_now" }));
    startInvite(async () => {
      const result = await invitePlayerAction(playerId);
      if ("error" in result) {
        // Revert on error
        setInviteMap((prev) => ({ ...prev, [playerId]: initialInviteMap[playerId] ?? "none" }));
      }
    });
  }

  function inviteStatusForRow(playerId: string): InviteStatus {
    return inviteMap[playerId] ?? "none";
  }

  function renderActionCell(playerId: string) {
    const status = inviteStatusForRow(playerId);
    if (status === "active") {
      return <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">Ya es tu alumno</Badge>;
    }
    if (status === "pending" || status === "invited_now") {
      return <Badge className="border border-gray-200 bg-gray-50 text-gray-500 text-[10px]">Invitación enviada</Badge>;
    }
    return (
      <button
        onClick={(e) => { e.stopPropagation(); handleInvite(playerId); }}
        disabled={!coachProfile || isInviting}
        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-[10px] font-bold uppercase tracking-wide transition-colors"
      >
        <UserPlus className="h-3 w-3" />
        {status === "inactive" ? "Reinvitar" : "Invitar"}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Encontrá tu próximo alumno</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Buscá jugadores por nombre, nivel o ciudad y enviáles una invitación para entrenar juntos.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {/* Name search — form submit to change URL q param */}
        <form className="flex items-center gap-2" method="get">
          {/* Preserve tab param */}
          <input type="hidden" name="tab" value="jugadores" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              name="q"
              defaultValue={initialQuery}
              placeholder="Buscar por nombre..."
              className="h-9 pl-8 pr-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
            />
          </div>
          <button type="submit" className="h-9 px-3 rounded-xl bg-blue-600 text-white text-xs font-bold uppercase tracking-wide hover:bg-blue-700 transition-colors">
            Buscar
          </button>
        </form>

        {/* Client-side filters */}
        <select value={filterCategory} onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
          <option value="all">Categoría</option>
          {[1,2,3,4,5,6,7].map((c) => <option key={c} value={String(c)}>{c}ra</option>)}
        </select>

        <select value={filterCity} onChange={(e) => setCity(e.target.value)}
          className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
          <option value="all">Ciudad</option>
          {cityOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>

        <select value={filterActivity} onChange={(e) => setActivity(e.target.value)}
          className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
          <option value="all">Actividad</option>
          <option value="muy_activo">Muy activo</option>
          <option value="activo">Activo</option>
          <option value="ocasional">Ocasional</option>
          <option value="inactivo">Inactivo</option>
          <option value="nuevo">Nuevo</option>
        </select>

        <select value={sortBy} onChange={(e) => setSort(e.target.value)}
          className="h-9 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700">
          <option value="pasala_desc">Índice PASALA</option>
          <option value="win_rate_desc">Win rate</option>
          <option value="played_desc">Partidos jugados</option>
          <option value="name_asc">Nombre A-Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr className="text-left">
                <th className="w-[20%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Jugador</th>
                <th className="w-[12%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500 hidden sm:table-cell">Ubicación</th>
                <th className="w-[8%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Categ.</th>
                <th className="w-[15%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">PASALA</th>
                <th className="w-[10%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Nivel</th>
                <th className="w-[7%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500 hidden md:table-cell">WR</th>
                <th className="w-[6%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500 hidden md:table-cell">PJ</th>
                <th className="w-[6%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500 hidden md:table-cell">Racha</th>
                <th className="w-[9%] px-3 py-2 text-[11px] font-black uppercase tracking-wide text-gray-500">Actividad</th>
                <th className="w-[7%] px-3 py-2 text-right text-[11px] font-black uppercase tracking-wide text-gray-500">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((p) => {
                  const activity     = activityMeta(p.activity_level);
                  const pasala       = pasalaProgress(p.pasala_index);
                  const isExpanded   = expandedId === p.id;
                  const isLoadingRow = loadingId === p.id;

                  return (
                    <React.Fragment key={p.id}>
                      <tr
                        onClick={() => handleExpand(p.id)}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70 cursor-pointer select-none"
                      >
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <UserAvatar src={p.avatar_url} initials={p.display_name?.slice(0, 2)} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">{p.display_name}</p>
                              {p.is_same_city && (
                                <span className="text-[9px] font-medium text-indigo-500">tu ciudad</span>
                              )}
                            </div>
                            {isExpanded
                              ? <ChevronUp className="h-3 w-3 text-gray-400 shrink-0 ml-1" />
                              : <ChevronDown className="h-3 w-3 text-gray-400 shrink-0 ml-1" />
                            }
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-600 hidden sm:table-cell">
                          <span className="line-clamp-1">{formatCityWithProvinceAbbr(p.city, p.region_code, p.region_name)}</span>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className="border border-gray-200 bg-gray-100 text-gray-700">Cat. {categoryLabel(p.category)}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <div className="w-full max-w-[130px]">
                            <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-gray-700">
                              <span>{p.pasala_index == null ? "-" : p.pasala_index.toFixed(1)}</span>
                              <span className="text-gray-400">/100</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                              <div className="h-full rounded-full bg-blue-600" style={{ width: `${pasala}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Badge className={levelClass(p.level)}>{levelLabel(p.level)}</Badge>
                        </td>
                        <td className="px-3 py-2 text-sm font-semibold text-gray-800 hidden md:table-cell">{p.win_rate.toFixed(1)}%</td>
                        <td className="px-3 py-2 text-sm font-semibold text-gray-800 hidden md:table-cell">{p.played}</td>
                        <td className="px-3 py-2 text-sm font-semibold text-gray-800 hidden md:table-cell">{p.current_streak || "-"}</td>
                        <td className="px-3 py-2">
                          <Badge className={activity.className}>{activity.label}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                          {renderActionCell(p.id)}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b border-gray-100">
                          <ExpandPanel
                            playerId={p.id}
                            displayName={p.display_name}
                            details={expandedData[p.id] ?? null}
                            isLoading={isLoadingRow}
                            inviteStatus={inviteStatusForRow(p.id)}
                            onInvite={() => handleInvite(p.id)}
                            isInviting={isInviting}
                          />
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <div className="space-y-2">
                      <p className="font-bold text-gray-900">No se encontraron jugadores</p>
                      <p className="text-sm text-gray-500">Probá con otro filtro o término de búsqueda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-gray-400 text-right">{filtered.length} jugador{filtered.length !== 1 ? "es" : ""}</p>
      )}
    </div>
  );
}
