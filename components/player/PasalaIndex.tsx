"use client";

import { Card } from "@/components/ui/card";

interface PasalaIndexProps {
    value: number | null;
    // v2 factors (nuevos)
    winRateScore?: number;
    rivalLevelScore?: number;
    perfScore?: number;
    recentScore?: number;
    volumeScore?: number;
    // backward compat (v1)
    winScore?: number;
}

const FACTORS = [
    { key: "winRateScore",    label: "Efectividad",  pct: "35%", color: "bg-blue-400" },
    { key: "rivalLevelScore", label: "Nivel rivales", pct: "25%", color: "bg-violet-400" },
    { key: "perfScore",       label: "Técnica",       pct: "20%", color: "bg-cyan-400" },
    { key: "recentScore",     label: "Forma reciente",pct: "12%", color: "bg-emerald-400" },
    { key: "volumeScore",     label: "Experiencia",   pct: "8%",  color: "bg-amber-400" },
] as const;

export function PasalaIndex({
    value,
    winRateScore,
    rivalLevelScore,
    perfScore,
    recentScore,
    volumeScore,
    winScore,
}: PasalaIndexProps) {
    const isNeutral = value === null;

    // Soporte v1 (fallback si no vienen los nuevos factores)
    const isV2 = winRateScore !== undefined;
    const scores: Record<string, number> = isV2
        ? {
            winRateScore:    winRateScore ?? 0,
            rivalLevelScore: rivalLevelScore ?? 50,
            perfScore:       perfScore ?? 50,
            recentScore:     recentScore ?? 0,
            volumeScore:     volumeScore ?? 0,
          }
        : {
            winRateScore:    winScore ?? 0,
            rivalLevelScore: 50,
            perfScore:       perfScore ?? 50,
            recentScore:     0,
            volumeScore:     0,
          };

    return (
        <Card className="p-6 bg-gradient-to-br from-blue-900 to-blue-950 text-white rounded-3xl border-none shadow-2xl shadow-blue-900/40 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-3xl" />

            <div className="relative z-10 space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-300/80">Índice PASALA</h3>
                        <p className="text-xs text-blue-400/60 font-medium mt-1">Algoritmo de performance v2.0</p>
                    </div>
                    <div className="bg-blue-800/40 px-3 py-1 rounded-full border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Pro Player</span>
                    </div>
                </div>

                {/* Score */}
                <div className="flex items-baseline gap-2">
                    <span className="text-7xl font-black tracking-tighter tabular-nums">
                        {isNeutral ? "—" : value!.toFixed(0)}
                    </span>
                    <span className="text-2xl font-bold text-blue-400">/100</span>
                </div>

                {/* Factores */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                    {FACTORS.map(({ key, label, pct, color }) => {
                        const val = scores[key] ?? 0;
                        return (
                            <div key={key} className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-300/70">
                                    <span>{label} <span className="text-blue-400/50 normal-case font-medium">({pct})</span></span>
                                    <span>{val.toFixed(0)}</span>
                                </div>
                                <div className="h-1.5 bg-blue-800/50 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
                                        style={{ width: `${Math.min(val, 100)}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isNeutral && (
                    <p className="text-[10px] text-blue-300/60 italic leading-relaxed pt-1">
                        Juega tu primer partido para activar tu índice de performance.
                    </p>
                )}
            </div>
        </Card>
    );
}
