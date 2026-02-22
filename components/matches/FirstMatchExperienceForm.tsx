"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ClubSelector } from "@/components/clubs/ClubSelector";
import { GuestPlayerModal } from "@/components/players/GuestPlayerModal";
import { PlayerSearchSelect } from "@/components/players/PlayerSearchSelect";
import { createFirstMatchWithResultAsPlayer } from "@/lib/actions/fme.actions";

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function timeMinusMinutes(minutes: number) {
  const d = new Date(Date.now() - minutes * 60 * 1000);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function FirstMatchExperienceForm({
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
  const [hasSet3, setHasSet3] = useState(false);

  useEffect(() => {
    document.cookie = "pasala_fme_seen=1; path=/; max-age=31536000; samesite=lax";
  }, []);

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
  }, [currentPlayerId, partnerId, opp1Id, opp2Id]);

  const otherPlayers = useMemo(() => {
    const filtered = players.filter((p) => p.id !== currentPlayerId);
    return [...filtered].sort((a, b) => {
      let weightA = 0;
      let weightB = 0;
      if (currentPlayerLocation) {
        const sameCityA = (a.city_id && a.city_id === currentPlayerLocation.city_id) || (!a.city_id && a.city && a.city.toLowerCase() === currentPlayerLocation.city?.toLowerCase());
        const sameCityB = (b.city_id && b.city_id === currentPlayerLocation.city_id) || (!b.city_id && b.city && b.city.toLowerCase() === currentPlayerLocation.city?.toLowerCase());
        if (sameCityA) weightA += 100;
        if (a.region_code === currentPlayerLocation.region_code) weightA += 50;
        if (sameCityB) weightB += 100;
        if (b.region_code === currentPlayerLocation.region_code) weightB += 50;
      }
      if (weightA !== weightB) return weightB - weightA;
      const nameA = a.display_name || `${a.first_name} ${a.last_name}`;
      const nameB = b.display_name || `${b.first_name} ${b.last_name}`;
      return nameA.localeCompare(nameB);
    });
  }, [players, currentPlayerId, currentPlayerLocation]);

  const isFormValid = !!partnerId && !!opp1Id && !!opp2Id;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await createFirstMatchWithResultAsPlayer(null, formData);
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
      }
    } catch {
      setError("Ocurrio un error inesperado");
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6 rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-blue-900/5">
        <input type="hidden" name="player_id" value={currentPlayerId} />
        <input type="hidden" name="match_time" value={timeMinusMinutes(5)} />

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <span className="font-bold">{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="date" className="text-xs font-black uppercase tracking-widest text-gray-400">
            Fecha del partido
          </Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={todayIso()}
            max={todayIso()}
            required
            className="rounded-xl border-gray-200"
          />
        </div>

        <ClubSelector currentLocation={currentPlayerLocation} required={false} allowUnlisted />

        <div className="space-y-6 rounded-3xl border border-gray-100 bg-gray-50/50 p-6">
          <h3 className="border-b border-gray-100 pb-3 text-xs font-black uppercase tracking-widest text-gray-400">
            Quienes jugaron
          </h3>

          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <Label className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                  Tu companero
                </Label>
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

            <div className="rounded-2xl border border-red-100 bg-white p-4 shadow-sm space-y-4">
              <Label className="block text-[10px] font-black uppercase tracking-widest text-red-600">Rivales</Label>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase text-gray-400">Rival 1</Label>
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
                <div className="mb-1 flex items-center justify-between">
                  <Label className="text-[10px] font-bold uppercase text-gray-400">Rival 2</Label>
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

        <div className="space-y-4 rounded-3xl border border-gray-100 bg-white p-5">
          <div className="text-center">
            <h3 className="text-sm font-black text-gray-900">Resultado del partido</h3>
            <p className="text-xs text-gray-500">Carga los sets para activar tus metricas y compartir.</p>
          </div>

          <div className="grid grid-cols-3 items-center gap-3 text-center">
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-600">Equipo A</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">Sets</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-red-600">Equipo B</div>
          </div>

          {[
            ["set1_a", "set1_b", "SET 1"],
            ["set2_a", "set2_b", "SET 2"],
          ].map(([a, b, label]) => (
            <div key={label} className="grid grid-cols-3 items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50/50 p-3">
              <Input type="number" name={a} min="0" max="20" required className="text-center text-lg font-black" />
              <div className="text-center text-xs font-black text-gray-300">{label}</div>
              <Input type="number" name={b} min="0" max="20" required className="text-center text-lg font-black" />
            </div>
          ))}

          {!hasSet3 ? (
            <button
              type="button"
              onClick={() => setHasSet3(true)}
              className="w-full rounded-2xl border-2 border-dashed border-gray-200 py-3 text-xs font-bold text-gray-400 hover:border-blue-200 hover:text-blue-600"
            >
              + Agregar Set 3
            </button>
          ) : (
            <div className="grid grid-cols-3 items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/30 p-3">
              <Input type="number" name="set3_a" min="0" max="20" className="text-center text-lg font-black" />
              <div className="text-center text-xs font-black text-blue-300">SET 3</div>
              <Input type="number" name="set3_b" min="0" max="20" className="text-center text-lg font-black" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full rounded-2xl bg-blue-600 py-6 text-xs font-black uppercase tracking-widest text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Guardando primer partido..." : "Guardar mi primer partido"}
          </Button>
          <Link href="/player" className="text-center text-sm font-bold text-gray-400 hover:text-gray-600">
            Ir al dashboard
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

