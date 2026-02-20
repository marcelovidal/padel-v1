"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { GuestPlayerModal } from "@/components/players/GuestPlayerModal";
import { ClubSelector } from "@/components/clubs/ClubSelector";
import { createMatchAsPlayer } from "@/lib/actions/player-match.actions";
import { createClubAction } from "@/lib/actions/club.actions";

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

export function CreateMatchForm({
  currentPlayerId,
  currentPlayerLocation,
  availablePlayers: initialPlayers,
}: {
  currentPlayerId: string;
  currentPlayerLocation?: { city?: string; city_id?: string; region_code?: string; region_name?: string };
  availablePlayers: PlayerOption[];
}) {
  const router = useRouter();
  const [players, setPlayers] = useState(initialPlayers);
  const [partnerId, setPartnerId] = useState("");
  const [opp1Id, setOpp1Id] = useState("");
  const [opp2Id, setOpp2Id] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSelector, setActiveSelector] = useState<"partner" | "opp1" | "opp2" | null>(null);

  const openModal = (selector: "partner" | "opp1" | "opp2") => {
    setActiveSelector(selector);
    setIsModalOpen(true);
  };

  const handleGuestSuccess = (newId: string, displayName: string) => {
    const newPlayer = {
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
  }, [partnerId, opp1Id, opp2Id, currentPlayerId]);

  const isFormValid =
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

      const nameA = a.display_name || `${a.first_name} ${a.last_name}`;
      const nameB = b.display_name || `${b.first_name} ${b.last_name}`;
      return nameA.localeCompare(nameB);
    });
  }, [players, currentPlayerId, currentPlayerLocation]);

  const getPlayerLabel = (p: PlayerOption) => {
    const name = p.display_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Jugador sin nombre";

    let formattedName = name;
    if (p.first_name && p.last_name) {
      formattedName = `${p.first_name.charAt(0)}.${p.last_name}`;
    }

    const cityLabel = p.city || "";
    const regionLabel = p.region_name || p.region_code || "";

    if (!cityLabel && !regionLabel) return formattedName;

    return `${formattedName} - ${cityLabel}${regionLabel ? ` (${regionLabel})` : ""}`.trim();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const rawClubName = String(formData.get("club_name") || "").trim();
    const rawClubId = String(formData.get("club_id") || "").trim();

    if (!rawClubName && !rawClubId) {
      setError("Selecciona o crea un club antes de guardar el partido.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (!rawClubId && rawClubName) {
        const createdClub = await createClubAction({
          name: rawClubName,
          country_code: "AR",
          city: currentPlayerLocation?.city,
          city_id: currentPlayerLocation?.city_id,
          region_code: currentPlayerLocation?.region_code,
          region_name: currentPlayerLocation?.region_name,
        });

        if (!createdClub.success) {
          setError(createdClub.error);
          setIsSubmitting(false);
          return;
        }

        formData.set("club_id", createdClub.data.id);
        formData.set("club_name", createdClub.data.name);
      }

      const result = await createMatchAsPlayer(null, formData);
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
      } else {
        router.push("/player/matches");
        router.refresh();
      }
    } catch {
      setError("Ocurrio un error inesperado");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="space-y-6 max-w-lg mx-auto bg-white p-6 rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100"
      >
        <input type="hidden" name="player_id" value={currentPlayerId} />

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-bold">{error}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-xs font-black uppercase tracking-widest text-gray-400">
              Fecha
            </Label>
            <Input type="date" id="date" name="date" required className="rounded-xl border-gray-200 focus:ring-blue-500" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time" className="text-xs font-black uppercase tracking-widest text-gray-400">
              Hora
            </Label>
            <Input type="time" id="time" name="time" required className="rounded-xl border-gray-200 focus:ring-blue-500" />
          </div>
        </div>

        <ClubSelector currentLocation={currentPlayerLocation} required />

        <div className="space-y-6 bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 border-b border-gray-100 pb-3">Formacion de Equipos</h3>

          <div className="space-y-4">
            <div className="p-4 bg-white rounded-2xl border border-blue-100 shadow-sm">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600">Tu Companero (Equipo A)</Label>
                <button type="button" onClick={() => openModal("partner")} className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase">
                  + Nuevo
                </button>
              </div>
              <select
                name="partner_id"
                className="w-full p-2.5 bg-gray-50 rounded-xl border-gray-100 text-sm font-medium focus:ring-blue-500 focus:border-blue-500"
                required
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
              >
                <option value="">Selecciona companero</option>
                {otherPlayers
                  .filter((p) => !selectedIds.has(p.id) || p.id === partnerId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {getPlayerLabel(p)}
                    </option>
                  ))}
              </select>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-red-100 shadow-sm space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-red-600 block mb-2">Rivales (Equipo B)</Label>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Rival 1</Label>
                    <button type="button" onClick={() => openModal("opp1")} className="text-[10px] font-bold text-red-400 hover:text-red-700 uppercase">
                      + Nuevo
                    </button>
                  </div>
                  <select
                    name="opponent1_id"
                    className="w-full mt-1 p-2.5 bg-gray-50 rounded-xl border-gray-100 text-sm font-medium focus:ring-red-500 focus:border-red-500"
                    required
                    value={opp1Id}
                    onChange={(e) => setOpp1Id(e.target.value)}
                  >
                    <option value="">Selecciona rival 1</option>
                    {otherPlayers
                      .filter((p) => !selectedIds.has(p.id) || p.id === opp1Id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {getPlayerLabel(p)}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-[10px] font-bold text-gray-400 uppercase">Rival 2</Label>
                    <button type="button" onClick={() => openModal("opp2")} className="text-[10px] font-bold text-red-400 hover:text-red-700 uppercase">
                      + Nuevo
                    </button>
                  </div>
                  <select
                    name="opponent2_id"
                    className="w-full mt-1 p-2.5 bg-gray-50 rounded-xl border-gray-100 text-sm font-medium focus:ring-red-500 focus:border-red-500"
                    required
                    value={opp2Id}
                    onChange={(e) => setOpp2Id(e.target.value)}
                  >
                    <option value="">Selecciona rival 2</option>
                    {otherPlayers
                      .filter((p) => !selectedIds.has(p.id) || p.id === opp2Id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {getPlayerLabel(p)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full py-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? "Creando..." : "Crear Partido"}
          </Button>
          <Link href="/player/matches" className="text-center text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>

      <GuestPlayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleGuestSuccess}
        defaultLocation={currentPlayerLocation}
      />
    </>
  );
}
