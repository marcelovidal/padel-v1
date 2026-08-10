"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { completeMatchRoster } from "@/lib/actions/player-match.actions";
import { GuestPlayerModal } from "@/components/players/GuestPlayerModal";
import { PlayerSearchSelect } from "@/components/players/PlayerSearchSelect";
import { Label } from "@/components/ui/label";

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

interface RosterMember {
  playerId: string;
  name: string;
  isMe: boolean;
}

interface CompleteRosterFormProps {
  matchId: string;
  teamA: RosterMember[];
  teamB: RosterMember[];
  missingPlayers: number;
  availablePlayers: PlayerOption[];
  currentPlayerLocation?: {
    city?: string;
    city_id?: string;
    region_code?: string;
    region_name?: string;
  };
}

type SlotKey = `A${number}` | `B${number}`;

export function CompleteRosterForm({
  matchId,
  teamA,
  teamB,
  missingPlayers,
  availablePlayers: initialPlayers,
  currentPlayerLocation,
}: CompleteRosterFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState(initialPlayers);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<string | null>(null);

  // Un partido es 2 vs 2: cada equipo abre tantas ranuras como le falten.
  const openSlots = useMemo(() => {
    const slots: Array<{ key: SlotKey; team: "A" | "B"; label: string }> = [];
    for (let i = 0; i < 2 - teamA.length; i++) {
      slots.push({ key: `A${i}`, team: "A", label: teamA.length === 0 && i === 0 ? "Equipo A" : "Equipo A" });
    }
    for (let i = 0; i < 2 - teamB.length; i++) {
      slots.push({ key: `B${i}`, team: "B", label: "Equipo B" });
    }
    return slots;
  }, [teamA.length, teamB.length]);

  const rosterIds = useMemo(
    () => new Set([...teamA, ...teamB].map((m) => m.playerId)),
    [teamA, teamB]
  );

  const selectedIds = useMemo(() => {
    const ids = new Set<string>(rosterIds);
    Object.values(selection).forEach((id) => {
      if (id) ids.add(id);
    });
    return ids;
  }, [rosterIds, selection]);

  const filledCount = Object.values(selection).filter(Boolean).length;
  const canSubmit = filledCount > 0 && filledCount <= missingPlayers && !isPending;

  const setSlot = (key: string, playerId: string) => {
    setSelection((prev) => ({ ...prev, [key]: playerId }));
  };

  const openModal = (key: string) => {
    setActiveSlot(key);
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
    if (activeSlot) setSlot(activeSlot, newId);
  };

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      let weightA = 0;
      let weightB = 0;

      if (currentPlayerLocation) {
        const sameCityIdA = a.city_id && a.city_id === currentPlayerLocation.city_id;
        const sameCityNameA =
          !a.city_id && a.city && a.city.toLowerCase() === currentPlayerLocation.city?.toLowerCase();
        if (sameCityIdA || sameCityNameA) weightA += 100;
        if (a.region_code === currentPlayerLocation.region_code) weightA += 50;

        const sameCityIdB = b.city_id && b.city_id === currentPlayerLocation.city_id;
        const sameCityNameB =
          !b.city_id && b.city && b.city.toLowerCase() === currentPlayerLocation.city?.toLowerCase();
        if (sameCityIdB || sameCityNameB) weightB += 100;
        if (b.region_code === currentPlayerLocation.region_code) weightB += 50;
      }

      if (weightA !== weightB) return weightB - weightA;

      const nameA = a.display_name || `${a.first_name} ${a.last_name}`.trim();
      const nameB = b.display_name || `${b.first_name} ${b.last_name}`.trim();
      return nameA.localeCompare(nameB);
    });
  }, [players, currentPlayerLocation]);

  const optionsForSlot = (key: string) =>
    sortedPlayers.filter((p) => !selectedIds.has(p.id) || p.id === selection[key]);

  const handleSubmit = async (formData: FormData) => {
    if (filledCount === 0) {
      setError("Elegi al menos un jugador para agregar.");
      return;
    }
    if (filledCount > missingPlayers) {
      setError(
        missingPlayers === 1
          ? "Solo falta 1 jugador en este partido."
          : `Solo faltan ${missingPlayers} jugadores en este partido.`
      );
      return;
    }

    setIsPending(true);
    setError(null);
    try {
      const result = await completeMatchRoster(matchId, formData);
      if (result?.error) {
        setError(result.error);
        setIsPending(false);
      }
    } catch {
      setError("Error inesperado al completar el partido");
      setIsPending(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">
              Ya estan cargados
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RosterColumn title="Equipo A" accent="blue" members={teamA} />
              <RosterColumn title="Equipo B" accent="red" members={teamB} />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
                Jugadores que faltan
              </h3>
              <span className="text-[10px] font-semibold text-gray-400">
                {filledCount} de {missingPlayers} elegidos
              </span>
            </div>

            {openSlots.map((slot, index) => (
              <div
                key={slot.key}
                className={`p-4 bg-white rounded-2xl border shadow-sm ${
                  slot.team === "A" ? "border-blue-100" : "border-red-100"
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <Label
                    className={`text-[10px] font-black uppercase tracking-widest ${
                      slot.team === "A" ? "text-blue-600" : "text-red-600"
                    }`}
                  >
                    {slot.label}
                  </Label>
                  <button
                    type="button"
                    onClick={() => openModal(slot.key)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                      slot.team === "A"
                        ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                        : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    <span className="text-xs leading-none">+</span>
                    Cargar invitado
                  </button>
                </div>
                <PlayerSearchSelect
                  name={slot.team === "A" ? "team_a_id" : "team_b_id"}
                  placeholder="Escribe nombre, apellido o ciudad"
                  required={false}
                  selectedId={selection[slot.key] || ""}
                  onSelectId={(id) => setSlot(slot.key, id)}
                  players={optionsForSlot(slot.key)}
                />
                {index === 0 && openSlots.length > missingPlayers ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Este partido admite {missingPlayers === 1 ? "1 jugador mas" : `${missingPlayers} jugadores mas`}.
                  </p>
                ) : null}
              </div>
            ))}

            <p className="text-xs text-gray-500">
              Podes cargar los que sepas ahora y volver despues por el resto. Si alguien no tiene
              cuenta, usa &quot;Cargar invitado&quot;.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-xl hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Guardar jugadores"}
            </button>
            <Link
              href={`/player/matches/${matchId}`}
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

function RosterColumn({
  title,
  accent,
  members,
}: {
  title: string;
  accent: "blue" | "red";
  members: RosterMember[];
}) {
  return (
    <div className="rounded-xl bg-white border border-gray-100 p-3">
      <p
        className={`text-[10px] font-black uppercase tracking-widest mb-2 ${
          accent === "blue" ? "text-blue-600" : "text-red-600"
        }`}
      >
        {title}
      </p>
      {members.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Sin jugadores</p>
      ) : (
        <ul className="space-y-1">
          {members.map((member) => (
            <li key={member.playerId} className="text-sm font-semibold text-gray-800">
              {member.name}
              {member.isMe ? <span className="ml-1 text-[10px] font-bold text-gray-400">(vos)</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
