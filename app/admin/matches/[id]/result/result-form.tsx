"use client";
import Link from "next/link";
import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { upsertMatchResultAction } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database } from "@/types/database";

type MatchResult = Database["public"]["Tables"]["match_results"]["Row"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Guardando..." : "Guardar Resultado"}
    </Button>
  );
}

export function ResultForm({
  matchId,
  existingResult,
}: {
  matchId: string;
  existingResult: MatchResult | null;
}) {
  const [state, formAction] = useFormState(upsertMatchResultAction, {
    error: undefined,
  });
  const [setsCount, setSetsCount] = useState(
    existingResult && Array.isArray(existingResult.sets)
      ? (existingResult.sets as Array<{ a: number; b: number }>).length
      : 3
  );

  const sets = existingResult && Array.isArray(existingResult.sets)
    ? (existingResult.sets as Array<{ a: number; b: number }>)
    : null;

  const winnerTeam = existingResult?.winner_team || "A";

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="match_id" value={matchId} />

      {state && state.error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="sets_count">Número de Sets</Label>
        <select
          id="sets_count"
          name="sets_count"
          value={setsCount}
          onChange={(e) => setSetsCount(parseInt(e.target.value))}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="1">1 Set</option>
          <option value="2">2 Sets</option>
          <option value="3">3 Sets</option>
          <option value="4">4 Sets</option>
          <option value="5">5 Sets</option>
        </select>
        <p className="text-sm text-gray-500">
          Selecciona cuántos sets se jugaron (máximo 5)
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Puntuación por Set</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="font-medium">Set</div>
          <div className="font-medium text-center">Equipo A</div>
          <div className="font-medium text-center">Equipo B</div>
        </div>
        {Array.from({ length: setsCount }).map((_, index) => {
          const setNumber = index + 1;
          const existingSet = sets?.[index];
          return (
            <div key={setNumber} className="grid grid-cols-3 gap-4 items-center">
              <Label>Set {setNumber}</Label>
              <Input
                type="number"
                name={`set_${setNumber}_a`}
                min="0"
                defaultValue={existingSet?.a || 0}
                required
              />
              <Input
                type="number"
                name={`set_${setNumber}_b`}
                min="0"
                defaultValue={existingSet?.b || 0}
                required
              />
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <Label htmlFor="winner_team">Equipo Ganador</Label>
        <select
          id="winner_team"
          name="winner_team"
          defaultValue={winnerTeam}
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="A">Equipo A</option>
          <option value="B">Equipo B</option>
        </select>
      </div>

      <div className="flex justify-end space-x-2">
        <Link href={`/admin/matches/${matchId}`}>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}

