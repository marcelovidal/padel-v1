import React from "react";
import { getOptionalPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlayerLoginForm from "@/components/player/PlayerLoginForm";

export default async function PlayerLoginPage({
  searchParams,
}: {
  searchParams: { next?: string; mode?: "login" | "signup"; portal?: "player" | "club" };
}) {
  const { user, playerId } = await getOptionalPlayer();
  const nextPath = searchParams.next || "/player";
  const initialMode = searchParams.mode === "signup" ? "signup" : "login";
  const portal = searchParams.portal === "club" ? "club" : "player";
  const title = portal === "club" ? "Portal de Clubes" : "Portal de Jugadores";
  const subtitle =
    portal === "club"
      ? "Ingresa para gestionar reclamos y presencia de tu club"
      : "Ingresa para ver tus partidos y resultados";

  if (user && playerId) {
    redirect(nextPath);
  }

  const hasSessionWithoutPlayer = !!user && !playerId;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">{title}</h2>
        <p className="mt-2 text-center text-sm text-gray-600">{subtitle}</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow rounded-xl sm:px-10 border border-gray-100">
          <PlayerLoginForm
            hasSessionWithoutPlayer={hasSessionWithoutPlayer}
            nextPath={nextPath}
            initialMode={initialMode}
          />
        </div>
      </div>
    </div>
  );
}
