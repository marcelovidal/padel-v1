import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { getOptionalPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";

function buildAuthUrl(next: string, mode: "login" | "signup", portal: "player" | "club") {
  const params = new URLSearchParams();
  params.set("next", next);
  params.set("mode", mode);
  params.set("portal", portal);
  return `/player/login?${params.toString()}`;
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: { next?: string; claim_match?: string; claim_player?: string };
}) {
  if (searchParams.claim_player) {
    const claimParams = new URLSearchParams();
    claimParams.set("claim_player", searchParams.claim_player);
    if (searchParams.claim_match) claimParams.set("claim_match", searchParams.claim_match);
    if (searchParams.next) claimParams.set("next", searchParams.next);
    redirect(`/welcome/claim?${claimParams.toString()}`);
  }

  const { user, playerId } = await getOptionalPlayer();
  const next = searchParams.next || "/player";

  if (user && playerId) {
    redirect(next);
  }

  const playerLoginUrl = buildAuthUrl(next, "login", "player");
  const playerSignupUrl = buildAuthUrl(next, "signup", "player");
  const clubLoginUrl = buildAuthUrl(next, "login", "club");
  const clubSignupUrl = buildAuthUrl(next, "signup", "club");

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-white">
      <div className="max-w-5xl w-full space-y-12">
        <div className="space-y-3 text-center">
          <h1 className="text-6xl font-black text-blue-600 tracking-tighter italic transform -skew-x-6">PASALA</h1>
          <p className="text-xl text-gray-600 font-medium">Elegi como queres ingresar a la plataforma.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-3xl border border-blue-100 bg-white/90 backdrop-blur p-6 shadow-sm space-y-5">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-blue-500 font-semibold">Acceso Jugadores</p>
              <h2 className="text-2xl font-bold text-gray-900 mt-2">Entrar como jugador</h2>
              <p className="text-sm text-gray-600 mt-2">Carga partidos, comparti resultados y segui tu rendimiento.</p>
            </div>

            <GoogleAuthButton label="Continuar con Google" nextPath={next} />

            <div className="grid grid-cols-1 gap-3">
              <Link href={playerLoginUrl} className="w-full">
                <Button variant="outline" className="w-full py-5 text-base font-semibold rounded-2xl border-2">
                  Ingresar con email
                </Button>
              </Link>
              <Link href={playerSignupUrl} className="w-full">
                <Button variant="ghost" className="w-full py-4 text-gray-600 hover:text-blue-600">
                  Crear cuenta jugador
                </Button>
              </Link>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white/90 backdrop-blur p-6 shadow-sm space-y-5">
            <div>
              <p className="text-xs tracking-[0.2em] uppercase text-slate-500 font-semibold">Acceso Clubes</p>
              <h2 className="text-2xl font-bold text-gray-900 mt-2">Entrar como club</h2>
              <p className="text-sm text-gray-600 mt-2">
                Gestiona tu club, valida reclamos y activa tu presencia en la red PASALA.
              </p>
            </div>

            <GoogleAuthButton label="Continuar club con Google" nextPath={next} />

            <div className="grid grid-cols-1 gap-3">
              <Link href={clubLoginUrl} className="w-full">
                <Button variant="outline" className="w-full py-5 text-base font-semibold rounded-2xl border-2">
                  Ingresar club con email
                </Button>
              </Link>
              <Link href={clubSignupUrl} className="w-full">
                <Button variant="ghost" className="w-full py-4 text-gray-600 hover:text-blue-600">
                  Crear cuenta club
                </Button>
              </Link>
            </div>
          </section>
        </div>

        <div className="text-center text-gray-400 text-sm italic font-light">Transformando el padel amateur en profesional.</div>
      </div>
    </div>
  );
}
