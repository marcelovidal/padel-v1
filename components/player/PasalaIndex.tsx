"use client";

import { Card } from "@/components/ui/card";

interface PasalaIndexProps {
    value: number | null;
    winScore: number;
    perfScore: number;
}

export function PasalaIndex({ value, winScore, perfScore }: PasalaIndexProps) {
    const isNeutral = value === null;
    const score = value ?? 50;

    return (
        <Card className="p-6 bg-gradient-to-br from-blue-900 to-blue-950 text-white rounded-3xl border-none shadow-2xl shadow-blue-900/40 relative overflow-hidden">
            {/* Decorative background element */}
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>

            <div className="relative z-10 space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-blue-300/80">Índice PASALA</h3>
                        <p className="text-xs text-blue-400/60 font-medium mt-1">Algoritmo de performance v1.0</p>
                    </div>
                    <div className="bg-blue-800/40 px-3 py-1 rounded-full border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-200">Pro Player</span>
                    </div>
                </div>

                <div className="flex items-baseline gap-2">
                    <span className="text-7xl font-black tracking-tighter tabular-nums">
                        {isNeutral ? "—" : value.toFixed(0)}
                    </span>
                    <span className="text-2xl font-bold text-blue-400">/100</span>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/10">
                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-300/70">
                            <span>Efectividad (65%)</span>
                            <span>{winScore.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-blue-800/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-400 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${winScore}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-300/70">
                            <span>Performance (35%)</span>
                            <span>{perfScore.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 bg-blue-800/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-cyan-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                style={{ width: `${perfScore}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {isNeutral && (
                    <div className="pt-2">
                        <p className="text-[10px] text-blue-300/60 italic leading-relaxed">
                            Juega tu primer partido para activar tu índice de performance.
                        </p>
                    </div>
                )}
            </div>
        </Card>
    );
}
