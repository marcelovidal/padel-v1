"use server";

import { revalidatePath } from "next/cache";
import { PlayerService } from "@/services/player.service";

function revalidateDirectory() {
  revalidatePath("/player/mi-club/jugadores");
}

export async function assignPlayerCategoryAction(
  clubId: string,
  playerId: string,
  category: number
) {
  if (!Number.isInteger(category) || category < 1 || category > 7) {
    return { error: "INVALID_CATEGORY" };
  }

  try {
    const service = new PlayerService();
    const result = await service.assignClubCategory(clubId, playerId, category);

    if (!result?.success) {
      return { error: result?.error || "UNKNOWN" };
    }

    revalidateDirectory();
    return { data: result };
  } catch (error: any) {
    console.error("[assignPlayerCategoryAction] RPC error", error);
    return { error: error.message || "UNKNOWN" };
  }
}

export async function removePlayerCategoryAction(clubId: string, playerId: string) {
  try {
    const service = new PlayerService();
    const result = await service.removeClubCategory(clubId, playerId);

    if (!result?.success) {
      return { error: result?.error || "UNKNOWN" };
    }

    revalidateDirectory();
    return { data: result };
  } catch (error: any) {
    console.error("[removePlayerCategoryAction] RPC error", error);
    return { error: error.message || "UNKNOWN" };
  }
}
