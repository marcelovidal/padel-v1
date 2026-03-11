"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

type WeeklyPoint  = { week: string;  count: number };
type MonthlyPoint = { month: string; count: number };

// ── Weekly line chart (partidos / evaluaciones / reservas) ─────────────────

type WeeklyChartProps = {
  datasets: Array<{ label: string; data: WeeklyPoint[]; color: string }>;
};

export function WeeklyMultiLineChart({ datasets }: WeeklyChartProps) {
  // Merge all datasets on the same week labels
  const weeks: string[] = datasets[0]?.data.map((p) => p.week) ?? [];
  const chartData = weeks.map((week) => {
    const row: Record<string, string | number> = { week };
    for (const ds of datasets) {
      const found = ds.data.find((p) => p.week === week);
      row[ds.label] = found?.count ?? 0;
    }
    return row;
  });

  if (chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        Sin datos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="week" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={32} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} labelStyle={{ fontWeight: 700 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {datasets.map((ds) => (
          <Line
            key={ds.label}
            type="monotone"
            dataKey={ds.label}
            stroke={ds.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Monthly bar chart (torneos / ligas) ────────────────────────────────────

type MonthlyChartProps = {
  datasets: Array<{ label: string; data: MonthlyPoint[]; color: string }>;
};

export function MonthlyBarChart({ datasets }: MonthlyChartProps) {
  const months: string[] = datasets[0]?.data.map((p) => p.month) ?? [];
  const chartData = months.map((month) => {
    const row: Record<string, string | number> = { month };
    for (const ds of datasets) {
      const found = ds.data.find((p) => p.month === month);
      row[ds.label] = found?.count ?? 0;
    }
    return row;
  });

  if (chartData.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        Sin datos
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} width={28} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {datasets.map((ds) => (
          <Bar key={ds.label} dataKey={ds.label} fill={ds.color} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
