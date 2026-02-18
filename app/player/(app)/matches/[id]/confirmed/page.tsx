import { requirePlayer } from "@/lib/auth";
import { MatchService } from "@/services/match.service";
import { notFound, redirect } from "next/navigation";
import { Trophy, Users, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { WhatsAppShareButton } from "@/components/matches/WhatsAppShareButton";
import { generateMatchShareMessage } from "@/lib/match/matchUtils";
import { getSiteUrl } from "@/lib/utils/url";

export default async function MatchConfirmedPage({
    params
}: {
    params: { id: string }
}) {
    const { player } = await requirePlayer();
    const matchSvc = new MatchService();

    // Fetch match data and sharing stats in parallel
    const [match, shareStats] = await Promise.all([
        matchSvc.getMatchById(params.id),
        matchSvc.getShareStats()
    ]);

    if (!match || !match.match_results) notFound();

    const result = match.match_results;
    const teamA = match.match_players.filter(p => p.team === "A");
    const teamB = match.match_players.filter(p => p.team === "B");

    const teamANames = teamA.map(p => p.players?.first_name).join("/");
    const teamBNames = teamB.map(p => p.players?.first_name).join("/");

    // Construct the standardized message using centered helper
    const siteUrl = getSiteUrl();
    const message = generateMatchShareMessage(match, siteUrl);

    const sets = (result.sets || []) as any[];
    const isSubtle = shareStats.ignored_last_3;

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 flex flex-col items-center justify-center">
            <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Status Hero */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4 animate-bounce">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">¡Resultado Guardado!</h1>
                    <p className="text-gray-500 font-medium">El marcador oficial ha sido registrado.</p>
                </div>

                {/* Score Card */}
                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-blue-900/5 border border-gray-100 space-y-8">
                    {/* Score display */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="text-center flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Equipo A</p>
                            <p className="font-bold text-gray-900 truncate">{teamANames}</p>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                            <div className="bg-gray-900 text-white px-4 py-1.5 rounded-xl text-xl font-black tabular-nums">
                                {result.winner_team === "A" ? "Victoria" : "Derrota"}
                                {" "}{sets.filter((s: any) => (s.a || 0) > (s.b || 0)).length} - {sets.filter((s: any) => (s.b || 0) > (s.a || 0)).length}
                            </div>
                            <div className="flex gap-1">
                                {sets.map((s, i) => (
                                    <span key={i} className="text-[10px] font-bold text-gray-400">
                                        {s.a}-{s.b}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="text-center flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Equipo B</p>
                            <p className="font-bold text-gray-900 truncate">{teamBNames}</p>
                        </div>
                    </div>

                    <div className="h-px bg-gray-50" />

                    {/* Share Section */}
                    <div className="space-y-4">
                        <div className="text-center">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Compartir con los demás</h2>
                        </div>

                        <WhatsAppShareButton
                            matchId={match.id}
                            message={message}
                            variant={isSubtle ? "subtle" : "default"}
                        />
                    </div>
                </div>

                {/* Back Link */}
                <div className="text-center">
                    <Link
                        href="/player"
                        className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Volver al inicio
                    </Link>
                </div>
            </div>
        </div>
    );
}
