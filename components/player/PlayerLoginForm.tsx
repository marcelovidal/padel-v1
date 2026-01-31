"use client";

import React, { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface PlayerLoginFormProps {
    hasSessionWithoutPlayer: boolean;
}

export default function PlayerLoginForm({ hasSessionWithoutPlayer }: PlayerLoginFormProps) {
    const supabase = createBrowserSupabase();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const result = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (result.error) {
            setError(result.error.message);
            setLoading(false);
            return;
        }

        // Redirect to /player which is the portal entry (requirePlayer will handle deeper routing)
        router.replace("/player/matches");
        router.refresh();
    }

    async function handleSignOut() {
        setLoading(true);
        await supabase.auth.signOut();
        router.refresh();
        setLoading(false);
    }

    return (
        <div className="space-y-6">
            {hasSessionWithoutPlayer && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
                    <p className="font-bold mb-1">Sesión detectada sin perfil de jugador.</p>
                    <p>Tu cuenta actual no está vinculada a un jugador. Si querés entrar como jugador, cerrá sesión e ingresá con la cuenta correcta.</p>
                    <button
                        onClick={handleSignOut}
                        disabled={loading}
                        className="mt-3 text-amber-900 font-bold underline hover:text-amber-700 disabled:opacity-50"
                    >
                        {loading ? "Cerrando sesión..." : "Cerrar sesión actual"}
                    </button>
                </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="tu@email.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        placeholder="••••••••"
                    />
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Ingresando..." : "Ingresar"}
                </button>
            </form>
        </div>
    );
}
