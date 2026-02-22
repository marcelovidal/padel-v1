import { requirePlayer } from "@/lib/auth";
import { MatchService } from "@/services/match.service";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { ShareButtons } from "@/components/matches/ShareButtons";
import { buildPublicMatchUrl, buildShareMessage } from "@/lib/share/shareMessage";
import { getSiteUrl } from "@/lib/utils/url";

function formatPlayerShortName(firstName?: string | null, lastName?: string | null): string {
    if (!firstName && !lastName) return "?";
    if (!lastName) return firstName || "?";
    return `${firstName?.charAt(0)}. ${lastName}`;
}

export default async function MatchConfirmedPage({
    params
}: {
    params: { id: string }
}) {
    await requirePlayer();
    const matchSvc = new MatchService();

    const match = await matchSvc.getMatchById(params.id);

    if (!match || !match.match_results) notFound();

    const result = match.match_results;
    const teamA = match.match_players.filter(p => p.team === "A");
    const teamB = match.match_players.filter(p => p.team === "B");

    const teamANames = teamA.map((p) => formatPlayerShortName(p.players?.first_name, p.players?.last_name)).join(" / ");
    const teamBNames = teamB.map((p) => formatPlayerShortName(p.players?.first_name, p.players?.last_name)).join(" / ");

    const siteUrl = getSiteUrl();
    const message = buildShareMessage(match, siteUrl);
    const shareUrl = buildPublicMatchUrl(match.id, siteUrl);

    const sets = (result.sets || []) as any[];

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
                <div className="bg-white rounded-[32px] p-5 sm:p-8 shadow-xl shadow-blue-900/5 border border-gray-100 space-y-8">
                    {/* Score display */}
                    <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-center flex-1 rounded-2xl bg-blue-50/40 p-3 sm:bg-transparent sm:p-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-1">Equipo A</p>
                            <p className="font-bold text-gray-900 text-sm leading-snug break-words sm:text-base">{teamANames}</p>
                        </div>
                        <div className="flex flex-col items-center gap-2 order-first sm:order-none">
                            <div className="bg-gray-900 text-white px-3 py-2 rounded-xl text-center font-black tabular-nums leading-tight min-w-[140px]">
                                <div className="text-[11px] uppercase tracking-wider text-gray-200">
                                    {result.winner_team === "A" ? "Victoria" : "Derrota"}
                                </div>
                                <div className="text-lg sm:text-xl">
                                    {sets.filter((s: any) => (s.a || 0) > (s.b || 0)).length} - {sets.filter((s: any) => (s.b || 0) > (s.a || 0)).length}
                                </div>
                            </div>
                            <div className="flex flex-wrap justify-center gap-1 max-w-full">
                                {sets.map((s, i) => (
                                    <span key={i} className="rounded-md bg-gray-50 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                                        {s.a}-{s.b}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="text-center flex-1 rounded-2xl bg-red-50/40 p-3 sm:bg-transparent sm:p-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">Equipo B</p>
                            <p className="font-bold text-gray-900 text-sm leading-snug break-words sm:text-base">{teamBNames}</p>
                        </div>
                    </div>

                    <div className="h-px bg-gray-50" />

                    {/* Share Section */}
                    <div className="space-y-4">
                        <div className="text-center">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Compartir con los demás</h2>
                        </div>

                        <ShareButtons
                            matchId={match.id}
                            message={message}
                            shareUrl={shareUrl}
                            variant="default"
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
