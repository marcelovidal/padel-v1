"use client";

import { useState, useRef, useEffect } from "react";

type Option = {
  id: string;
  display_name: string;
  city: string | null;
};

export function TeammateCombobox({ options }: { options: Option[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered =
    query.length === 0
      ? []
      : options
          .filter((o) =>
            o.display_name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 8);

  function select(option: Option) {
    setSelectedId(option.id);
    setQuery(option.display_name + (option.city ? ` — ${option.city}` : ""));
    setOpen(false);
  }

  function clear() {
    setSelectedId("");
    setQuery("");
    setOpen(false);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      {/* hidden field submitted with the form */}
      <input type="hidden" name="teammate_player_id" value={selectedId} />

      <div className="relative flex items-center">
        <input
          type="text"
          autoComplete="off"
          placeholder="Buscar jugador por nombre…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedId(""); // clear selection when user types again
            setOpen(true);
          }}
          onFocus={() => {
            if (query.length > 0) setOpen(true);
          }}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 pr-8 text-sm focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
        {selectedId || query ? (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 text-gray-400 hover:text-gray-600"
            tabIndex={-1}
          >
            ✕
          </button>
        ) : null}
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.map((o) => (
            <li
              key={o.id}
              onMouseDown={() => select(o)}
              className="flex cursor-pointer flex-col px-3 py-2 hover:bg-blue-50"
            >
              <span className="text-sm font-medium text-gray-800">{o.display_name}</span>
              {o.city && (
                <span className="text-xs text-gray-400">{o.city}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {open && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm text-gray-400 shadow-lg">
          Sin resultados para &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
