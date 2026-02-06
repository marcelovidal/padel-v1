import React from "react";
import { Database } from "@/types/database";

type Assessment = Database["public"]["Tables"]["player_match_assessments"]["Row"];

interface PlayerAssessmentViewProps {
    assessment: Assessment;
}

export function PlayerAssessmentView({ assessment }: PlayerAssessmentViewProps) {
    const strokes = [
        { key: "volea", label: "Volea" },
        { key: "globo", label: "Globo" },
        { key: "remate", label: "Remate" },
        { key: "bandeja", label: "Bandeja" },
        { key: "vibora", label: "Víbora" },
        { key: "bajada_pared", label: "Bajada de Pared" },
        { key: "saque", label: "Saque" },
        { key: "recepcion_saque", label: "Recepción de Saque" },
    ] as const;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Mi Autoevaluación</h3>
            </div>
            <div className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {strokes.map((stroke) => (
                        <div key={stroke.key} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col items-center">
                            <span className="text-[10px] text-gray-400 uppercase font-bold mb-1">{stroke.label}</span>
                            <span className="text-xl font-black text-blue-600">
                                {assessment[stroke.key as keyof Assessment] ?? "-"}
                            </span>
                        </div>
                    ))}
                </div>

                {assessment.comments && (
                    <div className="mt-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100/50">
                        <span className="text-[10px] text-blue-600 uppercase font-bold block mb-1">Comentarios</span>
                        <p className="text-sm text-gray-700 italic">&quot;{assessment.comments}&quot;</p>
                    </div>
                )}
            </div>
        </div>
    );
}
