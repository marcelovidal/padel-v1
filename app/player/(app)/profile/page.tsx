import { createClient } from "@/lib/supabase/server";
import { PlayerRepository } from "@/repositories/player.repository";
import { AssessmentService } from "@/services/assessment.service";
import { PendingAssessmentCard } from "@/components/assessments/PendingAssessmentCard";
import { redirect } from "next/navigation";

import { MatchService } from "@/services/match.service";
import { PlayerStatsCards } from "@/components/player/PlayerStatsCards";
import { PlayerAttributesChart } from "@/components/player/PlayerAttributesChart";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PlayerProfilePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Find player associated with this user
    const playerRepository = new PlayerRepository();
    const player = await playerRepository.findByUserId(user.id);

    if (!player) {
        return (
            <div className="container mx-auto p-4 max-w-2xl">
                <h1 className="text-2xl font-bold mb-4">Mi Perfil</h1>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <p className="text-yellow-700">
                        No se encontró un perfil de jugador asociado a tu cuenta de usuario.
                        Por favor contacta al administrador.
                    </p>
                </div>
            </div>
        );
    }

    const assessmentService = new AssessmentService();
    const matchService = new MatchService();

    const [pendingAssessments, stats, averages] = await Promise.all([
        assessmentService.getPendingAssessments(player.id),
        matchService.getPlayerStats(player.id),
        assessmentService.getPlayerAverages(player.id)
    ]);

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Mi Perfil</h1>
                <Link href={`/player/players/${player.id}/edit`}>
                    <Button variant="outline" className="rounded-2xl border-gray-200 font-bold hover:bg-gray-50 transition-all active:scale-95">
                        Editar Perfil
                    </Button>
                </Link>
            </div>

            <div className="mb-8">
                <h2 className="text-lg font-semibold border-b pb-2 mb-4">Resumen</h2>
                <PlayerStatsCards stats={stats} />
            </div>

            <div className="mb-8">
                <h2 className="text-lg font-semibold border-b pb-2 mb-4">Mis Atributos</h2>
                <PlayerAttributesChart data={averages} />
            </div>

            <div className="space-y-4 mb-8">
                <h2 className="text-lg font-semibold border-b pb-2">Evaluaciones Pendientes</h2>
                {pendingAssessments.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No tienes partidos pendientes de evaluación.</p>
                ) : (
                    <div className="space-y-4">
                        {pendingAssessments.map((match) => (
                            <PendingAssessmentCard
                                key={match.id}
                                match={match}
                                playerId={player.id}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="mb-8">
                <h2 className="text-lg font-semibold border-b pb-2">Estadísticas</h2>
                <p className="text-sm text-gray-400 mt-2">Próximamente...</p>
            </div>
        </div>
    );
}
