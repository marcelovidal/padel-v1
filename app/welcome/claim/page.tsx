import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MatchService } from "@/services/match.service";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { ClaimProfileButton } from "@/components/auth/ClaimProfileButton";

function buildClaimReturnPath(claimPlayer: string, claimMatch?: string, nextPath?: string) {
    const params = new URLSearchParams();
    params.set("claim_player", claimPlayer);
    if (claimMatch) params.set("claim_match", claimMatch);
    if (nextPath) params.set("next", nextPath);
    return `/welcome/claim?${params.toString()}`;
}

export default async function WelcomeClaimPage({
    searchParams,
}: {
    searchParams: {
        claim_player?: string;
        claim_match?: string;
        next?: string;
    };
}) {
    const targetPlayerId = searchParams.claim_player;
    const claimMatchId = searchParams.claim_match;
    const nextPath = searchParams.next || "/player";

    if (!targetPlayerId) {
        return (
            <div className="min-h-screen bg-gray-50 px-6 py-12">
                <div className="max-w-xl mx-auto bg-white rounded-3xl border border-gray-100 p-8 text-center space-y-4">
                    <h1 className="text-2xl font-black text-gray-900">No encontramos el perfil a reclamar</h1>
                    <p className="text-gray-600">Volvé al inicio y abrí el link compartido del partido.</p>
                    <Link href="/welcome" className="inline-block text-blue-600 font-bold hover:text-blue-700">
                        Ir a bienvenida
                    </Link>
                </div>
            </div>
        );
    }

    const claimReturnPath = buildClaimReturnPath(targetPlayerId, claimMatchId, nextPath);
    const loginUrl = `/player/login?next=${encodeURIComponent(claimReturnPath)}`;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const matchSvc = new MatchService();
    const match = claimMatchId ? await matchSvc.getPublicMatchData(claimMatchId) : null;

    const targetInRoster = match?.roster?.find((p: any) => p.player_id === targetPlayerId) || null;
    const teamA = match?.roster?.filter((p: any) => p.team === "A") || [];
    const teamB = match?.roster?.filter((p: any) => p.team === "B") || [];
    const sets = (match?.results?.sets || []) as any[];
    const setsLabel = sets.length > 0 ? sets.map((s: any) => `${s.a}-${s.b}`).join(" ") : "Sin resultado cargado";

    return (
        <div className="min-h-screen bg-gray-50 px-6 py-12">
            <div className="max-w-2xl mx-auto space-y-6">
                <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-4">
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Reclamar mi perfil</h1>
                    <p className="text-gray-600 font-medium">
                        Este perfil fue creado por otro jugador. Si sos vos, podés reclamarlo para ver tu historial y estadísticas.
                    </p>
                    <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <p className="text-xs font-black uppercase tracking-widest text-blue-600 mb-1">Perfil objetivo</p>
                        <p className="text-lg font-bold text-blue-900">
                            {targetInRoster?.name || "Jugador del partido"}
                        </p>
                    </div>
                </div>

                {match && (
                    <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-5">
                        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Partido compartido</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-blue-600 mb-2">Equipo A</p>
                                <div className="space-y-1">
                                    {teamA.map((p: any, idx: number) => (
                                        <p key={`${p.player_id || idx}-a`} className={`font-semibold ${p.player_id === targetPlayerId ? "text-blue-700" : "text-gray-800"}`}>
                                            {p.name}
                                        </p>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-2">Equipo B</p>
                                <div className="space-y-1">
                                    {teamB.map((p: any, idx: number) => (
                                        <p key={`${p.player_id || idx}-b`} className={`font-semibold ${p.player_id === targetPlayerId ? "text-blue-700" : "text-gray-800"}`}>
                                            {p.name}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                            <p className="text-xs font-black uppercase tracking-widest text-gray-500">Resultado</p>
                            <p className="text-sm font-bold text-gray-900">{setsLabel}</p>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-3xl border border-gray-100 p-8 space-y-4">
                    {!user ? (
                        <>
                            <p className="text-sm text-gray-600">Iniciá sesión para continuar con el reclamo.</p>
                            <GoogleAuthButton label="Continuar con Google" nextPath={claimReturnPath} />
                            <Link
                                href={loginUrl}
                                className="inline-flex w-full items-center justify-center py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                            >
                                Continuar con Email
                            </Link>
                        </>
                    ) : (
                        <ClaimProfileButton
                            targetPlayerId={targetPlayerId}
                            matchId={claimMatchId}
                            nextPath={nextPath}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
