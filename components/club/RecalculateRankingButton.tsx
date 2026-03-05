"use client";

import { useFormState, useFormStatus } from "react-dom";
import { clubRecalculateRankingAction } from "@/lib/actions/ranking.actions";
import { Button } from "@/components/ui/button";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
    >
      {pending ? "Recalculando..." : "Recalcular ranking"}
    </Button>
  );
}

export function RecalculateRankingButton({ clubId }: { clubId: string }) {
  const initialState: { success: boolean; error?: string } = { success: false };
  const [state, formAction] = useFormState(
    (async () => {
      return clubRecalculateRankingAction(clubId);
    }) as any,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <SubmitButton />
      {state && !state.success ? (
        <p className="text-sm text-red-600">{state.error}</p>
      ) : state && state.success ? (
        <p className="text-xs text-emerald-700">Ranking actualizado.</p>
      ) : null}
    </form>
  );
}
