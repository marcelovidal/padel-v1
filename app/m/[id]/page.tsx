import { MatchService } from "@/services/match.service";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Calendar, MapPin, ArrowRight, UserPlus } from "lucide-react";

function formatShortName(fullName: string) {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Jugador";
  if (parts.length === 1) return parts[0];
  return `${parts[0].charAt(0)}. ${parts.slice(1).join(" ")}`;
}

export default async function PublicMatchPage({
  params,
}: {
  params: { id: string };
}) {
  const matchSvc = new MatchService();
  const match = await matchSvc.getPublicMatchData(params.id);

  if (!match) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userState: "anonymous" | "unonboarded" | "onboarded" = "anonymous";

  if (user) {
    const { data: player } = await (supabase
      .from("players")
      .select("id, onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle() as any);

    if (player) {
      userState = (player as any).onboarding_completed ? "onboarded" : "unonboarded";
    } else {
      userState = "unonboarded";
    }
  }

  const teamA = match.roster.filter((p: any) => p.team === "A");
  const teamB = match.roster.filter((p: any) => p.team === "B");
  const unclaimedRoster = match.roster.filter((p: any) => !!p.player_id && !p.has_profile);
  const result: any = match.results;
  const sets = (result?.sets || []) as any[];
  const winnerTeam = (result?.winner_team || result?.winnerTeam || null) as "A" | "B" | null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-12 pb-20 px-6">
      <div className="max-w-md mx-auto w-full space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-black text-blue-600 tracking-tighter uppercase italic">PASALA</h1>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resultado de Partido</p>
        </div>

        <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-blue-900/5 border border-gray-100 space-y-6">
          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left w-1/2">Equipos</th>
                  {sets.map((_: any, idx: number) => (
                    <th key={idx} className="px-2 py-3 text-center">
                      Set {idx + 1}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right">Ganador</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className={winnerTeam === "A" ? "bg-blue-50/30 font-semibold" : ""}>
                  <td className="px-4 py-4 text-gray-900">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-blue-600 uppercase font-black tracking-widest mb-0.5">Equipo A</span>
                      {teamA.map((p: any, i: number) => (
                        <div key={i} className="flex flex-col items-start">
                          <span className="text-sm font-semibold">{formatShortName(p.name)}</span>
                          {!p.has_profile ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                              <UserPlus className="w-3 h-3" />
                              Sin reclamar
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </td>
                  {sets.map((s: any, idx: number) => (
                    <td key={idx} className={`px-2 py-4 text-center text-lg ${winnerTeam === "A" ? "text-blue-700 font-black" : "text-gray-500"}`}>
                      {s.a ?? "-"}
                    </td>
                  ))}
                  <td className="px-4 py-4 text-right">
                    {winnerTeam === "A" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white tracking-tighter">
                        GANADOR
                      </span>
                    )}
                  </td>
                </tr>

                <tr className={winnerTeam === "B" ? "bg-blue-50/30 font-semibold" : ""}>
                  <td className="px-4 py-4 text-gray-900">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-red-600 uppercase font-black tracking-widest mb-0.5">Equipo B</span>
                      {teamB.map((p: any, i: number) => (
                        <div key={i} className="flex flex-col items-start">
                          <span className="text-sm font-semibold">{formatShortName(p.name)}</span>
                          {!p.has_profile ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                              <UserPlus className="w-3 h-3" />
                              Sin reclamar
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </td>
                  {sets.map((s: any, idx: number) => (
                    <td key={idx} className={`px-2 py-4 text-center text-lg ${winnerTeam === "B" ? "text-blue-700 font-black" : "text-gray-500"}`}>
                      {s.b ?? "-"}
                    </td>
                  ))}
                  <td className="px-4 py-4 text-right">
                    {winnerTeam === "B" && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white tracking-tighter">
                        GANADOR
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="h-px bg-gray-50" />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-600">
                {format(new Date(match.match_at), "d 'de' MMMM", { locale: es })}
              </p>
            </div>
            <div className="flex items-center gap-2 justify-end">
              <MapPin className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-medium text-gray-600 truncate">{match.club_name}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm space-y-4">
          <h4 className="text-sm font-black text-gray-900 text-center">¿Sos uno de estos jugadores?</h4>
          <p className="text-xs text-gray-500 text-center -mt-2">Reclamá tu perfil para ver tu historial y estadísticas.</p>
          <div className="grid grid-cols-1 gap-2">
            {unclaimedRoster.map((p: any) => (
              <Link
                key={`${p.player_id}-${p.team}`}
                href={`/welcome/claim?claim_match=${encodeURIComponent(match.id)}&claim_player=${encodeURIComponent(p.player_id)}&next=${encodeURIComponent("/player")}`}
                className="w-full"
              >
                <Button variant="outline" className="w-full justify-between rounded-xl h-12 px-4">
                  <span className="truncate text-sm font-semibold">{p.name}</span>
                  <span className="text-[11px] font-black uppercase tracking-widest text-blue-600">Soy yo</span>
                </Button>
              </Link>
            ))}
          </div>
          {unclaimedRoster.length === 0 && (
            <p className="text-xs text-gray-500 text-center font-medium">Todos los jugadores de este partido ya tienen perfil activo.</p>
          )}
        </div>

        <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-xl shadow-blue-200 text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-xl font-bold tracking-tight">
              {unclaimedRoster.length > 0
                ? "Primero reclamá tu perfil"
                : userState === "anonymous"
                  ? "¿Jugaste este partido?"
                  : userState === "unonboarded"
                    ? "¡Casi listo!"
                    : "Seguí tu evolución"}
            </h3>
            <p className="text-blue-100 text-sm font-medium">
              {unclaimedRoster.length > 0
                ? "Si aparecés en esta lista, reclamá tu perfil antes de continuar."
                : userState === "anonymous"
                  ? "Entrá para ver tu historial completo y estadísticas avanzadas."
                  : userState === "unonboarded"
                    ? "Completá tu registro para activar tu perfil en PASALA."
                    : "Revisá tus estadísticas competitivas en tu perfil."}
            </p>
          </div>

          {userState === "anonymous" && (
            <Link href={`/welcome?next=/m/${match.id}`}>
              <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 py-6 rounded-2xl font-black uppercase tracking-widest shadow-lg">
                Entrar a ver mi historial <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          )}

          {userState === "unonboarded" && (
            <Link href="/welcome/onboarding">
              <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 py-6 rounded-2xl font-black uppercase tracking-widest shadow-lg">
                Completar registro <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          )}

          {userState === "onboarded" && (
            <Link href={`/player/matches/${match.id}`}>
              <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 py-6 rounded-2xl font-black uppercase tracking-widest shadow-lg">
                Ver en PASALA <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>

        <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">PASALA - Tu rendimiento al siguiente nivel</p>
      </div>
    </div>
  );
}
