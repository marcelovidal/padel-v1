"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AssessmentForm } from "./AssessmentForm";

interface AssessmentToggleFormProps {
    matchId: string;
    playerId: string;
}

export function AssessmentToggleForm({ matchId, playerId }: AssessmentToggleFormProps) {
    const [showForm, setShowForm] = useState(false);

    return (
        <div className="bg-white rounded-2xl border border-blue-100 overflow-hidden shadow-sm">
            {!showForm ? (
                <div className="p-8 text-center flex flex-col items-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Autoevaluación Pendiente</h3>
                    <p className="text-gray-500 text-sm mb-6 max-w-xs">Tómate un minuto para calificar tu desempeño en este partido.</p>
                    <Button
                        onClick={() => setShowForm(true)}
                        className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                    >
                        Completar ahora
                    </Button>
                </div>
            ) : (
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-bold text-gray-400 font-bold uppercase tracking-widest">Nueva Autoevaluación</h3>
                        <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-gray-500 text-xs">
                            Cancelar
                        </Button>
                    </div>
                    <AssessmentForm matchId={matchId} playerId={playerId} />
                </div>
            )}
        </div>
    );
}
