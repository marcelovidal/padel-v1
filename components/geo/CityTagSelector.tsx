"use client";

import { useEffect, useRef, useState } from "react";
import { X, MapPin, Loader2 } from "lucide-react";

interface CityOption {
  id: string;
  nombre: string;
  provincia: string | null;
}

interface CityTag {
  id: string;
  label: string; // "Ciudad, Provincia"
}

interface CityTagSelectorProps {
  name: string; // hidden input name, value = comma-separated ids
  initialCityIds?: string[]; // pre-loaded city ids (from DB)
  initialCityLabels?: Record<string, string>; // id -> "Ciudad, Provincia" for pre-loaded display
  placeholder?: string;
}

function normalizeText(v: string) {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export function CityTagSelector({
  name,
  initialCityIds = [],
  initialCityLabels = {},
  placeholder = "Buscar ciudad...",
}: CityTagSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState<CityTag[]>(() =>
    initialCityIds.map((id) => ({
      id,
      label: initialCityLabels[id] ?? id,
    }))
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve labels for pre-loaded IDs that don't have a name yet
  useEffect(() => {
    const unresolvedIds = initialCityIds.filter(
      (id) => !initialCityLabels[id]
    );
    if (unresolvedIds.length === 0) return;

    fetch(`/api/geo/cities?ids=${unresolvedIds.join(",")}`)
      .then((r) => r.json())
      .then((cities: { id: string; nombre: string; provincia: string | null }[]) => {
        if (!cities.length) return;
        const byId = new Map(
          cities.map((c) => [
            c.id,
            c.provincia ? `${c.nombre}, ${c.provincia}` : c.nombre,
          ])
        );
        setTags((prev) =>
          prev.map((t) =>
            byId.has(t.id) ? { ...t, label: byId.get(t.id)! } : t
          )
        );
      })
      .catch(() => {/* mantiene el ID como fallback */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geo/cities?q=${encodeURIComponent(query)}`);
        const data: CityOption[] = await res.json();
        // Filter out already-selected cities
        const selectedIds = new Set(tags.map((t) => t.id));
        setResults(data.filter((c) => !selectedIds.has(c.id)));
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tags]);

  function addTag(city: CityOption) {
    const label = city.provincia
      ? `${city.nombre}, ${city.provincia}`
      : city.nombre;
    setTags((prev) => [...prev, { id: city.id, label }]);
    setQuery("");
    setResults([]);
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeTag(id: string) {
    setTags((prev) => prev.filter((t) => t.id !== id));
  }

  const hiddenValue = tags.map((t) => t.id).join(",");

  return (
    <div className="space-y-2">
      {/* Tags display */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800"
            >
              <MapPin className="h-3 w-3 shrink-0" />
              {tag.label}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="ml-0.5 rounded-full p-0.5 text-blue-500 hover:bg-blue-100 hover:text-blue-700 transition-colors"
                aria-label={`Quitar ${tag.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm pr-8 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-gray-400" />
        )}

        {/* Dropdown */}
        {open && results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
            {results.map((city) => (
              <button
                key={city.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent input blur before click
                  addTag(city);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors"
              >
                <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                <span className="font-medium text-gray-900">{city.nombre}</span>
                {city.provincia && (
                  <span className="text-gray-400">{city.provincia}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Click-outside overlay */}
        {open && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
        )}
      </div>

      {tags.length === 0 && (
        <p className="text-[11px] text-gray-400">
          Escribí el nombre de una ciudad para buscarla y agregarla.
        </p>
      )}

      {/* Hidden input with comma-separated ids for form submission */}
      <input type="hidden" name={name} value={hiddenValue} />
    </div>
  );
}
