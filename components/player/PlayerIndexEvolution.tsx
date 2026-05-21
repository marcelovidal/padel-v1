"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface Props {
  history: Array<{ date: string; value: number }>;
}

function formatDate(dateStr: string) {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: { date: string; value: number };
  peakDate: string;
}

function CustomDot({ cx, cy, payload, peakDate }: CustomDotProps) {
  if (!cx || !cy || !payload) return null;
  if (payload.date === peakDate) {
    return <circle cx={cx} cy={cy} r={5} fill="#E5352A" stroke="white" strokeWidth={2} />;
  }
  return <circle cx={cx} cy={cy} r={2.5} fill="#1B3CC8" strokeWidth={0} />;
}

export function PlayerIndexEvolution({ history }: Props) {
  if (history.length < 2) {
    return (
      <div className="flex h-full min-h-[180px] items-center justify-center rounded-[28px] border border-gray-100 bg-white p-6">
        <p className="text-center text-sm text-brand-gris-mid">
          La evolución estará disponible<br />después de tus primeros partidos.
        </p>
      </div>
    );
  }

  const chartData = history.map((h) => ({
    date: formatDate(h.date),
    rawDate: h.date,
    value: Number(h.value),
  }));

  const firstVal = chartData[0].value;
  const lastVal  = chartData[chartData.length - 1].value;
  const delta    = lastVal - firstVal;
  const peak     = chartData.reduce((m, d) => (d.value > m.value ? d : m), chartData[0]);
  const trend    = delta >= 0 ? "Tendencia ascendente" : "Tendencia descendente";

  const minVal = Math.max(0,   Math.floor(Math.min(...chartData.map((d) => d.value)) - 5));
  const maxVal = Math.min(100, Math.ceil(Math.max(...chartData.map((d) => d.value))  + 5));

  return (
    <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-brand-gris-mid">
          Evolución del Índice
        </h2>
        <span className="text-[10px] font-black uppercase tracking-widest text-brand-azul">
          Últimos 60 días ↓
        </span>
      </div>

      {/* Current value + delta */}
      <div className="mb-4 flex items-end gap-3">
        <span className="text-4xl font-black tabular-nums leading-none text-brand-negro">{lastVal}</span>
        <div className="mb-0.5 space-y-0.5">
          <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black ${delta >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-brand-rojo"}`}>
            {delta >= 0 ? "+" : ""}{delta} pts
          </span>
          <p className="text-[10px] text-brand-gris-mid">
            vs. {chartData[0].date} (índice {firstVal}) · {trend}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={170}>
        <AreaChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="indexGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#1B3CC8" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#1B3CC8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={({ x, y, payload }: any) => (
              <text
                x={x} y={y + 12}
                textAnchor="middle"
                fill={payload.value === peak.date ? "#E5352A" : "#6B6965"}
                fontSize={10}
                fontWeight={payload.value === peak.date ? 900 : 400}
              >
                {payload.value}
              </text>
            )}
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
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 700 }}
            formatter={(val: any) => [`${val}`, "Índice PASALA"] as any}
          />
          <ReferenceLine
            x={peak.date}
            stroke="#E5352A"
            strokeDasharray="3 3"
            strokeWidth={1}
            label={{ value: `PICO ${peak.value}`, position: "top", fontSize: 9, fontWeight: 900, fill: "#E5352A" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#1B3CC8"
            strokeWidth={2.5}
            fill="url(#indexGradient)"
            dot={(props: any) => <CustomDot {...props} peakDate={peak.date} />}
            activeDot={{ r: 5, fill: "#1B3CC8" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

