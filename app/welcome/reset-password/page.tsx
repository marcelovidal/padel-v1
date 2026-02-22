"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function ResetPasswordRequestPage() {
  const supabase = createBrowserSupabase();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/welcome/update-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Te enviamos un enlace para restablecer tu contrasena.");
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-white">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-blue-900/5">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black italic tracking-tight text-blue-600">PASALA</h1>
          <p className="mt-2 text-lg font-bold text-gray-900">Recuperar contrasena</p>
          <p className="mt-1 text-sm text-gray-500">
            Ingresa tu email y te enviamos un enlace de recuperacion.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          {success && <div className="bg-green-50 border border-green-100 text-green-700 text-sm p-3 rounded-lg">{success}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Enviando..." : "Enviar enlace"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link href="/welcome" className="text-sm font-semibold text-gray-500 hover:text-blue-700">
            Volver a ingresar
          </Link>
        </div>
      </div>
    </div>
  );
}
