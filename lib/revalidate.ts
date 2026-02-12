import { revalidatePath } from "next/cache";

/**
 * Common revalidation paths for player profile updates
 */
export function revalidateProfile(playerId: string) {
    revalidatePath("/player/profile");
    revalidatePath("/player/players");
    revalidatePath(`/player/players/${playerId}`);
    revalidatePath("/player"); // Dashboard
}
