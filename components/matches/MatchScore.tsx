import React from "react";
import { TeamType } from "@/types/database";
import { UserAvatar } from "@/components/ui/UserAvatar";

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
    highlightPlayerId?: string;
}

export function MatchScore({ variant = "result", results, playersByTeam, showPlayers = false, highlightPlayerId }: MatchScoreProps) {
    const formatPlayerName = (p: any) => {
        if (!p) return "-";
        return `${p.first_name?.[0]}. ${p.last_name}`;
    };

    const renderPlayer = (p: any) => {
        if (!p) return <span>-</span>;
        const initials = `${p.first_name?.[0] || ""}${p.last_name?.[0] || ""}`;
        const isCurrentPlayer = !!highlightPlayerId && p.id === highlightPlayerId;
        return (
            <div className="flex items-center gap-2">
                <UserAvatar
                    src={p.avatar_url?.startsWith('http') ? p.avatar_url : null}
                    initials={initials}
                    size="xs"
                />
                <span
                    className={`truncate rounded px-1 py-0.5 ${
                        isCurrentPlayer
                            ? "bg-brand-azul/10 text-brand-azul font-semibold ring-1 ring-brand-azul/20"
                            : "text-[var(--text-primary)]"
                    }`}
                >
                    {formatPlayerName(p)}
                </span>
            </div>
        );
    };

    const getTeamList = (teamPlayers: any[]) => {
        if (teamPlayers.length === 0) return <span>-</span>;
        return (
            <div className="flex flex-col gap-1">
                {teamPlayers.map((p, idx) => (
                    <div key={idx}>{renderPlayer(p)}</div>
                ))}
            </div>
        );
    };

    const isScheduled = variant === "scheduled";
    const hasResults = results && results.sets && results.sets.length > 0;

    // Case 1: Scheduled - Show only roster
    if (isScheduled) {
        return (
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-4">
                <div className="grid grid-cols-1 gap-3">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-brand-azul uppercase font-black tracking-widest mb-1">Equipo A</span>
                            <span className="text-sm font-bold text-gray-900">{playersByTeam ? getTeamList(playersByTeam.A) : "Pendiente"}</span>
                        </div>
                        <span className="text-xs font-black text-gray-200 uppercase">VS</span>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-brand-rojo uppercase font-black tracking-widest mb-1">Equipo B</span>
                            <span className="text-sm font-bold text-gray-900">{playersByTeam ? getTeamList(playersByTeam.B) : "Pendiente"}</span>
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
                <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)] p-5">
                    <div className="flex justify-between items-center opacity-50 grayscale-[0.5]">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-1 text-left">Equipo A</span>
                            <span className="text-sm font-bold text-gray-900">{playersByTeam ? getTeamList(playersByTeam.A) : "Pendiente"}</span>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] text-red-600 uppercase font-black tracking-widest mb-1 text-right">Equipo B</span>
                            <span className="text-sm font-bold text-gray-900">{playersByTeam ? getTeamList(playersByTeam.B) : "Pendiente"}</span>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--bg-elevated)] p-4 text-center rounded-xl border border-[var(--border-soft)] italic text-sm text-[var(--text-muted)]">
                    Sin resultado (Pendiente de carga)
                </div>
            </div>
        );
    }

    // Case 3: Result mode with results - Show table
    return (
        <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--bg-card)]">
            <table className="w-full text-sm">
                <thead className="bg-[var(--bg-elevated)] text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">
                    <tr>
                        <th className="px-4 py-3 text-left w-1/2">Equipos</th>
                        {results!.sets.map((_, idx) => (
                            <th key={idx} className="px-2 py-3 text-center">Set {idx + 1}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                    {/* Equipo A */}
                    <tr>
                        <td className="px-4 py-4 text-[var(--text-primary)]">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-brand-azul uppercase font-black tracking-widest mb-0.5">
                                    Equipo A{results!.winnerTeam === "A" ? " · Ganador" : ""}
                                </span>
                                {showPlayers && playersByTeam ? (
                                    <span className="block">{getTeamList(playersByTeam.A)}</span>
                                ) : (
                                    <span className="truncate">Local</span>
                                )}
                            </div>
                        </td>
                        {results!.sets.map((s, idx) => (
                            <td key={idx} className={`px-2 py-4 text-center text-lg ${results!.winnerTeam === "A" ? "text-brand-azul font-black" : "text-gray-400"}`}>
                                {s.a ?? "-"}
                            </td>
                        ))}
                    </tr>
                    {/* Equipo B */}
                    <tr>
                        <td className="px-4 py-4 text-[var(--text-primary)]">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-brand-rojo uppercase font-black tracking-widest mb-0.5">
                                    Equipo B{results!.winnerTeam === "B" ? " · Ganador" : ""}
                                </span>
                                {showPlayers && playersByTeam ? (
                                    <span className="block">{getTeamList(playersByTeam.B)}</span>
                                ) : (
                                    <span className="truncate">Visitante</span>
                                )}
                            </div>
                        </td>
                        {results!.sets.map((s, idx) => (
                            <td key={idx} className={`px-2 py-4 text-center text-lg ${results!.winnerTeam === "B" ? "text-brand-azul font-black" : "text-gray-400"}`}>
                                {s.b ?? "-"}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
