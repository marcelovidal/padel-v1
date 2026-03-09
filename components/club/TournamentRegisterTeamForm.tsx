"use client";

import { useState } from "react";
import { PlayerSearchSelect } from "@/components/players/PlayerSearchSelect";
import { registerTournamentTeamAction } from "@/lib/actions/tournaments.actions";

type PlayerOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name?: string | null;
  city?: string | null;
  region_name?: string | null;
  region_code?: string | null;
  category?: number | null;
};

type Props = {
  tournamentId: string;
  targetCategoryInt: number;
  players: PlayerOption[];
};

export function TournamentRegisterTeamForm({ tournamentId, targetCategoryInt, players }: Props) {
  const [playerIdA, setPlayerIdA] = useState("");
  const [playerIdB, setPlayerIdB] = useState("");

  return (
    <form action={registerTournamentTeamAction} className="mt-3 grid gap-3 md:grid-cols-4">
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <PlayerSearchSelect
        name="player_id_a"
        placeholder="Buscar jugador A..."
        players={players}
        selectedId={playerIdA}
        onSelectId={setPlayerIdA}
      />

      <PlayerSearchSelect
        name="player_id_b"
        placeholder="Buscar jugador B..."
        players={players}
        selectedId={playerIdB}
        onSelectId={setPlayerIdB}
      />

      <input
        type="number"
        name="entry_category_int"
        min={targetCategoryInt}
        placeholder={`Cat. inscripcion (>= ${targetCategoryInt})`}
        className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
      />

      <button
        disabled={!playerIdA || !playerIdB || playerIdA === playerIdB}
        className={
          playerIdA && playerIdB && playerIdA !== playerIdB
            ? "rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            : "rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
        }
      >
        Inscribir pareja
      </button>
    </form>
  );
}
