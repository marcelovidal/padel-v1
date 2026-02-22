"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { updateMatchAsPlayer } from "@/lib/actions/player-match.actions";
import { GuestPlayerModal } from "@/components/players/GuestPlayerModal";
import { PlayerSearchSelect } from "@/components/players/PlayerSearchSelect";
import { Label } from "@/components/ui/label";

interface EditMatchFormProps {
  match: {
    id: string;
    match_at: string;
    club_name: string;
    club_id?: string | null;
    notes: string | null;
  };
  currentPlayerId: string;
  currentPlayerLocation?: { city?: string; city_id?: string; region_code?: string; region_name?: string };
  availablePlayers: PlayerOption[];
  initialRoster: {
    partnerId: string;
    opponent1Id: string;
    opponent2Id: string;
  };
}

interface PlayerOption {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name?: string | null;
  city?: string | null;
  city_id?: string | null;
  region_code?: string | null;
  region_name?: string | null;
}

export function EditMatchForm({
  match,
  currentPlayerId,
  currentPlayerLocation,
  availablePlayers: initialPlayers,
  initialRoster,
}: EditMatchFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState(initialPlayers);
  const [partnerId, setPartnerId] = useState(initialRoster.partnerId);
  const [opp1Id, setOpp1Id] = useState(initialRoster.opponent1Id);
  const [opp2Id, setOpp2Id] = useState(initialRoster.opponent2Id);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSelector, setActiveSelector] = useState<"partner" | "opp1" | "opp2" | null>(null);

  const matchDate = new Date(match.match_at).toISOString().split("T")[0];
  const matchTime = new Date(match.match_at).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasLinkedClub = !!match.club_id;

  const openModal = (selector: "partner" | "opp1" | "opp2") => {
    setActiveSelector(selector);
    setIsModalOpen(true);
  };

  const handleGuestSuccess = (newId: string, displayName: string) => {
    const newPlayer: PlayerOption = {
      id: newId,
      first_name: displayName.split(" ")[0] || "",
      last_name: displayName.split(" ").slice(1).join(" ") || "",
      display_name: displayName,
    };

    setPlayers((prev) => [newPlayer, ...prev]);

    if (activeSelector === "partner") setPartnerId(newId);
    if (activeSelector === "opp1") setOpp1Id(newId);
    if (activeSelector === "opp2") setOpp2Id(newId);
  };

  const selectedIds = useMemo(() => {
    const ids = new Set([currentPlayerId]);
    if (partnerId) ids.add(partnerId);
    if (opp1Id) ids.add(opp1Id);
    if (opp2Id) ids.add(opp2Id);
    return ids;
  }, [currentPlayerId, partnerId, opp1Id, opp2Id]);

  const isRosterValid =
    !!partnerId && !!opp1Id && !!opp2Id && partnerId !== opp1Id && partnerId !== opp2Id && opp1Id !== opp2Id;

  const otherPlayers = useMemo(() => {
    const filtered = players.filter((p) => p.id !== currentPlayerId);

    return [...filtered].sort((a, b) => {
      let weightA = 0;
      let weightB = 0;

      if (currentPlayerLocation) {
        const sameCityId = a.city_id && a.city_id === currentPlayerLocation.city_id;
        const sameCityName = !a.city_id && a.city && a.city.toLowerCase() === currentPlayerLocation.city?.toLowerCase();
        if (sameCityId || sameCityName) weightA += 100;
        if (a.region_code === currentPlayerLocation.region_code) weightA += 50;

        const sameCityIdB = b.city_id && b.city_id === currentPlayerLocation.city_id;
        const sameCityNameB = !b.city_id && b.city && b.city.toLowerCase() === currentPlayerLocation.city?.toLowerCase();
        if (sameCityIdB || sameCityNameB) weightB += 100;
        if (b.region_code === currentPlayerLocation.region_code) weightB += 50;
      }

      if (weightA !== weightB) return weightB - weightA;

      const nameA = a.display_name || `${a.first_name} ${a.last_name}`.trim();
      const nameB = b.display_name || `${b.first_name} ${b.last_name}`.trim();
      return nameA.localeCompare(nameB);
    });
  }, [players, currentPlayerId, currentPlayerLocation]);

  const handleSubmit = async (formData: FormData) => {
    if (!isRosterValid) {
      setError("Completa companero y rivales sin repetir jugadores");
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      const result = await updateMatchAsPlayer(match.id, formData);
      if (result?.error) {
        setError(result.error);
        setIsPending(false);
      }
    } catch {
      setError("Error inesperado al actualizar el partido");
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">{error}</div>
        )}

        <form action={handleSubmit} className="space-y-6">
          <input type="hidden" name="club_id" value={match.club_id || ""} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Fecha</label>
              <input
                type="date"
                name="date"
                defaultValue={matchDate}
                required
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Hora</label>
              <input
                type="time"
                name="time"
                defaultValue={matchTime}
                required
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Club / Lugar</label>
            <input
              type="text"
              name="club_name"
              defaultValue={match.club_name}
              required
              readOnly={hasLinkedClub}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all read-only:opacity-80"
            />
            {hasLinkedClub && (
              <p className="mt-2 text-xs text-gray-500">Este partido esta vinculado a un club del directorio. Edicion de club desde este formulario no habilitada.</p>
            )}
          </div>

          <div className="space-y-4 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Formacion de equipos</h3>
              <span className="text-[10px] font-semibold text-gray-400">Puedes corregir companero y rivales</span>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-blue-100 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600">Tu Companero (Equipo A)</Label>
                <button
                  type="button"
                  onClick={() => openModal("partner")}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-blue-700 hover:bg-blue-100"
                >
                  <span className="text-xs leading-none">+</span>
                  Cargar invitado
                </button>
              </div>
              <PlayerSearchSelect
                name="partner_id"
                placeholder="Escribe nombre, apellido o ciudad"
                required
                selectedId={partnerId}
                onSelectId={setPartnerId}
                players={otherPlayers.filter((p) => !selectedIds.has(p.id) || p.id === partnerId)}
              />
            </div>

            <div className="p-4 bg-white rounded-2xl border border-red-100 shadow-sm space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-red-600 block mb-2">Rivales (Equipo B)</Label>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Rival 1</Label>
                    <button
                      type="button"
                      onClick={() => openModal("opp1")}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700 hover:bg-red-100"
                    >
                      <span className="text-xs leading-none">+</span>
                      Cargar invitado
                    </button>
                  </div>
                  <PlayerSearchSelect
                    name="opponent1_id"
                    placeholder="Escribe nombre, apellido o ciudad"
                    required
                    selectedId={opp1Id}
                    onSelectId={setOpp1Id}
                    players={otherPlayers.filter((p) => !selectedIds.has(p.id) || p.id === opp1Id)}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Rival 2</Label>
                    <button
                      type="button"
                      onClick={() => openModal("opp2")}
                      className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-red-700 hover:bg-red-100"
                    >
                      <span className="text-xs leading-none">+</span>
                      Cargar invitado
                    </button>
                  </div>
                  <PlayerSearchSelect
                    name="opponent2_id"
                    placeholder="Escribe nombre, apellido o ciudad"
                    required
                    selectedId={opp2Id}
                    onSelectId={setOpp2Id}
                    players={otherPlayers.filter((p) => !selectedIds.has(p.id) || p.id === opp2Id)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Notas (opcional)</label>
            <textarea
              name="notes"
              defaultValue={match.notes || ""}
              rows={3}
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={isPending || !isRosterValid}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar Cambios"}
            </button>
            <Link
              href={`/player/matches/${match.id}`}
              className="flex-1 bg-white text-gray-600 font-bold py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-center transition-all"
            >
              Cancelar
            </Link>
          </div>
        </form>
      </div>

      <GuestPlayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleGuestSuccess}
        defaultLocation={currentPlayerLocation}
      />
    </>
  );
}
