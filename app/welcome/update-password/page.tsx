"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

export default function UpdatePasswordPage() {
  const supabase = createBrowserSupabase();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setCheckingSession(false);
      if (!data.session) {
        setError("El enlace de recuperacion es invalido o expiró.");
      }
    });
    return () => {
      mounted = false;
    };
  }, [supabase.auth]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Contrasena actualizada. Redirigiendo...");
    setLoading(false);
    setTimeout(() => {
      router.replace("/welcome");
      router.refresh();
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-white">
      <div className="w-full max-w-md rounded-3xl border border-gray-100 bg-white p-8 shadow-xl shadow-blue-900/5">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black italic tracking-tight text-blue-600">PASALA</h1>
          <p className="mt-2 text-lg font-bold text-gray-900">Nueva contrasena</p>
          <p className="mt-1 text-sm text-gray-500">
            Define una contrasena nueva para tu cuenta.
          </p>
        </div>

        {checkingSession ? (
          <div className="text-sm text-gray-500 text-center py-4">Validando enlace...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contrasena</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="********"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contrasena</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="********"
              />
            </div>

            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
            {success && <div className="bg-green-50 border border-green-100 text-green-700 text-sm p-3 rounded-lg">{success}</div>}

            <button
              type="submit"
              disabled={loading || !!error && error.includes("invalido")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Guardando..." : "Actualizar contrasena"}
            </button>
          </form>
        )}

        <div className="mt-5 text-center">
          <Link href="/welcome" className="text-sm font-semibold text-gray-500 hover:text-blue-700">
            Volver a acceso
          </Link>
        </div>
      </div>
    </div>
  );
}
