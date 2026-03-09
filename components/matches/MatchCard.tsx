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
  highlightPlayerId?: string;
  primaryAction?: {
    label: string;
    href: string;
    disabled?: boolean;
  };
  secondaryAction?: {
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
  highlightPlayerId,
  primaryAction,
  secondaryAction,
  shareMessage,
  shareUrl,
}: MatchCardProps) {
  const {
    clubName,
    clubLocation,
    clubUnclaimed,
    league,
    tournament,
    matchAt,
    status,
    statusLabel,
    playersByTeam,
    results,
    playerTeam,
    maxPlayers,
  } = model;

  const tournamentStageLabel = (stage: string | null | undefined, order: number | null | undefined): string => {
    if (stage === "quarterfinal") return `Cuartos de Final${order ? ` · Cruce ${order}` : ""}`;
    if (stage === "semifinal") return `Semifinal${order ? ` · SF${order}` : ""}`;
    if (stage === "final") return "Final";
    return "Playoff";
  };

  const isCompleted = status === "completed";
  const hasPrimaryLoadResult = primaryAction?.href === `/player/matches/${model.id}/result`;

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
            {clubLocation ? <p className="text-xs text-gray-500 mt-1">{clubLocation}</p> : null}
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
            {league ? (
              <div className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700">
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>
                  {league.name}
                  {league.seasonLabel ? ` ${league.seasonLabel}` : ""}
                  {league.groupName ? ` · Grupo ${league.groupName}` : ""}
                </span>
              </div>
            ) : null}
            {tournament ? (
              <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${
                tournament.isPlayoff
                  ? "border-amber-300 bg-amber-50 text-amber-800"
                  : "border-orange-200 bg-orange-50 text-orange-700"
              }`}>
                {/* Trophy/medal icon — tournament */}
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M11 2a1 1 0 011 1v1h5a1 1 0 01.98 1.199l-1 5A1 1 0 0116 11h-2.382l-1.723 3.447A1 1 0 0111 15H9v3h2a1 1 0 010 2H7a1 1 0 010-2h0V15H6a1 1 0 01-.894-1.447L6.618 11H4a1 1 0 01-.98-.801l-1-5A1 1 0 013 4h5V3a1 1 0 011-1h2zm1 4H8.28l.6 3H11V6zm2 3h2.12l.6-3H13v3z" />
                </svg>
                <span>
                  {tournament.name}
                  {tournament.seasonLabel ? ` ${tournament.seasonLabel}` : ""}
                  {tournament.isPlayoff
                    ? ` · ${tournamentStageLabel(tournament.playoffStage, tournament.playoffOrder)}`
                    : tournament.groupName
                    ? ` · Grupo ${tournament.groupName}`
                    : ""}
                </span>
              </div>
            ) : null}
            {isCompleted && !model.hasResults && (
              <div className="px-3 py-1 rounded-full text-[10px] font-black bg-red-600 text-white tracking-tighter">
                SIN RESULTADO
              </div>
            )}
            {clubUnclaimed ? (
              <div className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 tracking-wider">
                CLUB SIN RECLAMAR
              </div>
            ) : null}
            {variant === "player" && model.clubGeneratedPending ? (
              <div className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 tracking-wider">
                GENERADO POR CLUB · PENDIENTE
              </div>
            ) : null}
          </div>
        </div>

        {/* Results / Roster */}
        <div className="mb-6">
          <MatchScore
            variant={status === "completed" ? "result" : "scheduled"}
            results={results || null}
            playersByTeam={playersByTeam}
            showPlayers={true}
            highlightPlayerId={highlightPlayerId}
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
            {isCompleted && !model.hasResults && playerTeam && !hasPrimaryLoadResult && (
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

          <div className="flex flex-wrap items-center gap-2">
            {secondaryAction && (
              secondaryAction.disabled ? (
                <span className="inline-flex items-center px-4 py-2 border border-gray-200 text-xs font-bold rounded-lg text-gray-400 bg-gray-100 cursor-not-allowed">
                  {secondaryAction.label}
                </span>
              ) : (
                <Link
                  href={secondaryAction.href}
                  className="inline-flex items-center px-4 py-2 border border-gray-200 text-xs font-bold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  {secondaryAction.label}
                </Link>
              )
            )}
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
