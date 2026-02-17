"use server";

import { PlayerService } from "@/services/player.service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const playerService = new PlayerService();

export async function completeOnboardingAction(prevState: any, formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const payload = {
        display_name: formData.get("display_name") as string,
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
        phone: formData.get("phone") as string,
        position: formData.get("position") as any,
        category: Number(formData.get("category")),
        country_code: formData.get("country_code") as string || 'AR',
        region_code: formData.get("region_code") as string,
        region_name: formData.get("region_name") as string,
        city: formData.get("city") as string,
        city_id: formData.get("city_id") as string,
        birth_year: formData.get("birth_year") ? Number(formData.get("birth_year")) : undefined,
        avatar_url: formData.get("avatar_url") as string,
    };

    try {
        await playerService.completeOnboarding(payload);
    } catch (error: any) {
        if (error.message === "ONBOARDING_ALREADY_COMPLETED") {
            return { success: false, code: "ONBOARDING_ALREADY_COMPLETED", error: "El onboarding ya fue completado para este usuario." };
        }
        return { success: false, error: error.message };
    }

    revalidatePath("/player");
    revalidatePath("/player/profile");

    return { success: true, redirect: "/player" };
}

export async function uploadAvatarAction(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("No autenticado");

    const file = formData.get("file") as File;
    if (!file) return { error: "No se proporcionó ningún archivo" };

    try {
        const path = await playerService.uploadAvatar(file, user.id);
        const signedUrl = await playerService.getAvatarUrl(path);
        return { success: true, path, signedUrl };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
