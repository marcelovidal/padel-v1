"use client";

import React, { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface PlayerLoginFormProps {
  hasSessionWithoutPlayer: boolean;
  nextPath?: string;
  initialMode?: "login" | "signup";
}

export default function PlayerLoginForm({
  hasSessionWithoutPlayer,
  nextPath = "/player",
  initialMode = "login",
}: PlayerLoginFormProps) {
  const supabase = createBrowserSupabase();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
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
      router.replace(nextPath);
    } else {
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }

      if (result.data.session) {
        router.replace(nextPath);
      } else {
        setSuccessMessage("Cuenta creada. Revisa tu email para confirmar tu cuenta.");
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

  return (
    <div className="space-y-6">
      {hasSessionWithoutPlayer && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          <p className="font-bold mb-1">Sesion detectada sin perfil de jugador.</p>
          <p>
            Tu cuenta actual no esta vinculada a un jugador. Si queres entrar como jugador, cerra sesion e ingresa con
            la cuenta correcta.
          </p>
          <button
            onClick={handleSignOut}
            disabled={loading}
            className="mt-3 text-amber-900 font-bold underline hover:text-amber-700 disabled:opacity-50"
          >
            {loading ? "Cerrando sesion..." : "Cerrar sesion actual"}
          </button>
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Contrasena</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            placeholder="********"
          />
        </div>

        {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

        {successMessage && (
          <div className="bg-green-50 border border-green-100 text-green-600 text-sm p-3 rounded-lg">{successMessage}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (mode === "login" ? "Ingresando..." : "Creando cuenta...") : mode === "login" ? "Ingresar" : "Crear Cuenta"}
        </button>
      </form>

      <div className="text-center pt-2">
        {mode === "login" && (
          <div className="mb-3">
            <LinkLikeForgotPassword nextPath={nextPath} />
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setSuccessMessage(null);
          }}
          className="text-sm border-b border-blue-600 font-bold text-blue-600 hover:text-blue-800 transition-colors"
        >
          {mode === "login" ? "No tenes cuenta? Registrate" : "Ya tenes cuenta? Ingresa"}
        </button>
      </div>
    </div>
  );
}

function LinkLikeForgotPassword({ nextPath }: { nextPath: string }) {
  return (
    <a
      href={`/welcome/reset-password?next=${encodeURIComponent(nextPath)}`}
      className="text-sm font-semibold text-gray-500 hover:text-blue-700 transition-colors"
    >
      Olvide mi contrasena
    </a>
  );
}
