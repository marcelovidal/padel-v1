"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import PlayerSignupWizard from "@/components/auth/PlayerSignupWizard";
import ClubSignupWizard from "@/components/auth/ClubSignupWizard";

type PortalType = "player" | "club";
type AuthMode = "login" | "signup";

function cn(...classes: Array<string | false>) {
  return classes.filter(Boolean).join(" ");
}

function resolvePortalNextPath(portal: PortalType, nextPath?: string) {
  if (portal === "club") {
    if (!nextPath || nextPath === "/player") return "/club";
    return nextPath;
  }
  return nextPath || "/player";
}

function mapLoginError(message: string) {
  const raw = message.toLowerCase();
  if (raw.includes("invalid login credentials")) return "Email o contrasena incorrectos.";
  return message;
}

export default function WelcomePortalAuth({
  nextPath = "/player",
  initialPortal = "player",
  initialMode = "login",
}: {
  nextPath?: string;
  initialPortal?: PortalType;
  initialMode?: AuthMode;
}) {
  const router = useRouter();
  const supabase = createBrowserSupabase();
  const [portal, setPortal] = useState<PortalType>(initialPortal);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onLoginSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(mapLoginError(error.message));
        return;
      }

      const targetPath = resolvePortalNextPath(portal, nextPath);
      router.replace(targetPath);
      router.refresh();
    });
  }

  return (
    <div className="rounded-3xl border border-gray-100 bg-white/95 shadow-xl p-6 md:p-8">
      <div className="space-y-4">
        <div className="grid grid-cols-2 rounded-2xl border border-gray-200 p-1">
          <button
            type="button"
            onClick={() => setPortal("player")}
            className={cn(
              "rounded-xl py-3 text-sm font-black uppercase tracking-wide transition",
              portal === "player" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            Jugador
          </button>
          <button
            type="button"
            onClick={() => setPortal("club")}
            className={cn(
              "rounded-xl py-3 text-sm font-black uppercase tracking-wide transition",
              portal === "club" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            Club
          </button>
        </div>

        <div className="grid grid-cols-2 rounded-2xl border border-gray-200 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
              setInfo(null);
            }}
            className={cn(
              "rounded-xl py-2.5 text-sm font-bold transition",
              mode === "login" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            Iniciar sesion
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setError(null);
              setInfo(null);
            }}
            className={cn(
              "rounded-xl py-2.5 text-sm font-bold transition",
              mode === "signup" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
            )}
          >
            Crear cuenta
          </button>
        </div>
      </div>

      <div className="mt-6">
        {mode === "login" && (
          <form onSubmit={onLoginSubmit} className="space-y-4">
            <h2 className="text-2xl font-black text-gray-900">
              {portal === "player" ? "Ingreso de jugadores" : "Ingreso de clubes"}
            </h2>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contrasena"
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
            />

            {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {info && <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">{info}</p>}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-black hover:bg-blue-700 disabled:opacity-60"
            >
              {pending ? "Ingresando..." : "Ingresar"}
            </button>

            <GoogleAuthButton
              label={portal === "player" ? "Iniciar con Google" : "Iniciar club con Google"}
              nextPath={resolvePortalNextPath(portal, nextPath)}
            />
          </form>
        )}

        {mode === "signup" && portal === "player" && (
          <PlayerSignupWizard
            nextPath={nextPath}
            onError={setError}
            onInfo={setInfo}
            externalError={error}
            externalInfo={info}
          />
        )}

        {mode === "signup" && portal === "club" && (
          <ClubSignupWizard
            onError={setError}
            onInfo={setInfo}
            externalError={error}
            externalInfo={info}
          />
        )}
      </div>
    </div>
  );
}
