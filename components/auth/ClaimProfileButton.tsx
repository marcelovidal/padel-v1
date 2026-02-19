"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { claimProfileAction } from "@/lib/actions/claim.actions";

interface ClaimProfileButtonProps {
    targetPlayerId: string;
    matchId?: string;
    nextPath?: string;
}

export function ClaimProfileButton({ targetPlayerId, matchId, nextPath }: ClaimProfileButtonProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    function handleClaim() {
        setError(null);

        startTransition(async () => {
            const result = await claimProfileAction({
                targetPlayerId,
                matchId: matchId || null,
                next: nextPath || "/player",
            });

            if (!result.success) {
                setError(result.error);
                return;
            }

            router.replace(result.redirectTo);
            router.refresh();
        });
    }

    return (
        <div className="space-y-3">
            <button
                onClick={handleClaim}
                disabled={isPending}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all active:scale-[0.98]"
            >
                {isPending ? "Validando reclamo..." : "Reclamar mi perfil"}
            </button>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 text-sm font-medium rounded-xl p-3">
                    {error}
                </div>
            )}
        </div>
    );
}
