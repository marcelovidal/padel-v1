"use client";

import React, { useState } from "react";
import { getPlayerMatchAssessmentAction } from "@/app/actions/assessment.actions";
import { ChevronDown, ChevronUp, Star, Loader2, PlusCircle } from "lucide-react";
import Link from "next/link";

interface AssessmentInlineProps {
    matchId: string;
    playerId: string;
    hasAssessment: boolean;
    isCompleted: boolean;
}

export function AssessmentInline({
    matchId,
    playerId,
    hasAssessment,
    isCompleted
}: AssessmentInlineProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [assessment, setAssessment] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const toggleOpen = async () => {
        if (!isOpen && !assessment && hasAssessment) {
            setLoading(true);
            setError(null);
            const result = await getPlayerMatchAssessmentAction(matchId);
            if (result.success) {
                setAssessment(result.data);
            } else {
                setError(result.error || "Error al cargar los datos");
            }
            setLoading(false);
        }
        setIsOpen(!isOpen);
    };

    if (!isCompleted) {
        return (
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center text-gray-500 text-sm italic">
                <span>Disponible al finalizar el partido</span>
            </div>
        );
    }

    if (!hasAssessment) {
        return (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4">
                    <Star className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">Autoevaluación pendiente</h4>
                <p className="text-gray-500 text-sm mb-6 max-w-xs">
                    Completá tu autoevaluación para llevar un registro de tu progreso.
                </p>
                <Link
                    href={`/player/matches/${matchId}/assessment`}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-amber-200 transition-all active:scale-[0.98]"
                >
                    <PlusCircle className="w-4 h-4" />
                    Completar ahora
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <button
                onClick={toggleOpen}
                className="w-full flex items-center justify-between p-4 text-sm font-bold text-blue-600 hover:bg-gray-50 transition-colors"
            >
                <span className="flex items-center">
                    <Star className="w-4 h-4 mr-2 fill-amber-400 text-amber-400" />
                    {isOpen ? "Ocultar autoevaluación" : "Ver autoevaluación"}
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isOpen && (
                <div className="p-4 border-t border-gray-100 bg-gray-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-6">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                            <p className="text-xs text-gray-500 font-medium">Cargando detalles...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 text-red-500 text-xs p-3 rounded-lg text-center border border-red-100">
                            {error}
                        </div>
                    ) : assessment ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <ScoreItem label="Volea" value={assessment.volea} />
                                <ScoreItem label="Globo" value={assessment.globo} />
                                <ScoreItem label="Remate" value={assessment.remate} />
                                <ScoreItem label="Bandeja" value={assessment.bandeja} />
                                <ScoreItem label="Víbora" value={assessment.vibora} />
                                <ScoreItem label="Bajada Pared" value={assessment.bajada_pared} />
                                <ScoreItem label="Saque" value={assessment.saque} />
                                <ScoreItem label="Recepción" value={assessment.recepcion_saque} />
                            </div>

                            {assessment.comments && (
                                <div className="bg-white rounded-xl border border-gray-100 p-4">
                                    <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-2">
                                        Comentarios
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap italic leading-relaxed">
                                        &quot;{assessment.comments}&quot;
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Link
                                    href={`/player/matches/${matchId}/assessment`}
                                    className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-blue-600 transition-colors"
                                >
                                    Editar valoración
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-500 text-xs text-center py-4 bg-white rounded-xl border border-dashed border-gray-200">
                            No se encontraron datos de la autoevaluación.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ScoreItem({ label, value }: { label: string; value: number | null }) {
    if (value === null) return null;

    return (
        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
            <div className="text-[10px] text-gray-400 uppercase font-bold mb-1 truncate w-full text-center">
                {label}
            </div>
            <div className="flex items-center gap-1">
                <span className="text-lg font-black text-gray-900 leading-none">{value}</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
            </div>
        </div>
    );
}
