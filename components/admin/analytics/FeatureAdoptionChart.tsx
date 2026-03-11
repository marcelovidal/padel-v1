"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { FeatureAdoptionItem } from "@/repositories/admin.analytics.repository";

type Props = {
  features: FeatureAdoptionItem[];
  baseActivePlayers: number;
};

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#7c3aed", "#db2777", "#0891b2"];

export function FeatureAdoptionChart({ features, baseActivePlayers }: Props) {
  if (features.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-400">
        Sin datos de adopción
      </div>
    );
  }

  const chartData = [...features].sort((a, b) => b.pct - a.pct);

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Base: <span className="font-bold text-gray-700">{baseActivePlayers.toLocaleString("es-AR")}</span> jugadores activos en últimos 30d
      </p>
      <ResponsiveContainer width="100%" height={features.length * 44 + 40}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 60, left: 100, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="feature"
            tick={{ fontSize: 12, fontWeight: 600 }}
            width={95}
          />
          <Tooltip
            formatter={(value, _name, props: any) => [
              `${Number(value ?? 0)}% (${props.payload?.count ?? 0} jugadores)`,
              "Adopción",
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
