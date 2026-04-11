import { requirePlayer } from "@/lib/auth";
import { MatchService } from "@/services/match.service";
import { AssessmentService } from "@/services/assessment.service";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { AssessmentForm } from "@/components/assessments/AssessmentForm";
import { format, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import { normalizeSets } from "@/lib/match/matchUtils";

function formatPlayerName(player: any) {
  const firstName = player?.players?.first_name || "";
  const lastName = player?.players?.last_name || "";
  const full = `${firstName} ${lastName}`.trim();
  return full || "Jugador";
}

export default async function MatchAssessmentPage({
  params,
}: {
  params: { id: string };
}) {
  const { player: mePlayer } = await requirePlayer();
  const playerId = mePlayer.id;
  const matchSvc = new MatchService();
  const assessmentSvc = new AssessmentService();

  const [match, assessment] = await Promise.all([
    matchSvc.getMatchById(params.id),
    assessmentSvc.getPlayerAssessmentInMatch(params.id, playerId),
  ]);

  if (!match) notFound();

  const isCompleted = match.status === "completed" || !!match.match_results;
  if (!isCompleted) {
    redirect(`/player/matches/${params.id}`);
  }

  const teamA = match.match_players.filter((player: any) => player.team === "A");
  const teamB = match.match_players.filter((player: any) => player.team === "B");
  const myEntry = match.match_players.find((player: any) => player.player_id === playerId) || null;
  const myTeam = myEntry?.team === "B" ? teamB : teamA;
  const rivalTeam = myEntry?.team === "B" ? teamA : teamB;
  const teammateNames = myTeam
    .filter((player: any) => player.player_id !== playerId)
    .map(formatPlayerName);
  const rivalNames = rivalTeam.map(formatPlayerName);
  const winnerTeam = match.match_results?.winner_team ?? null;
  const didWin = winnerTeam ? winnerTeam === myEntry?.team : null;

  const resultLabel = (() => {
    const sets = normalizeSets((match.match_results?.sets as any) || []);
    if (!sets.length) return "Resultado confirmado";
    return sets.map((set) => `${set.a}-${set.b}`).join(" ");
  })();

  const introNarrative = (() => {
    const matchDate = new Date(match.match_at);
    const today = new Date();
    const whenLabel = isSameDay(matchDate, today)
      ? `Hoy jugaste en ${match.club_name}`
      : `El ${format(matchDate, "d 'de' MMMM", { locale: es })} jugaste en ${match.club_name}`;

    const resultText =
      didWin === null
        ? `y el resultado fue ${resultLabel}.`
        : didWin
        ? `y ganaste por ${resultLabel}.`
        : `y perdiste por ${resultLabel}.`;

    const teamText = teammateNames.length
      ? ` Fue con ${teammateNames.join(" / ")} contra ${rivalNames.join(" / ")}.`
      : rivalNames.length
      ? ` Fue contra ${rivalNames.join(" / ")}.`
      : "";

    return `${whenLabel}, ${resultText}${teamText} Vamos a evaluar tu performance. ¿Empezamos?`;
  })();

  return (
    <div className="space-y-8 py-6">
      <header className="flex items-center justify-between">
        <Link
          href={`/player/matches/${params.id}`}
          className="group flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
        >
          <svg className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al partido
        </Link>
        <div className="text-right">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Autoevaluación</h2>
          <p className="text-sm font-bold text-gray-900">{match.club_name}</p>
        </div>
      </header>

      <main>
        <AssessmentForm
          matchId={match.id}
          playerId={playerId}
          initialAssessment={assessment}
          matchSummary={{
            clubName: match.club_name,
            dateLabel: format(new Date(match.match_at), "d 'de' MMMM yyyy", { locale: es }),
            resultLabel,
            matchLabel: `${match.club_name} · ${format(new Date(match.match_at), "d MMM", { locale: es })}`, 
            backHref: `/player/matches/${params.id}`,
            teammateLabel: teammateNames.length ? teammateNames.join(" / ") : "Jugaste sin compañero fijo",
            rivalsLabel: rivalNames.length ? rivalNames.join(" / ") : "Rivales no disponibles",
            introNarrative,
            outcomeLabel: didWin === null ? "Resultado cargado" : didWin ? "Ganaste" : "Perdiste",
          }}
        />
      </main>
    </div>
  );
}

