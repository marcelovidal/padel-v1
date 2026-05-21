"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  history: Array<{ date: string; value: number }>;
}

function formatDate(dateStr: string) {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

export function PlayerIndexEvolution({ history }: Props) {
  if (history.length < 2) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center rounded-[28px] border border-gray-100 bg-white p-6">
        <p className="text-center text-sm text-gray-400">
          La evolución estará disponible<br />después de tus primeros partidos.
        </p>
      </div>
    );
  }

  const chartData = history.map((h) => ({
    date: formatDate(h.date),
    value: Number(h.value),
  }));

  const minVal = Math.max(0, Math.floor(Math.min(...chartData.map((d) => d.value)) - 5));
  const maxVal = Math.min(100, Math.ceil(Math.max(...chartData.map((d) => d.value)) + 5));

  return (
    <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-brand-gris-mid">
        Evolución del Índice
      </h2>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#6B6965" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[minVal, maxVal]}
            tick={{ fontSize: 10, fill: "#6B6965" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e2e8f0",
              fontSize: 12,
              fontWeight: 700,
            }}
            formatter={(val: any) => [`${val}`, "Índice PASALA"] as any}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#1B3CC8"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#1B3CC8", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

