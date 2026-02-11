"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { findSimilarPlayersAction, claimProfileAction } from "@/lib/actions/player.actions";
import { Player } from "@/types/database";

export function OnboardingClaim() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    async function handleSearch() {
        if (query.length < 2) return;
        setIsSearching(true);
        setMessage(null);

        const res = await findSimilarPlayersAction(query);
        if (res.error) {
            setMessage({ type: "error", text: res.error });
            setResults([]);
        } else {
            setResults(res.data || []);
            if (res.data?.length === 0) {
                setMessage({ type: "error", text: "No se encontraron perfiles similares." });
            }
        }
        setIsSearching(false);
    }

    async function handleClaim(playerId: string) {
        setIsClaiming(true);
        setMessage(null);

        const res = await claimProfileAction(playerId);
        if (res.error) {
            setMessage({ type: "error", text: res.error });
        } else {
            setMessage({ type: "success", text: "¡Perfil reclamado con éxito! Redirigiendo..." });
            setTimeout(() => window.location.href = "/player", 1500);
        }
        setIsClaiming(false);
    }

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-3xl shadow-xl border border-gray-100 space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-gray-900 leading-tight">¿Ya habías jugado antes?</h2>
                <p className="text-sm text-gray-500">Busca tu nombre para recuperar tu historial de partidos.</p>
            </div>

            <div className="flex gap-2">
                <Input
                    placeholder="Tu nombre o apodo..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="rounded-xl h-12"
                />
                <Button
                    onClick={handleSearch}
                    disabled={isSearching || query.length < 2}
                    className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                    {isSearching ? "..." : "Buscar"}
                </Button>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl text-xs font-bold border ${message.type === "success"
                    ? "bg-green-50 text-green-700 border-green-100"
                    : "bg-red-50 text-red-600 border-red-100"
                    } animate-in fade-in zoom-in duration-300`}>
                    {message.text}
                </div>
            )}

            {results.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">Sugerencias encontradas</p>
                    {results.map((player) => (
                        <div key={player.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all">
                            <div className="flex flex-col">
                                <span className="font-bold text-gray-900">{player.display_name}</span>
                                <span className="text-[10px] text-gray-500 uppercase font-bold">{player.position}</span>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => handleClaim(player.id)}
                                disabled={isClaiming}
                                className="bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 font-black text-[10px] rounded-lg h-8 uppercase tracking-widest"
                            >
                                Es mi perfil
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {!isSearching && results.length === 0 && (
                <div className="pt-4 border-t border-dashed border-gray-100">
                    <Button
                        variant="ghost"
                        className="w-full text-gray-400 hover:text-gray-600 text-xs font-bold"
                        onClick={() => window.location.href = "/player/profile/new"}
                    >
                        No aparezco, crear perfil nuevo
                    </Button>
                </div>
            )}
        </div>
    );
}
