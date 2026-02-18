import { MatchService } from "@/services/match.service";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Trophy, Calendar, MapPin, Users, ArrowRight } from "lucide-react";

export default async function PublicMatchPage({
    params
}: {
    params: { id: string }
}) {
    const matchSvc = new MatchService();
    const match = await matchSvc.getPublicMatchData(params.id);

    if (!match) notFound();

    // Determine user status
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let userState: "anonymous" | "unonboarded" | "onboarded" = "anonymous";
    let playerId: string | null = null;

    if (user) {
        const { data: player } = await (supabase
            .from("players")
            .select("id, onboarding_completed")
            .eq("user_id", user.id)
            .maybeSingle() as any);

        if (player) {
            userState = (player as any).onboarding_completed ? "onboarded" : "unonboarded";
            playerId = (player as any).id;
        } else {
            userState = "unonboarded";
        }
    }

    const teamA = match.roster.filter((p: any) => p.team === "A");
    const teamB = match.roster.filter((p: any) => p.team === "B");
    const result: any = match.results;
    const sets = (result?.sets || []) as any[];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-12 pb-20 px-6">
            <div className="max-w-md mx-auto w-full space-y-8">
                {/* Brand Header */}
                <div className="text-center">
                    <h1 className="text-2xl font-black text-blue-600 tracking-tighter uppercase italic">PASALA</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resultado de Partido</p>
                </div>

                {/* Match Card */}
                <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-blue-900/5 border border-gray-100 space-y-8">
                    {/* Visual Score */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between gap-4">
                            <div className="text-center flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">Equipo A</p>
                                <div className="space-y-1">
                                    {teamA.map((p: any, i: number) => (
                                        <p key={i} className="font-bold text-gray-900 truncate text-sm">{p.name}</p>
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                                <div className="bg-gray-900 text-white px-5 py-2 rounded-2xl text-2xl font-black tabular-nums">
                                    {sets.filter((s: any) => (s.a || 0) > (s.b || 0)).length} - {sets.filter((s: any) => (s.b || 0) > (s.a || 0)).length}
                                </div>
                            </div>
                            <div className="text-center flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-2">Equipo B</p>
                                <div className="space-y-1">
                                    {teamB.map((p: any, i: number) => (
                                        <p key={i} className="font-bold text-gray-900 truncate text-sm">{p.name}</p>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Partial Scores */}
                        <div className="flex justify-center gap-4">
                            {sets.map((s: any, i: number) => (
                                <div key={i} className="bg-gray-50 px-3 py-1 rounded-lg border border-gray-100 flex flex-col items-center">
                                    <span className="text-[8px] font-black uppercase text-gray-400">Set {i + 1}</span>
                                    <span className="text-sm font-bold text-gray-700">{s.a}-{s.b}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-gray-50" />

                    {/* Meta Info */}
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

                {/* Call to Action */}
                <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-xl shadow-blue-200 text-center space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold tracking-tight">
                            {userState === "anonymous"
                                ? "¿Jugaste este partido?"
                                : userState === "unonboarded"
                                    ? "¡Casi listo!"
                                    : "Seguí tu evolución"
                            }
                        </h3>
                        <p className="text-blue-100 text-sm font-medium">
                            {userState === "anonymous"
                                ? "Entrá para ver tu historial completo y estadísticas avanzadas."
                                : userState === "unonboarded"
                                    ? "Completá tu registro para reclamar este partido y ver tu PASALA Index."
                                    : "Revisá tus estadísticas competitivas en tu perfil."
                            }
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
                        <Link href={`/welcome/onboarding?next=/m/${match.id}`}>
                            <Button className="w-full bg-white text-blue-600 hover:bg-blue-50 py-6 rounded-2xl font-black uppercase tracking-widest shadow-lg">
                                Completar Registro <ArrowRight className="ml-2 w-4 h-4" />
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

                {/* Footer simple */}
                <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
                    PASALA • Tu rendimiento al siguiente nivel
                </p>
            </div>
        </div>
    );
}
