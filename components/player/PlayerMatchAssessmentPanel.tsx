"use client";

import React, { useState } from "react";
import { getPlayerMatchAssessmentAction } from "@/app/actions/assessment.actions";
import { ChevronDown, ChevronUp, Star, MessageSquare, Loader2 } from "lucide-react";

interface PlayerMatchAssessmentPanelProps {
    matchId: string;
    hasAssessment: boolean;
}

export default function PlayerMatchAssessmentPanel({
    matchId,
    hasAssessment
}: PlayerMatchAssessmentPanelProps) {
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

    if (!hasAssessment) {
        return (
            <div className="pt-4 border-t border-gray-100 px-1 mt-4">
                <div className="flex items-center text-amber-600 bg-amber-50 px-3 py-2 rounded-lg text-sm">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span>Autoevaluación pendiente</span>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-4 border-t border-gray-100 pt-3">
            <button
                onClick={toggleOpen}
                className="w-full flex items-center justify-between py-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
                <span className="flex items-center">
                    <Star className="w-4 h-4 mr-2" />
                    {isOpen ? "Ocultar autoevaluación" : "Ver autoevaluación"}
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {isOpen && (
                <div className="mt-3 bg-gray-50 rounded-lg p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-6">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
                            <p className="text-xs text-gray-500">Cargando detalles...</p>
                        </div>
                    ) : error ? (
                        <div className="text-red-500 text-xs py-2 text-center">{error}</div>
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
                                <div className="bg-white rounded border border-gray-100 p-3">
                                    <div className="text-[10px] text-gray-400 uppercase font-bold mb-1">
                                        Comentarios
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap italic">
                                        &quot;{assessment.comments}&quot;
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-gray-500 text-xs text-center py-2">
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
        <div className="bg-white p-2 rounded border border-gray-100">
            <div className="text-[9px] text-gray-400 uppercase font-semibold mb-1 truncate">
                {label}
            </div>
            <div className="flex items-center">
                <span className="text-sm font-bold text-gray-800 mr-1">{value}</span>
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            </div>
        </div>
    );
}
