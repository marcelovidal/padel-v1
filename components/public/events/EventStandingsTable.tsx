/**
 * Tabla de posiciones de un grupo. Solo lectura.
 *
 * RSC — sin "use client". No trae formularios ni acciones: es la version
 * publica de lo que en el panel del club esta inline dentro de la pagina de
 * detalle, mezclado con los forms de carga de resultados.
 *
 * El orden de las filas ES el ranking: viene resuelto por
 * club_get_tournament_group_table / club_get_group_table, que ya aplican el
 * criterio de desempate. Aca no se reordena nada.
 */

export type StandingsRow = {
  team_id: string;
  played: number;
  wins: number;
  losses: number;
  points: number;
  sets_won: number;
  sets_lost: number;
};

interface Props {
  rows: StandingsRow[];
  /** team_id → "Jugador A / Jugador B" */
  teamLabel: (teamId: string) => string;
  /** Cuantos puestos se marcan como clasificados. 0 desactiva la marca. */
  qualifyingCount?: number;
}

export function EventStandingsTable({ rows, teamLabel, qualifyingCount = 2 }: Props) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        Todavía no hay partidos jugados en este grupo.
      </p>
    );
  }

  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] font-black uppercase tracking-wider text-[var(--text-faint)]">
            <th className="px-1 py-2 font-black">#</th>
            <th className="px-1 py-2 font-black">Pareja</th>
            <th className="px-1 py-2 text-center font-black">Pts</th>
            <th className="px-1 py-2 text-center font-black">PJ</th>
            <th className="px-1 py-2 text-center font-black">G</th>
            <th className="px-1 py-2 text-center font-black">P</th>
            <th className="px-1 py-2 text-center font-black">Sets</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const qualifies = index < qualifyingCount;
            return (
              <tr
                key={row.team_id}
                className="border-t border-[var(--border-soft)]"
              >
                <td className="px-1 py-2.5">
                  <span
                    className={
                      qualifies
                        ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-[var(--pill-blue-bg)] text-xs font-black tabular-nums text-[var(--pill-blue-text)]"
                        : "inline-flex h-6 w-6 items-center justify-center text-xs font-bold tabular-nums text-[var(--text-muted)]"
                    }
                  >
                    {index + 1}
                  </span>
                </td>
                <td
                  className={`px-1 py-2.5 ${
                    qualifies
                      ? "font-bold text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {teamLabel(row.team_id)}
                </td>
                <td className="px-1 py-2.5 text-center font-black tabular-nums text-[var(--text-primary)]">
                  {row.points}
                </td>
                <td className="px-1 py-2.5 text-center tabular-nums text-[var(--text-muted)]">
                  {row.played}
                </td>
                <td className="px-1 py-2.5 text-center tabular-nums text-[var(--text-muted)]">
                  {row.wins}
                </td>
                <td className="px-1 py-2.5 text-center tabular-nums text-[var(--text-muted)]">
                  {row.losses}
                </td>
                <td className="px-1 py-2.5 text-center tabular-nums text-[var(--text-faint)]">
                  {row.sets_won}/{row.sets_lost}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {qualifyingCount > 0 && rows.length > qualifyingCount ? (
        <p className="mt-3 px-1 text-xs text-[var(--text-faint)]">
          Los primeros {qualifyingCount} de cada grupo clasifican a playoffs.
        </p>
      ) : null}
    </div>
  );
}
