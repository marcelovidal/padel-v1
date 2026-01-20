import React from "react";

type Props = {
  matchId: string;
  clubName: string;
  matchAt: string;
  status: string;
  team?: string | null;
  winnerLabel: string;
  setsFormatted: string;
  hasAssessment: boolean;
  primaryAction: { label: string; href: string };
};

export default function MatchCard({ matchId, clubName, matchAt, status, team, winnerLabel, setsFormatted, hasAssessment, primaryAction }: Props) {
  return (
    <div className="border rounded-md shadow-sm p-4 mb-4 bg-white">
      <div className="flex justify-between items-start">
        <div className="text-lg font-semibold">{clubName}</div>
        <div className="text-sm text-gray-500">{new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(matchAt))}</div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="col-span-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">Equipo del jugador: <strong>{team ?? '-'}</strong></div>
            <div className="text-sm text-gray-700">Ganó: <strong>{winnerLabel}</strong></div>
          </div>
          <div className="mt-2 text-sm text-gray-700">Resultado: <strong>{setsFormatted}</strong></div>
        </div>
        <div className="flex flex-col items-end justify-between">
          <div className="text-sm">
            <span className={`inline-block px-2 py-1 text-xs rounded ${status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
              {status}
            </span>
          </div>
          <div className="mt-2 text-sm text-gray-600">Autoevaluación: <strong>{hasAssessment ? 'Sí' : 'No'}</strong></div>
        </div>
      </div>

      <div className="mt-3 flex justify-end">
        <a href={primaryAction.href} className="text-sm font-medium text-blue-600 hover:underline">{primaryAction.label}</a>
      </div>
    </div>
  );
}
