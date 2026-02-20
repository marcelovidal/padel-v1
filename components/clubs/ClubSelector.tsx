"use client";

import { useEffect, useMemo, useState } from "react";
import { createClubAction, searchClubsAction } from "@/lib/actions/club.actions";

type ClubOption = {
  id: string;
  name: string;
  city: string | null;
  city_id: string | null;
  region_code: string | null;
  region_name: string | null;
  country_code: string;
  claim_status: "unclaimed" | "pending" | "claimed" | "rejected";
  score?: number;
};

interface ClubSelectorProps {
  currentLocation?: {
    city?: string;
    city_id?: string;
    region_code?: string;
    region_name?: string;
  };
  initialClub?: { id: string; name: string; claim_status?: ClubOption["claim_status"] } | null;
  required?: boolean;
}

function claimBadge(status: ClubOption["claim_status"]) {
  if (status === "unclaimed") {
    return <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">Reclamable</span>;
  }
  if (status === "pending") {
    return <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">En revision</span>;
  }
  return null;
}

export function ClubSelector({ currentLocation, initialClub = null, required = true }: ClubSelectorProps) {
  const [query, setQuery] = useState(initialClub?.name || "");
  const [selectedClub, setSelectedClub] = useState<ClubOption | null>(
    initialClub
      ? {
          id: initialClub.id,
          name: initialClub.name,
          city: currentLocation?.city || null,
          city_id: currentLocation?.city_id || null,
          region_code: currentLocation?.region_code || null,
          region_name: currentLocation?.region_name || null,
          country_code: "AR",
          claim_status: initialClub.claim_status || "unclaimed",
        }
      : null
  );
  const [results, setResults] = useState<ClubOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = useMemo(() => {
    const text = query.trim();
    if (text.length < 2) return false;
    return !results.some((club) => club.name.toLowerCase() === text.toLowerCase());
  }, [query, results]);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      const response = await searchClubsAction({ query, limit: 8 });
      if (response.success) {
        setResults(response.data as ClubOption[]);
      } else {
        setResults([]);
      }
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [query]);

  async function handleCreateClub() {
    const name = query.trim();
    if (!name) return;

    setCreating(true);
    setError(null);

    const result = await createClubAction({
      name,
      country_code: "AR",
      city: currentLocation?.city,
      city_id: currentLocation?.city_id,
      region_code: currentLocation?.region_code,
      region_name: currentLocation?.region_name,
    });

    setCreating(false);

    if (!result.success) {
      setError(result.error);
      return;
    }

    const club = result.data;
    const selected: ClubOption = {
      id: club.id,
      name: club.name,
      city: club.city,
      city_id: club.city_id,
      region_code: club.region_code,
      region_name: club.region_name,
      country_code: club.country_code,
      claim_status: club.claim_status,
    };

    setSelectedClub(selected);
    setQuery(selected.name);
    setResults((prev) => [selected, ...prev.filter((c) => c.id !== selected.id)]);
  }

  function handleSelectClub(club: ClubOption) {
    setSelectedClub(club);
    setQuery(club.name);
    setError(null);
  }

  useEffect(() => {
    if (!selectedClub) return;
    if (query.trim().toLowerCase() !== selectedClub.name.toLowerCase()) {
      setSelectedClub(null);
    }
  }, [query, selectedClub]);

  return (
    <div className="space-y-2">
      <label htmlFor="club_search" className="text-xs font-black uppercase tracking-widest text-gray-400">
        Club / Lugar
      </label>

      <input type="hidden" name="club_id" value={selectedClub?.id || ""} />
      <input type="hidden" name="club_name" value={selectedClub?.name || query.trim()} required={required} />

      <div className="flex gap-2">
        <input
          id="club_search"
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca un club existente"
          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          required={required}
        />
        <button
          type="button"
          onClick={handleCreateClub}
          disabled={!canCreate || creating}
          className="whitespace-nowrap rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black uppercase tracking-wider text-blue-700 disabled:opacity-50"
        >
          {creating ? "Creando..." : "Crear club"}
        </button>
      </div>

      {selectedClub && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-blue-900 truncate">{selectedClub.name}</p>
          {claimBadge(selectedClub.claim_status)}
        </div>
      )}

      {!selectedClub && (query.trim().length > 0 || loading) && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm max-h-56 overflow-auto">
          {loading && <p className="px-3 py-2 text-xs text-gray-500">Buscando clubes...</p>}
          {!loading && results.length === 0 && <p className="px-3 py-2 text-xs text-gray-500">No encontramos clubes. Crea uno nuevo.</p>}
          {!loading &&
            results.map((club) => (
              <button
                key={club.id}
                type="button"
                onClick={() => handleSelectClub(club)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-50 last:border-none"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800 truncate">{club.name}</p>
                  {claimBadge(club.claim_status)}
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {club.city || "Sin ciudad"}
                  {club.region_name ? ` (${club.region_name})` : club.region_code ? ` (${club.region_code})` : ""}
                </p>
              </button>
            ))}
        </div>
      )}

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
