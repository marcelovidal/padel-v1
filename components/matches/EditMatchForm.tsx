"use client";

import { useState } from "react";
import { updateMatchAsPlayer } from "@/lib/actions/player-match.actions";
import Link from "next/link";

interface EditMatchFormProps {
    match: {
        id: string;
        match_at: string;
        club_name: string;
        notes: string | null;
    };
}

export function EditMatchForm({ match }: EditMatchFormProps) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helper to split ISO date/time for form
    const matchDate = new Date(match.match_at).toISOString().split("T")[0];
    const matchTime = new Date(match.match_at).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
    });

    const handleSubmit = async (formData: FormData) => {
        setIsPending(true);
        setError(null);
        try {
            const result = await updateMatchAsPlayer(match.id, formData);
            if (result?.error) {
                setError(result.error);
                setIsPending(false);
            }
            // redirect is handled by server action
        } catch (err) {
            setError("Error inesperado al actualizar el partido");
            setIsPending(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            {error && (
                <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
                    {error}
                </div>
            )}

            <form action={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Fecha</label>
                        <input
                            type="date"
                            name="date"
                            defaultValue={matchDate}
                            required
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Hora</label>
                        <input
                            type="time"
                            name="time"
                            defaultValue={matchTime}
                            required
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Club / Lugar</label>
                    <input
                        type="text"
                        name="club_name"
                        defaultValue={match.club_name}
                        required
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Notas (opcional)</label>
                    <textarea
                        name="notes"
                        defaultValue={match.notes || ""}
                        rows={3}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                    />
                </div>

                <div className="flex gap-4 pt-4">
                    <button
                        type="submit"
                        disabled={isPending}
                        className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                        {isPending ? "Guardando..." : "Guardar Cambios"}
                    </button>
                    <Link
                        href={`/player/matches/${match.id}`}
                        className="flex-1 bg-white text-gray-600 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-center transition-all"
                    >
                        Cancelar
                    </Link>
                </div>
            </form>
        </div>
    );
}
