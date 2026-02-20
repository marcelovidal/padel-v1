"use client";

import { useEffect, useState } from "react";
import { searchClubsAction } from "@/lib/actions/club.actions";

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
  allowUnlisted?: boolean;
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

export function ClubSelector({
  currentLocation,
  initialClub = null,
  required = true,
  allowUnlisted = false,
}: ClubSelectorProps) {
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      const response = await searchClubsAction({ query, limit: 8 });
      if (response.success) {
        setResults((response.data as ClubOption[]).filter((club) => club.claim_status === "claimed"));
      } else {
        setResults([]);
      }
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [query]);

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
      <input
        type="hidden"
        name="club_name"
        value={selectedClub?.name || (allowUnlisted ? query.trim() : "")}
        required={required}
      />

      <input
        id="club_search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Busca un club publicado"
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        required={required}
      />

      {selectedClub && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-blue-900 truncate">{selectedClub.name}</p>
          {claimBadge(selectedClub.claim_status)}
        </div>
      )}

      {!selectedClub && (query.trim().length > 0 || loading) && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm max-h-56 overflow-auto">
          {loading && <p className="px-3 py-2 text-xs text-gray-500">Buscando clubes...</p>}
          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500">
              {allowUnlisted
                ? "No encontramos clubes publicados. Puedes continuar con el nombre escrito y lo propondremos para validacion."
                : "No encontramos clubes publicados. Si tu club no aparece, solicita su alta desde el acceso de Club."}
            </p>
          )}
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

      {allowUnlisted && !selectedClub && query.trim().length >= 3 && (
        <p className="text-xs text-amber-700">
          Se creara el partido con este nombre y enviaremos una propuesta de club para revision.
        </p>
      )}

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
