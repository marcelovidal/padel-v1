"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { ActivationSeriesPoint } from "@/repositories/admin.analytics.repository";

type Props = {
  data: ActivationSeriesPoint[];
};

type ViewMode = "cumulative" | "daily";

const COLORS = {
  registered: "#2563eb", // blue
  guests:     "#d97706", // amber
  onboarding: "#16a34a", // green
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function PlayerActivationChart({ data }: Props) {
  const [mode, setMode] = useState<ViewMode>("cumulative");

  const chartData = data.map((p) => ({
    date: formatDate(p.date),
    Registrados: mode === "cumulative" ? p.reg_cum   : p.reg_daily,
    Invitados:   mode === "cumulative" ? p.guest_cum : p.guest_daily,
    Onboarding:  mode === "cumulative" ? p.onb_cum   : p.onb_daily,
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("cumulative")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            mode === "cumulative"
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
          }`}
        >
          Acumulado
        </button>
        <button
          onClick={() => setMode("daily")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            mode === "daily"
              ? "bg-blue-600 border-blue-600 text-white"
              : "bg-white border-gray-200 text-gray-600 hover:border-gray-400"
          }`}
        >
          Diario
        </button>
      </div>

      {data.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-gray-400">
          Sin datos para el período seleccionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              interval={Math.max(1, Math.floor(chartData.length / 10) - 1)}
            />
            <YAxis tick={{ fontSize: 11 }} width={36} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              labelStyle={{ fontWeight: 700 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="Registrados"
              stroke={COLORS.registered}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Invitados"
              stroke={COLORS.guests}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Onboarding"
              stroke={COLORS.onboarding}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
