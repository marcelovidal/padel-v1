"use client";

import { useEffect, useMemo, useState } from "react";

type PlayerOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name?: string | null;
  city?: string | null;
  city_id?: string | null;
  region_code?: string | null;
  region_name?: string | null;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function buildPlayerLabel(player: PlayerOption) {
  const name =
    player.display_name ||
    `${player.first_name || ""} ${player.last_name || ""}`.trim() ||
    "Jugador sin nombre";

  let formattedName = name;
  if (player.first_name && player.last_name) {
    formattedName = `${player.first_name.charAt(0)}.${player.last_name}`;
  }

  const cityLabel = player.city || "";
  const regionLabel = player.region_name || player.region_code || "";

  if (!cityLabel && !regionLabel) return formattedName;
  return `${formattedName} - ${cityLabel}${regionLabel ? ` (${regionLabel})` : ""}`.trim();
}

export function PlayerSearchSelect({
  placeholder,
  required = true,
  name,
  players,
  selectedId,
  onSelectId,
}: {
  placeholder: string;
  required?: boolean;
  name: string;
  players: PlayerOption[];
  selectedId: string;
  onSelectId: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedPlayer = useMemo(
    () => players.find((p) => p.id === selectedId) || null,
    [players, selectedId]
  );

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedPlayer ? buildPlayerLabel(selectedPlayer) : "");
    }
  }, [isOpen, selectedPlayer]);

  const filteredPlayers = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return players.slice(0, 20);

    const qTokens = q.split(/\s+/).filter(Boolean);
    return players
      .filter((player) => {
        const haystack = normalizeText(
          [
            player.display_name || "",
            player.first_name || "",
            player.last_name || "",
            player.city || "",
            player.region_name || "",
            player.region_code || "",
          ].join(" ")
        );
        return qTokens.every((token) => haystack.includes(token));
      })
      .slice(0, 20);
  }, [players, query]);

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selectedId} required={required} />
      <input
        type="text"
        value={query}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          if (!isOpen) setIsOpen(true);
          if (selectedPlayer && next !== buildPlayerLabel(selectedPlayer)) {
            onSelectId("");
          }
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        aria-label={name}
        className="mt-1 w-full p-2.5 bg-gray-50 rounded-xl border border-gray-100 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        autoComplete="off"
      />

      {isOpen && (
        <>
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-100 bg-white shadow-lg">
            {filteredPlayers.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">No se encontraron jugadores</div>
            ) : (
              filteredPlayers.map((player) => (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => {
                    onSelectId(player.id);
                    setQuery(buildPlayerLabel(player));
                    setIsOpen(false);
                  }}
                  className="w-full border-b border-gray-50 px-3 py-2 text-left hover:bg-gray-50 last:border-none"
                >
                  <p className="truncate text-sm font-semibold text-gray-800">
                    {player.display_name || `${player.first_name || ""} ${player.last_name || ""}`.trim()}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {player.city || "Sin ciudad"}
                    {player.region_name ? ` (${player.region_name})` : player.region_code ? ` (${player.region_code})` : ""}
                  </p>
                </button>
              ))
            )}
          </div>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        </>
      )}
    </div>
  );
}
