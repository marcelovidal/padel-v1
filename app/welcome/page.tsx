import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { getOptionalPlayer } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function WelcomePage({
    searchParams
}: {
    searchParams: { next?: string }
}) {
    const { user, playerId } = await getOptionalPlayer();
    const next = searchParams.next || "/player";

    // Si ya tiene perfil y está logueado, al destino o dashboard
    if (user && playerId) {
        redirect(next);
    }

    const loginUrl = searchParams.next
        ? `/player/login?next=${encodeURIComponent(searchParams.next)}`
        : "/player/login";

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100 via-white to-white">
            <div className="max-w-md w-full space-y-12 text-center">
                {/* Logo / Brand */}
                <div className="space-y-4">
                    <h1 className="text-6xl font-black text-blue-600 tracking-tighter italic transform -skew-x-6">
                        PASALA
                    </h1>
                    <p className="text-xl text-gray-600 font-medium">
                        La red más grande de pádel. Uní tu juego, encontrá desafíos y subí de nivel.
                    </p>
                </div>

                {/* Auth Actions */}
                <div className="space-y-4 pt-8">
                    <GoogleAuthButton label="Continuar con Google" />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500 font-medium">o con tu cuenta</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        <Link href={loginUrl} className="w-full">
                            <Button variant="outline" className="w-full py-6 text-lg font-semibold rounded-2xl border-2">
                                Ingresar con Email
                            </Button>
                        </Link>
                        <Link href={loginUrl} className="w-full">
                            <Button variant="ghost" className="w-full py-4 text-gray-500 hover:text-blue-600 transition-colors">
                                Crear cuenta nueva
                            </Button>
                        </Link>
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
