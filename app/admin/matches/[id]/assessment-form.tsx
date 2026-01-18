"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { createAssessmentAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Database } from "@/types/database";

type Player = Database["public"]["Tables"]["players"]["Row"];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Guardando..." : "Enviar"}
    </Button>
  );
}

export function AssessmentForm({ matchId, playerId }: { matchId: string; playerId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useFormState(createAssessmentAction as any, { ok: false, error: undefined });
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if ((state as any)?.ok) {
      router.refresh();
      formRef.current?.reset();
    }
  }, [state, router]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setLocalError(null);
    const fd = new FormData(e.currentTarget);
    const fields = [
      'volea','globo','remate','bandeja','vibora','bajada_pared','saque','recepcion_saque','comments'
    ];
    const hasValue = fields.some((k) => {
      const v = fd.get(k);
      return v !== null && String(v).trim() !== '';
    });
    if (!hasValue) {
      e.preventDefault();
      setLocalError('Debes completar al menos un golpe o un comentario');
      return;
    }
    // allow native form submit to server action
  };

  return (
    <form ref={formRef} action={formAction} className="space-y-2" onSubmit={handleSubmit}>
      <input type="hidden" name="match_id" value={matchId} />
      <input type="hidden" name="player_id" value={playerId} />

      {(localError || (state && (state as any).error)) && (
        <div className="p-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
          {localError ?? (state as any).error}
        </div>
      )}

      <div className="text-sm text-gray-500">Podés completar solo los campos que quieras (1–5) o dejar sólo un comentario.</div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>Volea</Label>
          <select name="volea" className="w-full">
            <option value="">-</option>
            {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <Label>Globo</Label>
          <select name="globo" className="w-full">
            <option value="">-</option>
            {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <Label>Remate</Label>
          <select name="remate" className="w-full">
            <option value="">-</option>
            {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <Label>Bandeja</Label>
          <select name="bandeja" className="w-full">
            <option value="">-</option>
            {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <Label>Vibora</Label>
          <select name="vibora" className="w-full">
            <option value="">-</option>
            {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <Label>Bajada pared</Label>
          <select name="bajada_pared" className="w-full">
            <option value="">-</option>
            {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <Label>Saque</Label>
          <select name="saque" className="w-full">
            <option value="">-</option>
            {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <Label>Recepción saque</Label>
          <select name="recepcion_saque" className="w-full">
            <option value="">-</option>
            {[1,2,3,4,5].map(n=> <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
      </div>

      <div>
        <Label>Comentarios (opcional)</Label>
        <textarea name="comments" className="w-full p-2 border rounded" rows={3} />
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
