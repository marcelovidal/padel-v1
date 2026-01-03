"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { addPlayerToMatchAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Database } from "@/types/database";

type Player = Database["public"]["Tables"]["players"]["Row"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Agregando..." : "Agregar"}
    </Button>
  );
}

type FormState = {
  ok?: boolean;
  error?: string;
};

const initialState: FormState = { ok: false, error: undefined };

export function AddPlayerForm({
  matchId,
  availablePlayers,
}: {
  matchId: string;
  availablePlayers: Player[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction] = useFormState (addPlayerToMatchAction, initialState);

  useEffect(() => {
    if (state?.ok) {
      // refresca el server component para que aparezca el jugador agregado
      router.refresh();

      // opcional: resetear selección del formulario
      formRef.current?.reset();
    }
  }, [state?.ok, router]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <input type="hidden" name="match_id" value={matchId} />

      {state?.error && (
        <div className="p-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="player_id">Jugador</Label>
        <select
          id="player_id"
          name="player_id"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Selecciona un jugador</option>
          {availablePlayers.map((player) => (
            <option key={player.id} value={player.id}>
              {player.first_name} {player.last_name}
              {player.email && ` (${player.email})`}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="team">Equipo</Label>
        <select
          id="team"
          name="team"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          defaultValue="A"
        >
          <option value="A">Equipo A</option>
          <option value="B">Equipo B</option>
        </select>
      </div>

      <SubmitButton />
    </form>
  );
}