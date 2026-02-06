import React from "react";
import { TeamType } from "@/types/database";

interface MatchScoreProps {
    variant?: "scheduled" | "result";
    results: {
        sets: Array<{ a: number | null; b: number | null }>;
        winnerTeam: TeamType | null;
    } | null;
    playersByTeam?: {
        A: any[];
        B: any[];
    };
    showPlayers?: boolean;
}

export function MatchScore({ variant = "result", results, playersByTeam, showPlayers = false }: MatchScoreProps) {
    const formatPlayerName = (p: any) => {
        if (!p) return "-";
        return `${p.first_name?.[0]}. ${p.last_name}`;
    };

    const getTeamLabel = (teamPlayers: any[]) => {
        if (teamPlayers.length === 0) return "-";
        return teamPlayers.map(p => formatPlayerName(p)).join(" - ");
    };

    const isScheduled = variant === "scheduled";
    const hasResults = results && results.sets && results.sets.length > 0;

    // Case 1: Scheduled - Show only roster
    if (isScheduled) {
        return (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-1">Equipo A</span>
                            <span className="text-sm font-bold text-gray-900">{playersByTeam ? getTeamLabel(playersByTeam.A) : "Pendiente"}</span>
                        </div>
                        <span className="text-xs font-black text-gray-200 uppercase">VS</span>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-red-600 uppercase font-black tracking-widest mb-1">Equipo B</span>
                            <span className="text-sm font-bold text-gray-900">{playersByTeam ? getTeamLabel(playersByTeam.B) : "Pendiente"}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Case 2: Result mode but no results - Show roster + Status
    if (variant === "result" && !hasResults) {
        return (
            <div className="space-y-4">
                <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                    <div className="flex justify-between items-center opacity-50 grayscale-[0.5]">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-1 text-left">Equipo A</span>
                            <span className="text-sm font-bold text-gray-900">{playersByTeam ? getTeamLabel(playersByTeam.A) : "Pendiente"}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-red-600 uppercase font-black tracking-widest mb-1 text-right">Equipo B</span>
                            <span className="text-sm font-bold text-gray-900">{playersByTeam ? getTeamLabel(playersByTeam.B) : "Pendiente"}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-4 text-center rounded-xl border border-gray-100 italic text-sm text-gray-500">
                    Pendiente de juego
                </div>
            </div>
        );
    }

    // Case 3: Result mode with results - Show table
    return (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
                <thead className="bg-gray-50/50 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                    <tr>
                        <th className="px-4 py-3 text-left w-1/2">Equipos</th>
                        {results!.sets.map((_, idx) => (
                            <th key={idx} className="px-2 py-3 text-center">Set {idx + 1}</th>
                        ))}
                        <th className="px-4 py-3 text-right">Ganador</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {/* Equipo A */}
                    <tr className={results!.winnerTeam === "A" ? "bg-blue-50/30 font-semibold" : ""}>
                        <td className="px-4 py-4 text-gray-900">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-0.5">Equipo A</span>
                                {showPlayers && playersByTeam ? (
                                    <span className="truncate">{getTeamLabel(playersByTeam.A)}</span>
                                ) : (
                                    <span className="truncate">Local</span>
                                )}
                            </div>
                        </td>
                        {results!.sets.map((s, idx) => (
                            <td key={idx} className={`px-2 py-4 text-center text-lg ${results!.winnerTeam === "A" ? "text-blue-700 font-black" : "text-gray-500"}`}>
                                {s.a ?? "-"}
                            </td>
                        ))}
                        <td className="px-4 py-4 text-right">
                            {results!.winnerTeam === "A" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white animate-pulse tracking-tighter">GANADOR</span>
                            )}
                        </td>
                    </tr>
                    {/* Equipo B */}
                    <tr className={results!.winnerTeam === "B" ? "bg-blue-50/30 font-semibold" : ""}>
                        <td className="px-4 py-4 text-gray-900">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-red-600 uppercase font-black tracking-widest mb-0.5">Equipo B</span>
                                {showPlayers && playersByTeam ? (
                                    <span className="truncate">{getTeamLabel(playersByTeam.B)}</span>
                                ) : (
                                    <span className="truncate">Visitante</span>
                                )}
                            </div>
                        </td>
                        {results!.sets.map((s, idx) => (
                            <td key={idx} className={`px-2 py-4 text-center text-lg ${results!.winnerTeam === "B" ? "text-blue-700 font-black" : "text-gray-500"}`}>
                                {s.b ?? "-"}
                            </td>
                        ))}
                        <td className="px-4 py-4 text-right">
                            {results!.winnerTeam === "B" && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white animate-pulse tracking-tighter">GANADOR</span>
                            )}
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
