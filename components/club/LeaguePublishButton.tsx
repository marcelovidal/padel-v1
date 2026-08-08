"use client";

import { useRef, useState } from "react";
import { updateLeagueStatusAction } from "@/lib/actions/leagues.actions";
import { DiffusionReachModal } from "./DiffusionReachModal";

interface Props {
  leagueId: string;
  targetCityIds: string[];
}

/**
 * Boton "Publicar liga" (draft -> active). Si hay ciudades objetivo cargadas,
 * pide confirmacion antes: publicar dispara la difusion geografica, que es
 * irreversible.
 */
export function LeaguePublishButton({ leagueId, targetCityIds }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  const [showModal, setShowModal] = useState(false);

  const needsConfirm = targetCityIds.length > 0;

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
      <form ref={formRef} action={updateLeagueStatusAction} onSubmit={handleSubmit}>
        <input type="hidden" name="league_id" value={leagueId} />
        <input type="hidden" name="next_status" value="active" />
        <button className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
          Publicar liga
        </button>
      </form>

      {showModal ? (
        <DiffusionReachModal
          entityType="league"
          targetCityIds={targetCityIds}
          onConfirm={handleConfirm}
          onCancel={() => setShowModal(false)}
        />
      ) : null}
    </>
  );
}
