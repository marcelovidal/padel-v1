import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { MatchCardModel } from "./matchCard.model";
import PlayerMatchAssessmentPanel from "../player/PlayerMatchAssessmentPanel";

interface MatchCardProps {
  model: MatchCardModel;
  variant: "admin" | "player";
  primaryAction?: {
    label: string;
    href: string;
    disabled?: boolean;
  };
}

export default function MatchCard({
  model,
  variant,
  primaryAction,
}: MatchCardProps) {
  const {
    clubName,
    matchAt,
    status,
    statusLabel,
    playersByTeam,
    results,
    playerTeam,
    maxPlayers,
  } = model;

  const isCompleted = status === "completed";

  const formatPlayerName = (p: { first_name: string; last_name: string } | null) => {
    if (!p) return "-";
    return `${p.first_name.charAt(0)}. ${p.last_name}`;
  };

  const getTeamLabel = (teamPlayers: any[]) => {
    if (teamPlayers.length === 0) return "Sin asignar";
    return teamPlayers.map(p => formatPlayerName(p)).join(" - ");
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="text-sm font-medium text-blue-600 mb-1">
              {format(matchAt, "EEEE d 'de' MMMM, HH:mm'hs'", { locale: es })}
            </div>
            <h3 className="text-lg font-bold text-gray-900">{clubName}</h3>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold ${isCompleted
              ? "bg-green-100 text-green-800"
              : status === "cancelled"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
              }`}
          >
            {statusLabel}
          </div>
        </div>

        {/* Results Table */}
        <div className="mb-6 overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase font-bold">
              <tr>
                <th className="px-4 py-2 text-left font-bold w-1/2">Equipos</th>
                {results?.sets.map((_, idx) => (
                  <th key={idx} className="px-2 py-2 text-center">Set {idx + 1}</th>
                )) || (
                    <th className="px-2 py-2 text-center">Sets</th>
                  )}
                {isCompleted && <th className="px-4 py-2 text-right">Ganador</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {/* Equipo A */}
              <tr className={results?.winnerTeam === "A" ? "bg-blue-50/30" : ""}>
                <td className="px-4 py-3 font-medium text-gray-900 truncate">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Equipo A</span>
                    <span className="truncate">{getTeamLabel(playersByTeam.A)}</span>
                  </div>
                </td>
                {results ? (
                  results.sets.map((s, idx) => (
                    <td key={idx} className={`px-2 py-3 text-center font-bold ${results.winnerTeam === "A" ? "text-blue-700" : "text-gray-500"}`}>
                      {s.a ?? "-"}
                    </td>
                  ))
                ) : (
                  <td className="px-2 py-3 text-center text-gray-400 italic">--</td>
                )}
                {isCompleted && (
                  <td className="px-4 py-3 text-right">
                    {results?.winnerTeam === "A" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">SI</span>
                    )}
                  </td>
                )}
              </tr>
              {/* Equipo B */}
              <tr className={results?.winnerTeam === "B" ? "bg-blue-50/30" : ""}>
                <td className="px-4 py-3 font-medium text-gray-900 truncate">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-gray-400 uppercase font-bold mb-0.5">Equipo B</span>
                    <span className="truncate">{getTeamLabel(playersByTeam.B)}</span>
                  </div>
                </td>
                {results ? (
                  results.sets.map((s, idx) => (
                    <td key={idx} className={`px-2 py-3 text-center font-bold ${results.winnerTeam === "B" ? "text-blue-700" : "text-gray-500"}`}>
                      {s.b ?? "-"}
                    </td>
                  ))
                ) : (
                  <td className="px-2 py-3 text-center text-gray-400 italic">--</td>
                )}
                {isCompleted && (
                  <td className="px-4 py-3 text-right">
                    {results?.winnerTeam === "B" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">SI</span>
                    )}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
          {!results && (
            <div className="bg-gray-50 p-4 text-center text-xs text-gray-500 italic">
              {isCompleted ? "Resultado no registrado" : "Pendiente de juego"}
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm">
          <div className="flex flex-col gap-1">
            {variant === "player" && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">Autoevaluación:</span>
                {model.hasAssessment ? (
                  <span className="inline-flex items-center text-green-700 font-bold px-1.5 py-0.5 rounded bg-green-50 text-[10px] border border-green-100">
                    COMPLETA
                  </span>
                ) : (
                  <span className="inline-flex items-center text-gray-400 font-medium px-1.5 py-0.5 rounded bg-gray-50 text-[10px] border border-gray-100">
                    PENDIENTE
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-xs">
                {maxPlayers} jugadores
              </span>
              {variant === "player" && playerTeam && (
                <>
                  <span className="text-gray-200">|</span>
                  <span className="text-gray-500 text-xs">
                    Tu equipo: <span className="font-bold text-gray-700">{playerTeam}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          {primaryAction && (
            primaryAction.disabled ? (
              <span className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded-lg shadow-sm text-gray-400 bg-gray-100 cursor-not-allowed">
                {primaryAction.label}
              </span>
            ) : (
              <Link
                href={primaryAction.href}
                className="inline-flex items-center px-4 py-2 border border-transparent text-xs font-bold rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                {primaryAction.label}
              </Link>
            )
          )}
        </div>

        {/* Player-only Assessment Panel */}
        {variant === "player" && (
          <PlayerMatchAssessmentPanel
            matchId={model.id}
            hasAssessment={!!model.hasAssessment}
          />
        )}
      </div>
    </div>
  );
}
