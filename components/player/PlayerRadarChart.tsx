"use client";

import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    ResponsiveContainer
} from "recharts";
import { Card } from "@/components/ui/card";

interface PlayerRadarChartProps {
    data: Record<string, number>;
}

export function PlayerRadarChart({ data }: PlayerRadarChartProps) {
    const hasData = Object.keys(data).length > 0;

    const chartData = [
        { skill: "Volea", value: data.volea || 0 },
        { skill: "Globo", value: data.globo || 0 },
        { skill: "Remate", value: data.remate || 0 },
        { skill: "Bandeja", value: data.bandeja || 0 },
        { skill: "Víbora", value: data.vibora || 0 },
        { skill: "Bajada", value: data.bajada_pared || 0 },
        { skill: "Saque", value: data.saque || 0 },
        { skill: "Recep", value: data.recepcion_saque || 0 },
    ];

    return (
        <Card className="p-6 bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 h-[400px]">
            <div className="mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Atributos Técnicos</h3>
                <p className="text-[10px] text-gray-500 mt-1">Promedio basado en {hasData ? "tus" : "0"} evaluaciones</p>
            </div>

            {!hasData ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-4 text-center">
                    <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                    </div>
                    <p className="text-xs text-gray-400 px-8">No hay evaluaciones suficientes para generar el gráfico radial.</p>
                </div>
            ) : (
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                            <PolarGrid stroke="#f3f4f6" />
                            <PolarAngleAxis
                                dataKey="skill"
                                tick={{ fill: "#9ca3af", fontSize: 10, fontWeight: 900 }}
                            />
                            <Radar
                                name="Performance"
                                dataKey="value"
                                stroke="#2563eb"
                                strokeWidth={3}
                                fill="#3b82f6"
                                fillOpacity={0.6}
                            />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </Card>
    );
}
