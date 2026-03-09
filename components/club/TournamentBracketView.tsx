// Visual elimination bracket for tournament playoffs.
// RSC-compatible — no "use client".

import { getEffectiveStatus } from "@/lib/match/matchUtils";

const MATCH_H = 80; // height of each compact match card in px
const SLOT_H = 112; // vertical space per first-round slot (match + gap)
const CARD_W = 256; // width of each match card in px
const CONN_W = 48; // width of connector column between rounds
const BORDER_COLOR = "#CBD5E1"; // slate-300

const STAGE_ORDER = ["quarterfinal", "semifinal", "final"] as const;
type Stage = "quarterfinal" | "semifinal" | "final";

const STAGE_LABEL: Record<Stage, string> = {
  quarterfinal: "Cuartos de Final",
  semifinal: "Semifinales",
  final: "Final",
};

function stageShort(stage: Stage, order: number): string {
  if (stage === "quarterfinal") return `CF${order}`;
  if (stage === "semifinal") return `SF${order}`;
  return "Final";
}

function resolveTeamLabel(
  teamId: string | null,
  teams: any[],
  playersMap: Map<string, string>
): string | null {
  if (!teamId) return null;
  const team = teams.find((t) => t.id === teamId);
  if (!team) return "?";
  const a =
    playersMap.get(team.player_id_a) ||
    (team.player_a as any)?.display_name ||
    "?";
  const b =
    playersMap.get(team.player_id_b) ||
    (team.player_b as any)?.display_name ||
    "?";
  return `${a} / ${b}`;
}

// ─── Compact match card inside the bracket ────────────────────────────────────

interface CardProps {
  pm: any;
  teams: any[];
  playersMap: Map<string, string>;
  stageIndex: number; // 0 = first stage (QF), 1 = SF, 2 = Final
  matchIndex: number; // position within its round (0-based)
  isChampionMatch: boolean;
}

