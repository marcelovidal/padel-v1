import React from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OnboardingForm from "@/components/player/OnboardingForm";

export default async function OnboardingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/player/login");
    }

    // Verificar si ya existe el jugador y si completó el onboarding
    const { data: player } = (await supabase
        .from("players")
        .select("id, onboarding_completed, first_name, last_name, display_name")
        .eq("user_id", user.id)
        .maybeSingle()) as any;

    if (player?.onboarding_completed) {
        redirect("/player");
    }

    const initialData = {
        email: user.email,
        first_name: player?.first_name || user.user_metadata?.full_name?.split(" ")[0] || "",
        last_name: player?.last_name || user.user_metadata?.full_name?.split(" ").slice(1).join(" ") || "",
        display_name: player?.display_name || user.user_metadata?.full_name || "",
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] py-12 px-6 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-blue-50 via-transparent to-transparent">
            <div className="max-w-4xl mx-auto mb-12 text-center space-y-4">
                <h1 className="text-4xl font-black text-gray-900 tracking-tight italic transform -skew-x-6 inline-block">
                    PASALA
                </h1>
                <p className="text-gray-500 font-medium">Configurá tu perfil para empezar a jugar.</p>
            </div>
            <OnboardingForm initialData={initialData} />
        </div>
    );
}
