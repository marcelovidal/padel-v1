import { requirePlayer } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CoachSetupForm } from "@/components/coach/CoachSetupForm";
import { ClubService } from "@/services/club.service";

export const dynamic = "force-dynamic";

export default async function CoachSetupPage() {
  const { player } = await requirePlayer();

  if (!(player as any).is_coach) {
    redirect("/player/coach");
  }

  const clubService = new ClubService();
  const clubs = await clubService.searchClubsForPlayer("", 100).catch(() => []);

  return (
    <div className="container mx-auto max-w-2xl p-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">
          Configurá tu perfil
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Podés completar todo ahora o después desde Mi equipo.
        </p>
      </div>
      <CoachSetupForm clubs={clubs} />
    </div>
  );
}
