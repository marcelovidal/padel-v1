import { getOptionalPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";
import PlayerLoginForm from "@/components/player/PlayerLoginForm";

export default async function WelcomePage() {
    const { user, playerId } = await getOptionalPlayer();

    // Si ya tiene perfil y está logueado, al dashboard
    if (user && playerId) {
        redirect("/player");
    }

    const hasSessionWithoutPlayer = !!user && !playerId;

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-white">
            <div className="max-w-md w-full space-y-12 text-center">
                {/* Brand Header */}
                <div className="space-y-4 animate-in fade-in slide-in-from-top-6 duration-700">
                    <h1 className="text-7xl font-black text-blue-600 tracking-tighter italic transform -skew-x-6">
                        PASALA
                    </h1>
                    <p className="text-xl text-gray-500 font-medium max-w-sm mx-auto leading-relaxed">
                        Registra tu juego, analiza tus resultados y subí el nivel
                    </p>
                </div>

                {/* Unified Auth Form */}
                <div className="bg-white/40 backdrop-blur-sm p-2 rounded-[40px] border border-white/50 shadow-2xl shadow-blue-900/5 animate-in fade-in zoom-in duration-1000 delay-200">
                    <div className="bg-white p-8 md:p-10 rounded-[32px] border border-gray-100 shadow-sm">
                        <PlayerLoginForm hasSessionWithoutPlayer={hasSessionWithoutPlayer} />
                    </div>
                </div>

                {/* Footer info */}
                <div className="pt-12 text-gray-400 text-sm italic font-light">
                    Transformando el pádel amateur en profesional.
                </div>
            </div>
        </div>
    );
}
