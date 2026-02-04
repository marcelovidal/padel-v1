import { createClient } from "@/lib/supabase/server";
import { PlayerRepository } from "@/repositories/player.repository";
import { AssessmentService } from "@/services/assessment.service";
import { PendingAssessmentCard } from "@/components/assessments/PendingAssessmentCard";
import { redirect } from "next/navigation";

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

    // Get Pending Assessments
    const assessmentService = new AssessmentService();
    const pendingAssessments = await assessmentService.getPendingAssessments(player.id);

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <h1 className="text-2xl font-bold mb-6">Mi Perfil</h1>

            <div className="space-y-4 mb-8">
                <h2 className="text-lg font-semibold border-b pb-2">Partidos sin evaluar</h2>
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
