"use client";

import { useFormState, useFormStatus } from "react-dom";

type State = { success: true; message: string } | { success: false; error: string } | { success: null };

const INITIAL_STATE: State = { success: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white disabled:opacity-60"
    >
      {pending ? "Asignando..." : "Asignar"}
    </button>
  );
}

export function SetMatchClubForm({
  action,
  matchId,
  clubId,
  clubNameRaw,
  label,
  hint,
}: {
  action: (prevState: State | null, formData: FormData) => Promise<State>;
  matchId: string;
  clubId: string;
  clubNameRaw: string;
  label: string;
  hint?: string;
}) {
  const [state, formAction] = useFormState(action as any, INITIAL_STATE);

  return (
    <form action={formAction} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2">
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="club_id" value={clubId} />
      <input type="hidden" name="club_name_raw" value={clubNameRaw} />

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">{label}</p>
        {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
        {state.success === false ? <p className="text-xs text-red-600">{state.error}</p> : null}
        {state.success === true ? <p className="text-xs text-green-700">{state.message}</p> : null}
      </div>

      <SubmitButton />
    </form>
  );
}
