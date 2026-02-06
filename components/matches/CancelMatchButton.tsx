"use client";

import { useState } from "react";
import { cancelMatchAsPlayer } from "@/lib/actions/player-match.actions";

export function CancelMatchButton({ matchId }: { matchId: string }) {
    const [isConfirming, setIsConfirming] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const handleCancel = async () => {
        setIsPending(true);
        try {
            const result = await cancelMatchAsPlayer(matchId);
            if (result?.error) {
                alert(result.error);
                setIsConfirming(false);
            }
        } catch (err) {
            alert("Error al cancelar el partido");
            setIsConfirming(false);
        } finally {
            setIsPending(false);
        }
    };

    if (isConfirming) {
        return (
            <div className="flex gap-2">
                <button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                    {isPending ? "Cancelando..." : "Confirmar"}
                </button>
                <button
                    onClick={() => setIsConfirming(false)}
                    disabled={isPending}
                    className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                    No, volver
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsConfirming(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
        >
            Cancelar Partido
        </button>
    );
}
