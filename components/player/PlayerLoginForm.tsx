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
    const [mode, setMode] = useState<"login" | "signup">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    async function handleAuth(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);

        if (mode === "login") {
            const result = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (result.error) {
                setError(result.error.message);
                setLoading(false);
                return;
            }
            router.replace("/player");
        } else {
            const result = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (result.error) {
                setError(result.error.message);
                setLoading(false);
                return;
            }

            if (result.data.session) {
                // Auto-logged in (rare if confirm email is on, but possible)
                router.replace("/player");
            } else {
                setSuccessMessage("¡Cuenta creada! Por favor, revisá tu email para confirmar tu cuenta.");
                setLoading(false);
            }
        }

        router.refresh();
    }

    async function handleSignOut() {
        setLoading(true);
        await supabase.auth.signOut();
        router.refresh();
        setLoading(false);
    }

    async function handleGoogleAuth() {
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            }
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        }
    }

    return (
        <div className="space-y-6">
            {/* Tabs Selector */}
            <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
                <button
                    onClick={() => {
                        setMode("login");
                        setError(null);
                        setSuccessMessage(null);
                    }}
                    className={`flex-1 py-2 text-sm font-black uppercase tracking-widest rounded-lg transition-all ${mode === "login"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Ingresar
                </button>
                <button
                    onClick={() => {
                        setMode("signup");
                        setError(null);
                        setSuccessMessage(null);
                    }}
                    className={`flex-1 py-2 text-sm font-black uppercase tracking-widest rounded-lg transition-all ${mode === "signup"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                        }`}
                >
                    Registrarse
                </button>
            </div>

            {/* Header Section */}
            <div className="text-center space-y-2 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">
                    {mode === "login" ? "¡Hola de nuevo!" : "Unite a PASALA"}
                </h2>
                <p className="text-gray-500 text-sm font-medium">
                    {mode === "login"
                        ? "Ingresá a tu cuenta para seguir jugando."
                        : "Creá tu perfil y empezá a sumar puntos."}
                </p>
            </div>

            {hasSessionWithoutPlayer && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs animate-in zoom-in duration-300">
                    <div className="flex gap-3">
                        <div className="mt-0.5">
                            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-tight mb-1">Sesión detectada sin perfil</p>
                            <p>Tu cuenta actual no está vinculada a un jugador. Si ya sos jugador, cerrá sesión e ingresá con la cuenta correcta.</p>
                            <button
                                onClick={handleSignOut}
                                disabled={loading}
                                className="mt-3 text-[10px] font-black uppercase tracking-widest bg-amber-200/50 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                            >
                                {loading ? "Cerrando..." : "Cerrar sesión actual"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Email</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                            </svg>
                        </div>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 pl-10 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300"
                            placeholder="tu@email.com"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Contraseña</label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3.5 pl-10 pr-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium placeholder:text-gray-300"
                            placeholder="••••••••"
                        />
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-4 rounded-2xl animate-in shake duration-300">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="bg-green-50 border border-green-100 text-green-600 text-xs font-bold p-4 rounded-2xl animate-in zoom-in duration-300">
                        {successMessage}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${mode === "login"
                        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200"
                        : "bg-gray-900 hover:bg-black text-white shadow-gray-200"
                        }`}
                >
                    {loading ? (
                        <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>Procesando...</span>
                        </div>
                    ) : (
                        mode === "login" ? "Ingresar" : "Crear Cuenta"
                    )}
                </button>

                {/* Separator */}
                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-100"></div>
                    <span className="flex-shrink mx-4 text-[10px] font-black uppercase tracking-widest text-gray-300">O también podés</span>
                    <div className="flex-grow border-t border-gray-100"></div>
                </div>

                {/* Google Button */}
                <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="w-full h-14 bg-white border border-gray-100 rounded-2xl font-bold text-gray-700 shadow-sm hover:bg-gray-50 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    <span>Continuar con Google</span>
                </button>
            </form>

            <p className="text-center text-[10px] text-gray-400 font-medium px-8 leading-relaxed">
                {mode === "login"
                    ? "Al ingresar aceptás nuestros términos y condiciones de uso y privacidad."
                    : "Te enviaremos un email de confirmación una vez que crees tu cuenta."}
            </p>
        </div>
    );
}
