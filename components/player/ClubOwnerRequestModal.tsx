"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { searchClubsAction } from "@/lib/actions/club.actions";
import { submitClubOwnerRequestAction } from "@/lib/actions/club-owner.actions";

interface ClubResult {
  id: string;
  name: string;
  city?: string | null;
}

export function ClubOwnerRequestModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClubResult[]>([]);
  const [selectedClub, setSelectedClub] = useState<ClubResult | null>(null);
  const [clubNotFound, setClubNotFound] = useState(false);
  const [clubNameInput, setClubNameInput] = useState("");
  const [searching, startSearch] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim() || selectedClub || clubNotFound) {
      setResults([]);
      return;
    }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      startSearch(async () => {
        const res = await searchClubsAction({ query, limit: 8 });
        const clubs = (res as any)?.data ?? (Array.isArray(res) ? res : []);
        setResults(clubs as ClubResult[]);
      });
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, selectedClub, clubNotFound]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData();
    if (selectedClub) {
      fd.set("club_id", selectedClub.id);
    } else if (clubNotFound && clubNameInput.trim()) {
      fd.set("club_name_requested", clubNameInput.trim());
    } else {
      setError("Seleccioná un club o ingresá el nombre.");
      return;
    }
    startSubmit(async () => {
      const result = await submitClubOwnerRequestAction(fd);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-4 bg-black/40">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900">Solicitud enviada</h3>
          <p className="text-sm text-gray-500">
            Vamos a revisar tu solicitud y te notificamos cuando esté aprobada.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Solicitar acceso de club</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Buscador de clubs */}
          {!clubNotFound && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Buscá tu club
              </label>
              {selectedClub ? (
                <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{selectedClub.name}</p>
                    {selectedClub.city && (
                      <p className="text-xs text-gray-500">{selectedClub.city}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedClub(null); setQuery(""); }}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Nombre del club..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
                  />
                  {searching && (
                    <span className="absolute right-3 top-3 text-xs text-gray-400">Buscando...</span>
                  )}
                  {results.length > 0 && (
                    <ul className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      {results.map((club) => (
                        <li key={club.id}>
                          <button
                            type="button"
                            onClick={() => { setSelectedClub(club); setQuery(club.name); setResults([]); }}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                          >
                            <p className="text-sm font-semibold text-gray-900">{club.name}</p>
                            {club.city && <p className="text-xs text-gray-500">{club.city}</p>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Checkbox club no existe */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={clubNotFound}
              onChange={(e) => {
                setClubNotFound(e.target.checked);
                setSelectedClub(null);
                setQuery("");
                setResults([]);
              }}
              className="mt-0.5"
            />
            <span className="text-sm text-gray-600">Mi club no está en PASALA todavía</span>
          </label>

          {/* Input nombre del club si no existe */}
          {clubNotFound && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Nombre de tu club
              </label>
              <input
                type="text"
                value={clubNameInput}
                onChange={(e) => setClubNameInput(e.target.value)}
                placeholder="Ej: Club de Padel San Martín"
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || (!selectedClub && !clubNameInput.trim())}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? "Enviando..." : "Enviar solicitud"}
          </button>
        </form>
      </div>
    </div>
  );
}
