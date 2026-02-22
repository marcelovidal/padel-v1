import { requirePlayer } from "@/lib/auth";
import { PlayerRepository } from "@/repositories/player.repository";
import { MatchService } from "@/services/match.service";
import { FirstMatchExperienceForm } from "@/components/matches/FirstMatchExperienceForm";
import { redirect } from "next/navigation";

export default async function FirstMatchExperiencePage() {
  const { player } = await requirePlayer();
  const matchService = new MatchService();
  const playerRepo = new PlayerRepository();

  const [existingMatches, allPlayers, currentPlayer] = await Promise.all([
    matchService.getPlayerMatches(player.id, { limit: 1 }),
    playerRepo.findAllActive(),
    playerRepo.findById(player.id),
  ]);

  if (existingMatches.length > 0) {
    redirect("/player");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_45%),#f8fafc] px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-3xl border border-blue-100 bg-white p-6 shadow-xl shadow-blue-900/5">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-600">First Match Experience</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Tu primer partido activa PASALA
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">
            Carga un partido real ahora y vas a ver tu resultado, tu indice PASALA y un boton grande para compartir con tu grupo.
          </p>
        </div>

        <FirstMatchExperienceForm
          currentPlayerId={player.id}
          currentPlayerLocation={{
            city: currentPlayer?.city || undefined,
            city_id: currentPlayer?.city_id || undefined,
            region_code: currentPlayer?.region_code || undefined,
            region_name: currentPlayer?.region_name || undefined,
          }}
          availablePlayers={allPlayers}
        />
      </div>
    </div>
  );
}

