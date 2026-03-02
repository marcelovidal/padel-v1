"use client";

import { useEffect, useMemo, useState } from "react";
import { searchClubsAction, createClubCandidateAction } from "@/lib/actions/club.actions";
import { GeoSelect } from "@/components/geo/GeoSelect";

type ClubOption = {
  id: string;
  name: string;
  city: string | null;
  city_id: string | null;
  region_code: string | null;
  region_name: string | null;
  country_code: string;
  claimed?: boolean;
  claim_status?: "unclaimed" | "pending" | "claimed" | "rejected";
  score?: number;
};

type GeoOption = {
  id: string;
  nombre: string;
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

function isUnclaimedClub(club: ClubOption) {
  if (typeof club.claimed === "boolean") return !club.claimed;
  return club.claim_status !== "claimed";
}

function ClaimBadge({ club }: { club: ClubOption }) {
  if (isUnclaimedClub(club)) {
    return (
      <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        Club sin reclamar
      </span>
    );
  }
  return null;
}

export function ClubSelector({
  currentLocation,
  initialClub = null,
  required = true,
}: ClubSelectorProps) {
  const [query, setQuery] = useState(initialClub?.name || "");
  const [queryBeforeSelection, setQueryBeforeSelection] = useState(initialClub?.name || "");
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
          claimed: initialClub.claim_status === "claimed",
        }
      : null
  );
  const [results, setResults] = useState<ClubOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      const response = await searchClubsAction({ query, limit: 8 });
      if (response.success) {
        setResults((response.data as ClubOption[]) || []);
      } else {
        setResults([]);
      }
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [query]);

  function handleSelectClub(club: ClubOption) {
    setQueryBeforeSelection(query.trim() || club.name);
    setSelectedClub(club);
    setQuery(club.name);
    setError(null);
  }

  useEffect(() => {
    if (!selectedClub) return;
    if (query.trim().toLowerCase() !== selectedClub.name.toLowerCase()) {
      setSelectedClub(null);
      setQueryBeforeSelection(query.trim());
    }
  }, [query, selectedClub]);

  const rawClubName = useMemo(() => (selectedClub ? selectedClub.name : ""), [selectedClub]);
  const rawQuery = useMemo(() => {
    if (selectedClub) return queryBeforeSelection || selectedClub.name;
    return query.trim();
  }, [query, queryBeforeSelection, selectedClub]);

  return (
    <div className="space-y-2">
      <label htmlFor="club_search" className="text-xs font-black uppercase tracking-widest text-gray-400">
        Club / Lugar
      </label>

      <input type="hidden" name="club_id" value={selectedClub?.id || ""} />
      <input type="hidden" name="club_name" value={rawClubName} required={required} />
      <input type="hidden" name="club_query_raw" value={rawQuery} />

      <input
        id="club_search"
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Busca un club por nombre"
        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        required={required}
      />

      {selectedClub && (
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-blue-900 truncate">{selectedClub.name}</p>
            <p className="text-xs text-blue-700 truncate">
              {selectedClub.city || "Sin ciudad"}
              {selectedClub.region_name
                ? ` (${selectedClub.region_name})`
                : selectedClub.region_code
                  ? ` (${selectedClub.region_code})`
                  : ""}
            </p>
          </div>
          <ClaimBadge club={selectedClub} />
        </div>
      )}

      {!selectedClub && (query.trim().length > 0 || loading) && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm max-h-56 overflow-auto">
          {loading && <p className="px-3 py-2 text-xs text-gray-500">Buscando clubes...</p>}
          {!loading && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500">
              No encontramos resultados. Usa “No encuentro mi club” para crearlo y seleccionarlo.
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
                  <ClaimBadge club={club} />
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {club.city || "Sin ciudad"}
                  {club.region_name ? ` (${club.region_name})` : club.region_code ? ` (${club.region_code})` : ""}
                </p>
              </button>
            ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="text-xs font-bold text-blue-700 hover:text-blue-800 underline underline-offset-2"
        >
          No encuentro mi club
        </button>
      </div>

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      {showCreateModal && (
        <CreateClubCandidateModal
          defaultName={query}
          currentLocation={currentLocation}
          onClose={() => setShowCreateModal(false)}
          onCreated={(club) => {
            setSelectedClub(club);
            setQuery(club.name);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
}

function CreateClubCandidateModal({
  defaultName,
  currentLocation,
  onClose,
  onCreated,
}: {
  defaultName: string;
  currentLocation?: {
    city?: string;
    city_id?: string;
    region_code?: string;
    region_name?: string;
  };
  onClose: () => void;
  onCreated: (club: ClubOption) => void;
}) {
  const [name, setName] = useState(defaultName || "");
  const [address, setAddress] = useState("");
  const [courtsCount, setCourtsCount] = useState("");
  const [surfaceTypes, setSurfaceTypes] = useState<Record<string, boolean>>({
    blindex: false,
    cesped_sintetico: false,
    cemento: false,
    ladrillo: false,
  });
  const [responsibleFirstName, setResponsibleFirstName] = useState("");
  const [responsibleLastName, setResponsibleLastName] = useState("");
  const [responsiblePhone, setResponsiblePhone] = useState("");
  const [responsibleEmail, setResponsibleEmail] = useState("");
  const [regionOptions, setRegionOptions] = useState<GeoOption[]>([]);
  const [cityOptions, setCityOptions] = useState<GeoOption[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<GeoOption | null>(null);
  const [selectedCity, setSelectedCity] = useState<GeoOption | null>(null);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let canceled = false;
    async function loadRegions() {
      setLoadingRegions(true);
      try {
        const response = await fetch("/api/geo/provincias", { cache: "no-store" });
        const data = (await response.json()) as GeoOption[];
        if (!canceled) {
          setRegionOptions(data || []);
          if (currentLocation?.region_code) {
            const found = (data || []).find((r) => r.id === currentLocation.region_code) || null;
            setSelectedRegion(found);
          }
        }
      } catch {
        if (!canceled) setRegionOptions([]);
      } finally {
        if (!canceled) setLoadingRegions(false);
      }
    }
    loadRegions();
    return () => {
      canceled = true;
    };
  }, [currentLocation?.region_code]);

  useEffect(() => {
    let canceled = false;
    async function loadCities(regionCode: string) {
      setLoadingCities(true);
      try {
        const response = await fetch(`/api/geo/localidades?provinciaId=${encodeURIComponent(regionCode)}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as GeoOption[];
        if (!canceled) {
          setCityOptions(data || []);
          if (currentLocation?.city_id) {
            const found = (data || []).find((c) => c.id === currentLocation.city_id) || null;
            setSelectedCity(found);
          }
        }
      } catch {
        if (!canceled) setCityOptions([]);
      } finally {
        if (!canceled) setLoadingCities(false);
      }
    }

    if (selectedRegion?.id) {
      loadCities(selectedRegion.id);
    } else {
      setCityOptions([]);
      setSelectedCity(null);
    }

    return () => {
      canceled = true;
    };
  }, [selectedRegion?.id, currentLocation?.city_id]);

  async function handleCreate() {
    setError(null);
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Ingresa el nombre del club.");
      return;
    }
    if (!courtsCount || Number(courtsCount) <= 0) {
      setError("La cantidad de canchas es obligatoria y debe ser mayor a 0.");
      return;
    }
    if (!Object.values(surfaceTypes).some(Boolean)) {
      setError("Selecciona al menos un tipo de superficie.");
      return;
    }

    setSubmitting(true);
    const response = await createClubCandidateAction({
      name: trimmedName,
      country_code: "AR",
      region_code: selectedRegion?.id || currentLocation?.region_code || undefined,
      region_name: selectedRegion?.nombre || currentLocation?.region_name || undefined,
      city: selectedCity?.nombre || currentLocation?.city || undefined,
      city_id: selectedCity?.id || currentLocation?.city_id || undefined,
      address: address.trim() || undefined,
      courts_count: Number(courtsCount),
      surface_types: surfaceTypes,
      responsible_first_name: responsibleFirstName.trim() || undefined,
      responsible_last_name: responsibleLastName.trim() || undefined,
      responsible_phone: responsiblePhone.trim() || undefined,
      responsible_email: responsibleEmail.trim() || undefined,
    });
    setSubmitting(false);

    if (!response.success) {
      setError(response.error || "No se pudo crear el club.");
      return;
    }

    const club = response.data;
    onCreated({
      id: club.id,
      name: club.name,
      city: club.city,
      city_id: club.city_id,
      region_code: club.region_code,
      region_name: club.region_name,
      country_code: club.country_code,
      claimed: !!club.claimed,
      claim_status: club.claim_status,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-gray-200">
        <div className="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h3 className="text-base font-black text-gray-900">Crear club candidato</h3>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-gray-500 hover:text-gray-700">
            Cerrar
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nombre</label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                placeholder="Ej: Club Palau"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Direccion</label>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                placeholder="Calle y altura"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GeoSelect
              label="Provincia"
              placeholder="Selecciona provincia"
              options={regionOptions}
              value={selectedRegion?.id}
              onChange={(option) => setSelectedRegion(option)}
              isLoading={loadingRegions}
            />
            <GeoSelect
              label="Localidad"
              placeholder="Selecciona localidad"
              options={cityOptions}
              value={selectedCity?.id}
              onChange={(option) => setSelectedCity(option)}
              isLoading={loadingCities}
              disabled={!selectedRegion}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Cantidad de canchas</label>
              <input
                value={courtsCount}
                onChange={(event) => setCourtsCount(event.target.value.replace(/[^\d]/g, ""))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                placeholder="Ej: 4"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Superficies</label>
              <div className="grid grid-cols-2 gap-2 rounded-xl border border-gray-200 p-3">
                {Object.entries({
                  blindex: "Blindex",
                  cesped_sintetico: "Cesped sintetico",
                  cemento: "Cemento",
                  ladrillo: "Ladrillo",
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-xs font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={!!surfaceTypes[key]}
                      onChange={(event) =>
                        setSurfaceTypes((prev) => ({ ...prev, [key]: event.target.checked }))
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Nombre responsable</label>
              <input
                value={responsibleFirstName}
                onChange={(event) => setResponsibleFirstName(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Apellido responsable</label>
              <input
                value={responsibleLastName}
                onChange={(event) => setResponsibleLastName(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Telefono responsable</label>
              <input
                value={responsiblePhone}
                onChange={(event) => setResponsiblePhone(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400">Email responsable</label>
              <input
                value={responsibleEmail}
                onChange={(event) => setResponsibleEmail(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={submitting}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? "Creando..." : "Crear y seleccionar"}
          </button>
        </div>
      </div>
    </div>
  );
}
