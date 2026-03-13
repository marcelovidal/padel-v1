"use client";

import { useState, useMemo } from "react";
import type { ClubMetricsRow } from "@/repositories/admin.analytics.repository";

type SortKey = keyof ClubMetricsRow;
type SortDir = "asc" | "desc";

const CLAIM_LABELS: Record<string, string> = {
  claimed:   "Reclamado",
  unclaimed: "Sin reclamar",
  pending:   "Pendiente",
  rejected:  "Rechazado",
};

const CLAIM_COLORS: Record<string, string> = {
  claimed:   "bg-green-100 text-green-700",
  unclaimed: "bg-gray-100 text-gray-600",
  pending:   "bg-amber-100 text-amber-700",
  rejected:  "bg-red-100 text-red-700",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function downloadCSV(rows: ClubMetricsRow[]) {
  const headers = [
    "Club","Ciudad","Provincia","Estado",
    "Jugadores activos (30d)","Partidos/semana prom.",
    "Torneos activos","Ligas activas","Último partido",
  ];
  const lines = rows.map((r) =>
    [
      `"${r.name}"`, `"${r.city}"`, `"${r.region}"`,
      CLAIM_LABELS[r.claim_status] ?? r.claim_status,
      r.active_players, r.avg_matches_week,
      r.active_tournaments, r.active_leagues,
      formatDate(r.last_match_at),
    ].join(",")
  );
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `clubes-metricas-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Props = { rows: ClubMetricsRow[] };

export function ClubMetricsTable({ rows }: Props) {
  const [sortKey, setSortKey]   = useState<SortKey>("active_players");
  const [sortDir, setSortDir]   = useState<SortDir>("desc");
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState("");
  const PAGE_SIZE = 20;

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
    setPage(1);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.region.toLowerCase().includes(q)
    );
  }, [rows, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function SortHeader({ label, field }: { label: string; field: SortKey }) {
    const active = sortKey === field;
    return (
      <th
        className="cursor-pointer select-none whitespace-nowrap px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-gray-500 hover:text-gray-800"
        onClick={() => handleSort(field)}
      >
        {label}
        <span className="ml-1 text-gray-300">
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="search"
          placeholder="Buscar club, ciudad o provincia..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <button
          onClick={() => downloadCSV(sorted)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Exportar CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
        <table className="min-w-full divide-y divide-gray-100 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <SortHeader label="Club"            field="name" />
              <SortHeader label="Ciudad"          field="city" />
              <SortHeader label="Provincia"       field="region" />
              <SortHeader label="Estado"          field="claim_status" />
              <SortHeader label="Jugadores (30d)" field="active_players" />
              <SortHeader label="Partidos/sem"    field="avg_matches_week" />
              <SortHeader label="Torneos"         field="active_tournaments" />
              <SortHeader label="Ligas"           field="active_leagues" />
              <SortHeader label="Último partido"  field="last_match_at" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 bg-white">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-sm text-gray-400">
                  Sin resultados
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-semibold text-gray-900">{row.name}</td>
                  <td className="px-3 py-2 text-gray-600">{row.city || "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{row.region || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${CLAIM_COLORS[row.claim_status] ?? "bg-gray-100 text-gray-600"}`}>
                      {CLAIM_LABELS[row.claim_status] ?? row.claim_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center font-bold text-gray-900">{row.active_players}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{row.avg_matches_week}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{row.active_tournaments}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{row.active_leagues}</td>
                  <td className="px-3 py-2 text-gray-500">{formatDate(row.last_match_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{sorted.length} clubes{search ? " (filtrado)" : ""}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="font-semibold">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded px-2 py-1 hover:bg-gray-100 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
