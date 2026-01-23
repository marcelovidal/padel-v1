import React from "react";

type PlayerMini = { id: string; first_name: string; last_name: string } | null;

type Props = {
  matchId: string;
  clubName: string;
  matchAt: string;
  status: string;
  sets: Array<{ a: number; b: number }> | null;
  playersByTeam: { A: PlayerMini[]; B: PlayerMini[] };
  hasAssessment: boolean;
  primaryAction: { label: string; href: string };
  profilePlayerId?: string | null;
  winnerLabel?: string;
  winner_team?: string | null;
};

export default function MatchCard({ matchId, clubName, matchAt, status, sets, playersByTeam, hasAssessment, primaryAction, profilePlayerId, winnerLabel }: Props) {
  const formattedAt = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(matchAt));

  const maxSets = sets && Array.isArray(sets) ? sets.length : 0;

  return (
    <div className="border rounded-md shadow-sm mb-4 bg-white overflow-hidden">
      {/* Header */}
      <div className="w-full bg-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="text-lg font-semibold text-gray-800">{clubName}</div>
        <div className="text-sm text-gray-600">{formattedAt}</div>
      </div>

      {/* Body */}
      <div className="p-4">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-8">
            {/* Ganó / autoevaluación row */}
            <div className="flex items-center justify-between text-sm text-gray-700 mb-3">
              <div>Ganó: <strong>{winnerLabel ?? '-'}</strong></div>
              <div>Autoevaluación: <strong>{hasAssessment ? 'Sí' : 'No'}</strong></div>
            </div>

            {/* Equipo A */}
            <div>
              <div className="text-xs text-gray-500 uppercase">Equipo A</div>
              <div className="mt-2 space-y-2">
                {(playersByTeam?.A || []).map((p, idx) => (
                  <div key={p?.id ?? idx} className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-800">{p?.first_name ? `${p.first_name[0].toUpperCase()}.` : '-'}</div>
                    <div className="text-sm text-gray-700">{p ? `${p.first_name?.[0] ? `${p.first_name[0]}. ` : ''}${p?.last_name ?? '-'}` : '-'}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 my-3" />

            {/* Equipo B */}
            <div>
              <div className="text-xs text-gray-500 uppercase">Equipo B</div>
              <div className="mt-2 space-y-2">
                {(playersByTeam?.B || []).map((p, idx) => (
                  <div key={p?.id ?? idx} className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-800">{p?.first_name ? `${p.first_name[0].toUpperCase()}.` : '-'}</div>
                    <div className="text-sm text-gray-700">{p ? `${p.first_name?.[0] ? `${p.first_name[0]}. ` : ''}${p?.last_name ?? '-'}` : '-'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="w-full">
              {maxSets > 0 ? (
                <div className="text-xs text-gray-500 mb-2">
                  <div className={`grid gap-2 justify-items-center`} style={{ gridTemplateColumns: `repeat(${maxSets}, minmax(0,1fr))` }}>
                    {Array.from({ length: maxSets }).map((_, i) => (
                      <div key={i} className="text-center">Set {i + 1}</div>
                    ))}
                  </div>

                  <div className={`grid gap-2 font-semibold text-center mt-1`} style={{ gridTemplateColumns: `repeat(${maxSets}, minmax(0,1fr))` }}>
                    {sets!.map((s, i) => (
                      <div key={`a-${i}`}>{s.a}</div>
                    ))}
                  </div>

                  <div className={`grid gap-2 text-center text-gray-700 mt-1`} style={{ gridTemplateColumns: `repeat(${maxSets}, minmax(0,1fr))` }}>
                    {sets!.map((s, i) => (
                      <div key={`b-${i}`}>{s.b}</div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Resultado pendiente</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full bg-gray-50 border-t px-4 py-3 flex items-center justify-between">
        <div>
          <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">{status}</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-xs text-gray-600">Autoevaluación: <strong>{hasAssessment ? 'Sí' : 'No'}</strong></div>
          {(!sets || sets.length === 0) ? (
            <a href={`/admin/matches/${matchId}?editResult=1`} className="text-sm font-medium text-blue-600 hover:underline">Cargar resultado</a>
          ) : (
            <a href={`/admin/matches/${matchId}`} className="text-sm font-medium text-blue-600 hover:underline">Ver detalle</a>
          )}
        </div>
      </div>
    </div>
  );
}
