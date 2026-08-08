"use client";

import { useRef, useState } from "react";
import { updateTournamentStatusAction } from "@/lib/actions/tournaments.actions";
import { DiffusionReachModal } from "./DiffusionReachModal";

interface Props {
  tournamentId: string;
  currentStatus: "draft" | "active" | "finished";
  targetCityIds: string[];
}

/**
 * Cambio de estado del torneo. Si se pasa a 'active' y hay ciudades objetivo
 * cargadas, pide confirmacion antes: activar dispara la difusion geografica,
 * que es irreversible.
 */
export function TournamentStatusForm({ tournamentId, currentStatus, targetCityIds }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const [nextStatus, setNextStatus] = useState(currentStatus);
  const [showModal, setShowModal] = useState(false);

  const needsConfirm = nextStatus === "active" && currentStatus !== "active" && targetCityIds.length > 0;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (needsConfirm && !confirmedRef.current) {
      e.preventDefault();
      setShowModal(true);
    }
  }

  function handleConfirm() {
    confirmedRef.current = true;
    setShowModal(false);
    formRef.current?.requestSubmit();
  }

  return (
    <>
      <form
        ref={formRef}
        action={updateTournamentStatusAction}
        onSubmit={handleSubmit}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="tournament_id" value={tournamentId} />
        <select
          name="next_status"
          value={nextStatus}
          onChange={(e) => setNextStatus(e.target.value as Props["currentStatus"])}
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        >
          <option value="draft">Borrador</option>
          <option value="active">Activo</option>
          <option value="finished">Finalizado</option>
        </select>
        <button className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Actualizar estado
        </button>
      </form>

      {showModal ? (
        <DiffusionReachModal
          entityType="tournament"
          targetCityIds={targetCityIds}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      ) : null}
    </>
  );
}
