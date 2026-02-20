"use client";

import { useMemo, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createMatchWithPlayersAsClubAction } from "@/lib/actions/club-match.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlayerOption = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  city: string | null;
  region_name: string | null;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creando..." : "Crear Partido"}
    </Button>
  );
}

export function ClubCreateMatchWithPlayersForm({
  clubName,
  players,
}: {
  clubName: string;
  players: PlayerOption[];
}) {
  const [state, formAction] = useFormState(createMatchWithPlayersAsClubAction as any, { error: undefined });
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const defaultDate = `${year}-${month}-${day}`;
  const defaultTime = `${hours}:${minutes}`;

  const selected = useMemo(() => new Set([a1, a2, b1, b2].filter(Boolean)), [a1, a2, b1, b2]);

  const formatPlayer = (p: PlayerOption) =>
    `${p.display_name}${p.city ? ` - ${p.city}` : ""}${p.region_name ? ` (${p.region_name})` : ""}`;

  const optionsFor = (current: string) =>
    players.filter((p) => !selected.has(p.id) || p.id === current);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
          {state.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Fecha</Label>
          <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="time">Hora</Label>
          <Input id="time" name="time" type="time" defaultValue={defaultTime} required />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="club_display">Club</Label>
          <Input id="club_display" value={clubName} disabled readOnly />
        </div>

        <div className="space-y-2">
          <Label htmlFor="player_a1_id">Equipo A - Jugador 1</Label>
          <select id="player_a1_id" name="player_a1_id" value={a1} onChange={(e) => setA1(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
            <option value="">Selecciona jugador</option>
            {optionsFor(a1).map((p) => (
              <option key={p.id} value={p.id}>{formatPlayer(p)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="player_a2_id">Equipo A - Jugador 2</Label>
          <select id="player_a2_id" name="player_a2_id" value={a2} onChange={(e) => setA2(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
            <option value="">Selecciona jugador</option>
            {optionsFor(a2).map((p) => (
              <option key={p.id} value={p.id}>{formatPlayer(p)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="player_b1_id">Equipo B - Jugador 1</Label>
          <select id="player_b1_id" name="player_b1_id" value={b1} onChange={(e) => setB1(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
            <option value="">Selecciona jugador</option>
            {optionsFor(b1).map((p) => (
              <option key={p.id} value={p.id}>{formatPlayer(p)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="player_b2_id">Equipo B - Jugador 2</Label>
          <select id="player_b2_id" name="player_b2_id" value={b2} onChange={(e) => setB2(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
            <option value="">Selecciona jugador</option>
            {optionsFor(b2).map((p) => (
              <option key={p.id} value={p.id}>{formatPlayer(p)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="notes">Notas (opcional)</Label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Notas adicionales sobre el partido..."
          />
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
