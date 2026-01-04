"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  onSaved,
}: {
  matchId: string;
  existingResult: MatchResult | null;
  onSaved?: () => void;
}) {
  const router = useRouter();
  // TODO: refine server action typings to avoid `as any`
  const [state, formAction] = useFormState(upsertMatchResultAction as any, {
    ok: false,
    error: undefined,
  });

  // TODO: narrow `existingResult.sets` type instead of casting
  const initialSets = existingResult && Array.isArray(existingResult.sets)
    ? (existingResult.sets as Array<{ a: number; b: number }>)
    : [{ a: 0, b: 0 }, { a: 0, b: 0 }, { a: 0, b: 0 }];

  const [sets, setSets] = useState(initialSets.slice(0, 3));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: avoid `as any` by providing proper form state types
    if ((state as any)?.ok) {
      router.refresh();
      if (onSaved) onSaved();
    }
  }, [state, router, onSaved]);

  const handleSetChange = (index: number, side: "a" | "b", value: string) => {
    const v = value === "" ? "0" : value;
    const num = parseInt(v, 10);
    const copy = [...sets];
    copy[index] = { ...copy[index], [side]: isNaN(num) ? 0 : num };
    setSets(copy);
    // basic validation: no ties
    const hasTie = copy.slice(0, 2).some((s) => s.a === s.b);
    if (hasTie) setError("Los sets no pueden terminar en empate");
    else setError(null);
  };

  // determine if early winner (2-0)
  const perSetWinners = sets.slice(0, 2).map((s) => (s.a > s.b ? "A" : s.b > s.a ? "B" : null));
  const earlyWinner = perSetWinners[0] && perSetWinners[0] === perSetWinners[1] ? perSetWinners[0] : null;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="match_id" value={matchId} />

      {state && (state as any).error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
          {(state as any).error}
        </div>
      )}

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Puntuación por Set</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="font-medium">Set</div>
          <div className="font-medium text-center">Equipo A</div>
          <div className="font-medium text-center">Equipo B</div>
        </div>

        {sets.slice(0, 2).map((s, index) => {
          const setNumber = index + 1;
          return (
            <div key={setNumber} className="grid grid-cols-3 gap-4 items-center">
              <Label>Set {setNumber}</Label>
              <Input
                type="number"
                name={`set_${setNumber}_a`}
                min="0"
                value={String(s.a)}
                onChange={(e) => handleSetChange(index, "a", e.target.value)}
                required
              />
              <Input
                type="number"
                name={`set_${setNumber}_b`}
                min="0"
                value={String(s.b)}
                onChange={(e) => handleSetChange(index, "b", e.target.value)}
                required
              />
            </div>
          );
        })}

        {!earlyWinner && (
          <div className="grid grid-cols-3 gap-4 items-center">
            <Label>Set 3</Label>
            <Input
              type="number"
              name={`set_3_a`}
              min="0"
              value={String(sets[2].a)}
              onChange={(e) => handleSetChange(2, "a", e.target.value)}
            />
            <Input
              type="number"
              name={`set_3_b`}
              min="0"
              value={String(sets[2].b)}
              onChange={(e) => handleSetChange(2, "b", e.target.value)}
            />
          </div>
        )}

        {earlyWinner && (
          <div className="p-2 text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded">
            Ganador definido (2–0) — no es necesario completar el tercer set
          </div>
        )}
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

