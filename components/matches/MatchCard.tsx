import React from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { MatchCardModel } from "./matchCard.model";
import PlayerMatchAssessmentPanel from "../player/PlayerMatchAssessmentPanel";
import { MatchScore } from "./MatchScore";
import { ShareButtons } from "./ShareButtons";


interface MatchCardProps {
  model: MatchCardModel;
  variant: "admin" | "player";
  primaryAction?: {
    label: string;
    href: string;
    disabled?: boolean;
  };
  shareMessage?: string; // Standard message for WhatsApp
  shareUrl?: string;
}

export default function MatchCard({
  model,
  variant,
  primaryAction,
  shareMessage,
  shareUrl,
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
          <div className="flex flex-col items-end gap-2">
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
            {isCompleted && !model.hasResults && (
              <div className="px-3 py-1 rounded-full text-[10px] font-black bg-red-600 text-white tracking-tighter">
                SIN RESULTADO
              </div>
            )}
          </div>
        </div>

        {/* Results / Roster */}
        <div className="mb-6">
          <MatchScore
            variant={status === "completed" ? "result" : "scheduled"}
            results={results || null}
            playersByTeam={playersByTeam}
            showPlayers={true}
          />
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
            {isCompleted && !model.hasResults && playerTeam && (
              <div className="mt-2">
                <Link
                  href={`/player/matches/${model.id}/result`}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 px-2 py-1 rounded border border-red-100 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cargar resultado
                </Link>
              </div>
            )}
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

        {/* Subtle Share CTA */}
        {shareMessage && shareUrl && (
          <div className="mt-4 pt-3 border-t border-gray-50 flex justify-end">
            <ShareButtons
              matchId={model.id}
              message={shareMessage}
              shareUrl={shareUrl}
              variant="subtle"
            />
          </div>
        )}

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
