import { requirePlayer } from "@/lib/auth";
import { CoachService } from "@/services/coach.service";
import { enableCoachProfileAction } from "@/lib/actions/coach.actions";
import { CoachDashboard } from "@/components/coach/CoachDashboard";
import { GraduationCap } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CoachPage({
  searchParams,
}: {
  searchParams: { tab?: string; player?: string; q?: string };
}) {
  const { player } = await requirePlayer();
  const isCoach = (player as any).is_coach === true;

  if (!isCoach) {
    return (
      <div className="container mx-auto max-w-2xl p-4 py-16">
        <div className="rounded-[32px] border border-blue-100 bg-white p-10 shadow-sm text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50">
            <GraduationCap className="h-8 w-8 text-blue-600" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              ¿Sos entrenador de pádel?
            </h1>
            <p className="text-sm text-gray-500 leading-relaxed max-w-sm mx-auto">
              Habilitá tu perfil de entrenador para que jugadores puedan encontrarte,
              ver tu disponibilidad y reservar clases con vos.
            </p>
          </div>
          <form action={enableCoachProfileAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
            >
              <GraduationCap className="h-4 w-4" />
              Activar perfil entrenador
            </button>
          </form>
        </div>
      </div>
    );
  }

  const coachService = new CoachService();
  const [coachProfile, students] = await Promise.all([
    coachService.getProfileByPlayerId(player.id).catch(() => null),
    coachService.getMyPlayers().catch(() => []),
  ]);

  const activeTab        = searchParams.tab    ?? "alumnos";
  const selectedPlayerId = searchParams.player ?? null;

  let challenges: any[] = [];
  let bookings: any[] = [];
  let notes: any[] = [];
  let sessions: any[] = [];

  if (coachProfile) {
    if (activeTab === "desafios") {
      challenges = await coachService.getChallenges(coachProfile.id).catch(() => []);
    }
    if (activeTab === "agenda") {
      bookings = await coachService.getBookingsEnriched(coachProfile.id).catch(() => []);
    }
    if (activeTab === "legajo" && selectedPlayerId) {
      [notes, sessions, challenges] = await Promise.all([
        coachService.getNotes(coachProfile.id, selectedPlayerId).catch(() => []),
        coachService.getSessions(coachProfile.id, selectedPlayerId).catch(() => []),
        coachService.getChallenges(coachProfile.id, selectedPlayerId).catch(() => []),
      ]);
    }
  }

  return (
    <CoachDashboard
      coachProfile={coachProfile}
      students={students}
      activeTab={activeTab}
      selectedPlayerId={selectedPlayerId}
      challenges={challenges}
      bookings={bookings}
      notes={notes}
      sessions={sessions}
      directoryPlayers={[]}
      coachPlayerStatuses={[]}
      myPlayerId={player.id}
      initialQuery={""}
    />
  );
}