function BracketCard({ pm, teams, playersMap, stageIndex, matchIndex, isChampionMatch }: CardProps) {
  const match = pm.matches;

  // match_results can come as array or single object depending on join shape
  const result: any =
    Array.isArray(match?.match_results)
      ? (match.match_results[0] ?? null)
      : (match?.match_results ?? null);

  const isWinnerA = result?.winner_team === "A";
  const isWinnerB = result?.winner_team === "B";
  const hasResult = Boolean(result?.winner_team);

  // getEffectiveStatus handles time-based completion even if DB status is "scheduled"
  const effectiveStatus = getEffectiveStatus(match);
  const isEffectivelyDone = effectiveStatus === "completed";

  const teamALabel = resolveTeamLabel(pm.team_a_id, teams, playersMap);
  const teamBLabel = resolveTeamLabel(pm.team_b_id, teams, playersMap);

  const sets: any[] = result?.sets ?? [];
  const setsA = sets.map((s: any) => s.team_a_games ?? s.a ?? 0);
  const setsB = sets.map((s: any) => s.team_b_games ?? s.b ?? 0);

  const isPending = !pm.team_a_id || !pm.team_b_id;
  const isScheduled = Boolean(pm.scheduled_at);

  // champion = winner of the Final match
  const champion =
    isChampionMatch && hasResult
      ? (isWinnerA ? pm.team_a_id : pm.team_b_id)
      : null;

  // Compute vertical position
  const slotsPerMatch = Math.pow(2, stageIndex);
  const slotHeight = slotsPerMatch * SLOT_H;
  const topPx = matchIndex * slotHeight + (slotHeight - MATCH_H) / 2;

  // Card border
  let borderClass = "border-gray-200";
  if (hasResult) borderClass = "border-emerald-300";
  else if (isEffectivelyDone) borderClass = "border-orange-200"; // done but no result loaded yet
  else if (!isPending && isScheduled) borderClass = "border-blue-200";
  else if (isPending) borderClass = "border-dashed border-gray-200";

  const stage = pm.stage as Stage;

  return (
    <a
      href={`#pm-${pm.id}`}
      style={{ position: "absolute", top: topPx, left: 0, width: CARD_W }}
      className="block no-underline"
    >
      {/* Champion crown above the Final card */}
      {isChampionMatch && champion ? (
        <div className="flex items-center justify-center gap-1 mb-1">
          <span className="text-amber-500 text-base leading-none">🏆</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Campeón</span>
          <span className="text-amber-500 text-base leading-none">🏆</span>
        </div>
      ) : null}

      <div
        className={`border-2 rounded-xl bg-white shadow-sm overflow-hidden transition-all hover:shadow-md hover:-translate-y-px ${borderClass} ${isChampionMatch && champion ? "ring-2 ring-amber-300 ring-offset-1" : ""}`}
        style={{ height: MATCH_H }}
      >
        {/* Stage label + status badge */}
        <div
          className="flex items-center justify-between px-2 pt-0.5"
          style={{ height: 18 }}
        >
          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400">
            {stageShort(stage, pm.match_order)}
          </span>
          {hasResult ? (
            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wide">Finalizado</span>
          ) : isEffectivelyDone ? (
            <span className="text-[9px] font-bold text-orange-500 uppercase tracking-wide">Sin resultado</span>
          ) : isScheduled ? (
            <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide">Programado</span>
          ) : isPending ? (
            <span className="text-[9px] text-gray-400 uppercase tracking-wide">En espera</span>
          ) : (
            <span className="text-[9px] text-amber-600 uppercase tracking-wide">Sin programar</span>
          )}
        </div>

        {/* Team A row */}
        <div
          className={`flex items-center gap-1.5 px-2 border-b border-gray-100 ${
            isWinnerA ? "bg-emerald-50" : ""
          } ${isChampionMatch && isWinnerA ? "bg-amber-50" : ""}`}
          style={{ height: (MATCH_H - 18) / 2 }}
        >
          {isWinnerA ? (
            <span className={`text-[10px] shrink-0 font-bold ${isChampionMatch ? "text-amber-500" : "text-emerald-500"}`}>
              {isChampionMatch ? "★" : "▶"}
            </span>
          ) : (
            <span className="w-2.5 shrink-0" />
          )}
          <span
            className={`text-[11px] leading-tight truncate flex-1 ${
              teamALabel
                ? isWinnerA
                  ? isChampionMatch
                    ? "font-black text-amber-800"
                    : "font-bold text-emerald-800"
                  : "font-semibold text-gray-800"
                : "text-gray-400 italic"
            }`}
          >
            {teamALabel ?? "Por definir"}
          </span>
          {setsA.length > 0 ? (
            <span className={`text-[11px] font-mono tabular-nums shrink-0 font-semibold ${isWinnerA ? "text-emerald-700" : "text-gray-500"}`}>
              {setsA.join(" ")}
            </span>
          ) : null}
        </div>

        {/* Team B row */}
        <div
          className={`flex items-center gap-1.5 px-2 ${
            isWinnerB ? "bg-emerald-50" : ""
          } ${isChampionMatch && isWinnerB ? "bg-amber-50" : ""}`}
          style={{ height: (MATCH_H - 18) / 2 }}
        >
          {isWinnerB ? (
            <span className={`text-[10px] shrink-0 font-bold ${isChampionMatch ? "text-amber-500" : "text-emerald-500"}`}>
              {isChampionMatch ? "★" : "▶"}
            </span>
          ) : (
            <span className="w-2.5 shrink-0" />
          )}
          <span
            className={`text-[11px] leading-tight truncate flex-1 ${
              teamBLabel
                ? isWinnerB
                  ? isChampionMatch
                    ? "font-black text-amber-800"
                    : "font-bold text-emerald-800"
                  : "font-semibold text-gray-800"
                : "text-gray-400 italic"
            }`}
          >
            {teamBLabel ?? "Por definir"}
          </span>
          {setsB.length > 0 ? (
            <span className={`text-[11px] font-mono tabular-nums shrink-0 font-semibold ${isWinnerB ? "text-emerald-700" : "text-gray-500"}`}>
              {setsB.join(" ")}
            </span>
          ) : null}
        </div>
      </div>
    </a>
  );
}

// ─── Connector lines between rounds ──────────────────────────────────────────
// For each pair of "from" matches → one "to" match, draws ├─ style lines.

interface ConnectorProps {
  fromCount: number; // number of matches in the "from" round
  fromSlotsPerMatch: number; // slot multiplier of the "from" round (1 for QF, 2 for SF)
}

