"use client";
import React, { useState } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function PlayerLoginPage() {
  const supabase = createBrowserSupabase();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    // client-side diagnostic log to help debug cookie/session behaviour
    // (will appear in browser console)
    // eslint-disable-next-line no-console
    console.log("[PLAYER_LOGIN] signInWithPassword result:", result);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.push("/player");
  }

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-2xl font-bold mb-4">Ingreso jugador</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded p-2" />
        </div>
        <div>
          <label className="block text-sm">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" className="w-full border rounded p-2" />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded">Entrar</button>
        </div>
      </form>
    </div>
  );
}
