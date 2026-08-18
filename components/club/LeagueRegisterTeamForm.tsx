"use client";

import { useState } from "react";
import { PlayerSearchSelect } from "@/components/players/PlayerSearchSelect";
import { GuestPlayerModal } from "@/components/players/GuestPlayerModal";
import { registerLeagueTeamAction } from "@/lib/actions/leagues.actions";

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
  leagueId: string;
  players: PlayerOption[];
};

export function LeagueRegisterTeamForm({ leagueId, players: initialPlayers }: Props) {
  const [players, setPlayers] = useState(initialPlayers);
  const [playerIdA, setPlayerIdA] = useState("");
  const [playerIdB, setPlayerIdB] = useState("");
  const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
  const [activeSelector, setActiveSelector] = useState<"playerA" | "playerB" | null>(null);

  const openGuestModal = (selector: "playerA" | "playerB") => {
    setActiveSelector(selector);
    setIsGuestModalOpen(true);
  };

  const handleGuestSuccess = (newId: string, displayName: string) => {
    const newPlayer = {
      id: newId,
      first_name: displayName.split(" ")[0] || "",
      last_name: displayName.split(" ").slice(1).join(" ") || "",
      display_name: displayName,
    };

    setPlayers((prev) => [newPlayer, ...prev]);
    if (activeSelector === "playerA") setPlayerIdA(newId);
    if (activeSelector === "playerB") setPlayerIdB(newId);
  };

  return (
    <>
      <form action={registerLeagueTeamAction} className="mt-3 grid gap-3 md:grid-cols-4">
        <input type="hidden" name="league_id" value={leagueId} />

        <PlayerSearchSelect
          name="player_id_a"
          placeholder="Buscar jugador A..."
          players={players}
          selectedId={playerIdA}
          onSelectId={setPlayerIdA}
          onCreateNew={() => openGuestModal("playerA")}
        />

        <PlayerSearchSelect
          name="player_id_b"
          placeholder="Buscar jugador B..."
          players={players}
          selectedId={playerIdB}
          onSelectId={setPlayerIdB}
          onCreateNew={() => openGuestModal("playerB")}
        />

        <input
          type="number"
          name="entry_category_int"
          min={1}
          placeholder="Categoría inscripción (opcional)"
          className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
        />

        <button
          disabled={!playerIdA || !playerIdB || playerIdA === playerIdB}
          className={
            playerIdA && playerIdB && playerIdA !== playerIdB
              ? "rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              : "cursor-not-allowed rounded-lg bg-gray-200 px-3 py-2 text-sm font-semibold text-gray-400"
          }
        >
          Inscribir pareja
        </button>
      </form>

      <GuestPlayerModal
        isOpen={isGuestModalOpen && activeSelector !== null}
        onClose={() => {
          setIsGuestModalOpen(false);
          setActiveSelector(null);
        }}
        onSuccess={handleGuestSuccess}
        showCategory
      />
    </>
  );
}
