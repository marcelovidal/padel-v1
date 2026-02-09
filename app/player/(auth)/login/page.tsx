import React from "react";
import { getOptionalPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlayerLoginForm from "@/components/player/PlayerLoginForm";

export default async function PlayerLoginPage() {
  const { user, playerId } = await getOptionalPlayer();

  // If there is a valid player linked to this session, redirect to portal
  if (user && playerId) {
    redirect("/player/matches");
  }

  // If no session OR session exists but no player profile, show login form
  const hasSessionWithoutPlayer = !!user && !playerId;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Portal de Jugadores
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Ingresá para ver tus partidos y resultados
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow rounded-xl sm:px-10 border border-gray-100">
          <PlayerLoginForm hasSessionWithoutPlayer={hasSessionWithoutPlayer} />
        </div>
      </div>
    </div>
  );
}
