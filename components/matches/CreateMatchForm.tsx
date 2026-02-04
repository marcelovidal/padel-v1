"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createMatchAsPlayer } from "@/lib/actions/player-match.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface PlayerOption {
    id: string;
    first_name: string;
    last_name: string;
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Creando partido..." : "Crear Partido"}
        </Button>
    );
}

export function CreateMatchForm({
    currentPlayerId,
    availablePlayers
}: {
    currentPlayerId: string;
    availablePlayers: PlayerOption[]
}) {
    const [state, formAction] = useFormState(createMatchAsPlayer as any, { error: null });

    // Filter out current player from selection lists
    const otherPlayers = availablePlayers.filter(p => p.id !== currentPlayerId);

    return (
        <form action={formAction} className="space-y-6 max-w-lg mx-auto bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <input type="hidden" name="player_id" value={currentPlayerId} />

            {state?.error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-200">
                    {state.error}
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <Input type="date" id="date" name="date" required className="w-full" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="time">Hora</Label>
                    <Input type="time" id="time" name="time" required className="w-full" />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="club_name">Club / Lugar</Label>
                <Input
                    type="text"
                    id="club_name"
                    name="club_name"
                    placeholder="Ej: El Padel Club"
                    required
                />
            </div>

            <div className="border-t pt-4 mt-4">
                <h3 className="font-semibold text-gray-900 mb-3">Jugadores</h3>

                <div className="space-y-4">
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <Label className="text-blue-800">Tu Compañero (Equipo A)</Label>
                        <select name="partner_id" className="w-full mt-1 p-2 bg-white rounded border border-blue-200" required defaultValue="">
                            <option value="" disabled>Selecciona compañero</option>
                            {otherPlayers.map(p => (
                                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="p-3 bg-red-50 rounded-lg border border-red-100 space-y-3">
                        <Label className="text-red-800">Rivales (Equipo B)</Label>

                        <div>
                            <Label className="text-xs text-red-600">Rival 1</Label>
                            <select name="opponent1_id" className="w-full mt-1 p-2 bg-white rounded border border-red-200" required defaultValue="">
                                <option value="" disabled>Selecciona rival 1</option>
                                {otherPlayers.map(p => (
                                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <Label className="text-xs text-red-600">Rival 2</Label>
                            <select name="opponent2_id" className="w-full mt-1 p-2 bg-white rounded border border-red-200" required defaultValue="">
                                <option value="" disabled>Selecciona rival 2</option>
                                {otherPlayers.map(p => (
                                    <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
                <SubmitButton />
                <Link href="/player/matches" className="text-center text-sm text-gray-500 hover:text-gray-700">
                    Cancelar
                </Link>
            </div>
        </form>
    );
}
