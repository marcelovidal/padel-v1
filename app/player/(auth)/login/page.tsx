import React from "react";
import { getOptionalPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlayerLoginForm from "@/components/player/PlayerLoginForm";

export default async function PlayerLoginPage() {
  const { user, playerId } = await getOptionalPlayer();

  // If there is a valid player linked to this session, redirect to portal
  if (user && playerId) {
    redirect("/player");
  }

  // If no session OR session exists but no player profile, show login form
  const hasSessionWithoutPlayer = !!user && !playerId;

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 flex flex-col justify-center py-12 px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo or App Name could go here if needed, but we let the form handle its headings */}
      </div>

      <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-10 px-6 md:shadow-xl md:shadow-blue-900/5 md:rounded-[32px] sm:px-10 md:border border-gray-100">
          <PlayerLoginForm hasSessionWithoutPlayer={hasSessionWithoutPlayer} />
        </div>
      </div>
    </div>
  );
}
