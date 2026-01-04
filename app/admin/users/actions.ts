"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PlayerService } from "@/services/player.service";
import { updatePlayerSchema } from "@/schemas/player.schema";

const playerService = new PlayerService();

/**
 * Flow decision: This is a full-page edit — after successful update
 * we perform a `redirect()` to `/admin/users`. For embedded forms we
 * would return `{ ok: true }` instead (see project notes).
 */
export async function updatePlayerAction(
  prevState: { error?: string } | null,
  formData: FormData
) {
  let shouldRedirect = false;
  try {
    const data = {
      id: formData.get("id") as string,
      first_name: formData.get("first_name") as string | undefined,
      last_name: formData.get("last_name") as string | undefined,
      email: (formData.get("email") as string) || undefined,
      phone: (formData.get("phone") as string) || undefined,
      position: (formData.get("position") as string) as
        | "drive"
        | "reves"
        | "cualquiera"
        | undefined,
      status: (formData.get("status") as string) as "active" | "inactive" | undefined,
      category: (formData.get("category") as string) || undefined,
    };

    const validated = updatePlayerSchema.parse(data);

    await playerService.updatePlayer(validated);

    // Indicar al flujo que debe redirigir después del try/catch
    shouldRedirect = true;
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return { error: error.errors[0]?.message || "Datos inválidos" };
    }
    // Rethrow NEXT_REDIRECT internal marker if present to avoid swallowing it
    // TODO: avoid `as any` by narrowing error types (preserve runtime behavior)
    const digest = (error as any)?.digest ?? (error as any)?.message ?? "";
    if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
      throw error;
    }

    return { error: error?.message || "Error al actualizar el jugador" };
  }

  if (shouldRedirect) {
    // Evitar lista stale
    revalidatePath(`/admin/users`);
    redirect(`/admin/users`);
  }
}