function BracketConnector({ fromCount, fromSlotsPerMatch }: ConnectorProps) {
  const toCount = fromCount / 2;
  const totalH = fromCount * fromSlotsPerMatch * SLOT_H;
  const midX = CONN_W / 2;

  const segments: { key: string; style: React.CSSProperties }[] = [];

  for (let i = 0; i < toCount; i++) {
    const from1Center = (i * 2 * fromSlotsPerMatch + fromSlotsPerMatch / 2) * SLOT_H;
    const from2Center = ((i * 2 + 1) * fromSlotsPerMatch + fromSlotsPerMatch / 2) * SLOT_H;
    const midY = (from1Center + from2Center) / 2;

    // Horizontal from left edge to midX at from1Center
    segments.push({
      key: `${i}-h1`,
      style: { position: "absolute", top: from1Center, left: 0, width: midX, borderTop: `1.5px solid ${BORDER_COLOR}` },
    });
    // Vertical bar from from1Center to from2Center at midX
    segments.push({
      key: `${i}-v`,
      style: {
        position: "absolute",
        left: midX - 1,
        top: from1Center,
        width: 0,
        height: from2Center - from1Center,
        borderLeft: `1.5px solid ${BORDER_COLOR}`,
      },
    });
    // Horizontal from left edge to midX at from2Center
    segments.push({
      key: `${i}-h2`,
      style: { position: "absolute", top: from2Center, left: 0, width: midX, borderTop: `1.5px solid ${BORDER_COLOR}` },
    });
    // Horizontal from midX to right at midY (going to next round)
    segments.push({
      key: `${i}-hm`,
      style: { position: "absolute", top: midY, left: midX - 1, right: 0, borderTop: `1.5px solid ${BORDER_COLOR}` },
    });
  }

  return (
    <div style={{ position: "relative", width: CONN_W, height: totalH, flexShrink: 0 }}>
      {segments.map(({ key, style }) => (
        <div key={key} style={style} />
      ))}
    </div>
  );
}

// ─── Main bracket component ───────────────────────────────────────────────────

interface Props {
  playoffMatches: any[];
  teams: any[];
  playersMap: Map<string, string>;
}

export function TournamentBracketView({ playoffMatches, teams, playersMap }: Props) {
  // Group and sort by stage + match_order
  const matchesByStage: Partial<Record<Stage, any[]>> = {};
  for (const pm of playoffMatches) {
    const s = pm.stage as Stage;
    if (!matchesByStage[s]) matchesByStage[s] = [];
    matchesByStage[s]!.push(pm);
  }
  for (const s of STAGE_ORDER) {
    if (matchesByStage[s]) {
      matchesByStage[s]!.sort((a, b) => a.match_order - b.match_order);
    }
  }

  const activeStages = STAGE_ORDER.filter((s) => matchesByStage[s]?.length);
  if (activeStages.length === 0) return null;

  const firstStage = activeStages[0];
  const lastStage = activeStages[activeStages.length - 1]; // the Final (or SF if no QF)
  const firstRoundCount = matchesByStage[firstStage]!.length;
  const totalH = firstRoundCount * SLOT_H;

  // Total bracket width for centering the "Final" label
  const totalW =
    activeStages.length * CARD_W + (activeStages.length - 1) * CONN_W;

  return (
    <div className="overflow-x-auto pb-2">
      {/* Column headers */}
      <div style={{ display: "flex", width: totalW, marginBottom: 8 }}>
        {activeStages.map((stage, i) => (
          <div key={stage} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div
              className="text-center"
              style={{ width: CARD_W }}
            >
              <span className="text-xs font-black uppercase tracking-widest text-gray-500">
                {STAGE_LABEL[stage]}
              </span>
            </div>
            {i < activeStages.length - 1 ? (
              <div style={{ width: CONN_W }} />
            ) : null}
          </div>
        ))}
      </div>

      {/* Bracket rows */}
      <div style={{ display: "flex", height: totalH, alignItems: "flex-start", width: totalW }}>
        {activeStages.map((stage, stageIdx) => {
          const matches = matchesByStage[stage]!;
          const slotsPerMatch = Math.pow(2, stageIdx);

          return (
            <div key={stage} style={{ display: "flex", alignItems: "flex-start", flexShrink: 0 }}>
              {/* Round column */}
              <div style={{ position: "relative", width: CARD_W, height: totalH, flexShrink: 0 }}>
                {matches.map((pm, matchIdx) => (
                  <BracketCard
                    key={pm.id}
                    pm={pm}
                    teams={teams}
                    playersMap={playersMap}
                    stageIndex={stageIdx}
                    matchIndex={matchIdx}
                    isChampionMatch={stage === lastStage && matches.length === 1}
                  />
                ))}
              </div>

              {/* Connector to next round */}
              {stageIdx < activeStages.length - 1 ? (
                <BracketConnector
                  fromCount={matches.length}
                  fromSlotsPerMatch={slotsPerMatch}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
