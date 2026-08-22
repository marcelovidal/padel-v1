import { normalizeSets } from "@/lib/match/matchUtils";
import {
  formatMatchSlot,
  resolvePublicMatchState,
  type PublicMatchState,
} from "@/lib/clubs/publicMatchStatus";

/**
 * Fixture de un grupo con sus resultados. Solo lectura.
 *
 * RSC — sin "use client". Es la contraparte publica de lo que en el panel del
 * club esta inline junto a TournamentMatchScheduleForm y
 * TournamentMatchResultForm. Aca no hay ninguno de los dos: quien mira esta
 * pagina no programa ni carga nada.
 *
 * El estado se resuelve con resolvePublicMatchState y compara contra la hora
 * actual en el servidor, que es donde tiene que quedar: si esto fuera un
 * componente cliente, el valor de `new Date()` diferiria entre el render del
 * servidor y la hidratacion.
 */

/** Chip por estado. Jugando ahora destaca — es lo que vale la pena mirar. */
const STATE_CHIP: Record<PublicMatchState, { label: string; className: string } | null> = {
  with_result: {
    label: "Terminado",
    className: "bg-[var(--pill-green-bg)] text-[var(--pill-green-text)]",
  },
  live: { label: "Jugando ahora", className: "bg-brand-rojo text-white" },
  pending_result: {
    label: "Resultado pendiente",
    className: "bg-[var(--pill-amber-bg)] text-[var(--pill-amber-text)]",
  },
  // Con fecha el chip ES la fecha; sin fecha, el rótulo.
  upcoming: null,
  unscheduled: null,
};

interface Props {
  matches: any[];
  /** team_id → "Jugador A / Jugador B" */
  teamLabel: (teamId: string | null) => string;
}

export function EventFixtureList({ matches, teamLabel }: Props) {
  if (matches.length === 0) {
    return (
      <p className="text-sm text-[var(--text-muted)]">
        El fixture de este grupo todavía no fue generado.
      </p>
    );
  }

  // Agrupado por ronda: es como la gente lee un fixture, por fecha de juego.
  const byRound = new Map<number, any[]>();
  for (const match of matches) {
    const round = Number(match.round_index ?? 0);
    if (!byRound.has(round)) byRound.set(round, []);
    byRound.get(round)!.push(match);
  }
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      {rounds.map((round) => (
        <div key={round}>
          <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[var(--text-faint)]">
            Ronda {round}
          </p>

          <ul className="space-y-2">
            {byRound.get(round)!.map((m) => {
              const match = m.matches;

              // La duracion del turno viene de la cancha; sin cancha, el
              // helper cae a 90 — la convencion de los RPCs de agenda.
              const state = resolvePublicMatchState(
                {
                  scheduled_at: m.scheduled_at,
                  match_at: match?.match_at,
                  match_results: match?.match_results,
                },
                { slotIntervalMinutes: m.court?.slot_interval_minutes }
              );

              const result = Array.isArray(match?.match_results)
                ? match.match_results[0] ?? null
                : match?.match_results ?? null;

              const hasResult = Boolean(result?.winner_team);
              const sets = normalizeSets(result?.sets);
              const chip = STATE_CHIP[state];
              const when =
                state === "upcoming"
                  ? formatMatchSlot(m.scheduled_at)
                  : state === "pending_result"
                    ? formatMatchSlot(m.scheduled_at)
                    : null;

              const winnerA = result?.winner_team === "A";
              const winnerB = result?.winner_team === "B";

              return (
                <li
                  key={m.id}
                  className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-elevated)] px-3 py-2.5"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-1">
                      <TeamRow
                        label={teamLabel(m.team_a_id)}
                        games={sets.map((s) => s.a)}
                        isWinner={winnerA}
                        hasResult={hasResult}
                      />
                      <TeamRow
                        label={teamLabel(m.team_b_id)}
                        games={sets.map((s) => s.b)}
                        isWinner={winnerB}
                        hasResult={hasResult}
                      />
                    </div>

                    <div className="shrink-0 text-right">
                      {chip ? (
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${chip.className}`}
                        >
                          {chip.label}
                        </span>
                      ) : when ? (
                        <span
                          className={`text-[11px] font-bold tabular-nums ${
                            state === "live" ? "text-brand-rojo" : "text-[var(--text-muted)]"
                          }`}
                        >
                          {when}
                        </span>
                      ) : (
                        <span className="text-[11px] text-[var(--text-faint)]">
                          A programar
                        </span>
                      )}
                      {state === "pending_result" && when ? (
                        <p className="mt-0.5 text-[10px] tabular-nums text-[var(--text-faint)]">
                          {when}
                        </p>
                      ) : null}
                      {m.court?.name ? (
                        <p className="mt-0.5 text-[10px] text-[var(--text-faint)]">
                          {m.court.name}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TeamRow({
  label,
  games,
  isWinner,
  hasResult,
}: {
  label: string;
  games: (number | null)[];
  isWinner: boolean;
  hasResult: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`min-w-0 flex-1 truncate text-sm ${
          hasResult && isWinner
            ? "font-bold text-[var(--text-primary)]"
            : hasResult
              ? "text-[var(--text-muted)]"
              : "text-[var(--text-secondary)]"
        }`}
      >
        {label}
      </span>
      {games.length > 0 ? (
        <span
          className={`shrink-0 font-mono text-xs tabular-nums ${
            isWinner ? "font-bold text-[var(--text-primary)]" : "text-[var(--text-muted)]"
          }`}
        >
          {games.map((g) => g ?? 0).join("  ")}
        </span>
      ) : null}
    </div>
  );
}
