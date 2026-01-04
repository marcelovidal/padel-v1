"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ResultForm } from "./result/result-form";
import { Database } from "@/types/database";

type MatchResult = Database["public"]["Tables"]["match_results"]["Row"];

export function ResultInline({ matchId, existingResult }: { matchId: string; existingResult: MatchResult | null; }) {
  const [editing, setEditing] = useState(false);

  return (
    <div>
      {existingResult && !editing ? (
        <div>
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-500">Sets</p>
            <p className="text-lg">{(() => {
              // TODO: narrow match_results.sets type instead of casting to `any[]`
              const sets = Array.isArray(existingResult?.sets) ? (existingResult!.sets as any[]) : [];
              return sets.length > 0 ? sets.map((s: any) => `${s.a}-${s.b}`).join(", ") : "—";
            })()}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Ganador</p>
            <p className="text-lg">Equipo {existingResult.winner_team}</p>
          </div>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Editar resultado
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <ResultForm matchId={matchId} existingResult={existingResult} onSaved={() => setEditing(false)} />
          {existingResult && (
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
