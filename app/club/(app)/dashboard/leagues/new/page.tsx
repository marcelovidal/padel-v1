import Link from "next/link";
import { requireClub } from "@/lib/auth";
import { LeagueCreationWizard } from "@/components/leagues/LeagueCreationWizard";
import { LeagueRulesGuide } from "@/components/leagues/LeagueRulesGuide";

export default async function NewLeaguePage() {
  const { club } = await requireClub();

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4">
      <div>
        <Link
          href="/club/dashboard/leagues"
          className="text-sm text-gray-400 hover:text-gray-700"
        >
          ← Ligas del Club
        </Link>
        <h1 className="mt-1 text-2xl font-bold">Nueva liga</h1>
        <p className="text-sm text-gray-500">
          Completá los pasos para configurar tu liga. Podés editar todos los datos después.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <LeagueCreationWizard clubId={club.id} />
      </div>

      <LeagueRulesGuide />
    </div>
  );
}
