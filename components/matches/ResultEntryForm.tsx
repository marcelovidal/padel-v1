"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitMatchResultAsPlayer } from "@/lib/actions/match-result.actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useState } from "react";

interface ResultEntryFormProps {
    matchId: string;
    teamANames: string[];
    teamBNames: string[];
}

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            className="w-full py-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
            disabled={pending}
        >
            {pending ? "Guardando..." : "Confirmar Resultado"}
        </Button>
    );
}

export function ResultEntryForm({
    matchId,
    teamANames,
    teamBNames
}: ResultEntryFormProps) {
    const [state, formAction] = useFormState(submitMatchResultAsPlayer as any, { error: null });
    const [hasSet3, setHasSet3] = useState(false);

    return (
        <form action={formAction} className="space-y-8 max-w-lg mx-auto bg-white p-8 rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100">
            <input type="hidden" name="match_id" value={matchId} />

            <header className="space-y-2 text-center border-b border-gray-100 pb-6">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Cargar Resultado</h1>
                <p className="text-gray-500 text-sm font-medium">Ingresa los juegos de cada set disputado</p>
            </header>

            {state?.error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm border border-red-100 animate-in fade-in zoom-in duration-300 flex items-center gap-2">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-bold">{state.error}</span>
                </div>
            )}

            <div className="space-y-6">
                {/* Team Header */}
                <div className="grid grid-cols-3 gap-4 text-center items-center">
                    <div className="text-[10px] font-black uppercase tracking-widest text-blue-600">Equipo A</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-medium">Sets</div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-red-600">Equipo B</div>
                </div>

                {/* Set 1 */}
                <div className="grid grid-cols-3 gap-4 items-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <Input
                        type="number"
                        name="set1_a"
                        placeholder="0"
                        min="0"
                        max="20"
                        required
                        className="text-center text-xl font-black rounded-xl border-gray-200 focus:ring-blue-500"
                    />
                    <div className="text-center font-black text-gray-300">SET 1</div>
                    <Input
                        type="number"
                        name="set1_b"
                        placeholder="0"
                        min="0"
                        max="20"
                        required
                        className="text-center text-xl font-black rounded-xl border-gray-200 focus:ring-red-500"
                    />
                </div>

                {/* Set 2 */}
                <div className="grid grid-cols-3 gap-4 items-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100">
                    <Input
                        type="number"
                        name="set2_a"
                        placeholder="0"
                        min="0"
                        max="20"
                        required
                        className="text-center text-xl font-black rounded-xl border-gray-200 focus:ring-blue-500"
                    />
                    <div className="text-center font-black text-gray-300">SET 2</div>
                    <Input
                        type="number"
                        name="set2_b"
                        placeholder="0"
                        min="0"
                        max="20"
                        required
                        className="text-center text-xl font-black rounded-xl border-gray-200 focus:ring-red-500"
                    />
                </div>

                {/* Set 3 Toggle */}
                {!hasSet3 ? (
                    <button
                        type="button"
                        onClick={() => setHasSet3(true)}
                        className="w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-xs font-bold text-gray-400 hover:border-blue-200 hover:text-blue-500 transition-all"
                    >
                        + Agregar Set 3 (Tie-break)
                    </button>
                ) : (
                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-3 gap-4 items-center p-4 bg-blue-50/30 rounded-2xl border border-blue-100 relative">
                            <Input
                                type="number"
                                name="set3_a"
                                placeholder="0"
                                min="0"
                                max="20"
                                className="text-center text-xl font-black rounded-xl border-blue-200 focus:ring-blue-500"
                            />
                            <div className="text-center font-black text-blue-300">SET 3</div>
                            <Input
                                type="number"
                                name="set3_b"
                                placeholder="0"
                                min="0"
                                max="20"
                                className="text-center text-xl font-black rounded-xl border-blue-200 focus:ring-red-500"
                            />
                            <button
                                type="button"
                                onClick={() => setHasSet3(false)}
                                className="absolute -top-2 -right-2 bg-white border border-gray-100 text-gray-400 hover:text-red-500 p-1 rounded-full shadow-sm"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-400 pt-4">
                <div className="space-y-1">
                    <p className="font-black uppercase tracking-widest text-[10px] text-blue-500">Equipo A</p>
                    {teamANames.map((n, i) => <p key={i} className="truncate">{n}</p>)}
                </div>
                <div className="space-y-1 text-right">
                    <p className="font-black uppercase tracking-widest text-[10px] text-red-500">Equipo B</p>
                    {teamBNames.map((n, i) => <p key={i} className="truncate">{n}</p>)}
                </div>
            </div>

            <div className="pt-4 flex flex-col gap-4">
                <SubmitButton />
                <Link
                    href={`/player/matches/${matchId}`}
                    className="text-center text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                >
                    Cancelar
                </Link>
            </div>
        </form>
    );
}
