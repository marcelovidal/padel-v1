"use server";

import { createClient } from "@/lib/supabase/server";
import { PlayerService } from "@/services/player.service";

const playerService = new PlayerService();

const GEOREF_BASE = "https://apis.datos.gob.ar/georef/api";

/**
 * Tries to resolve city_id + region_code from freetext city/region_name saved during registration.
 * Called silently on dashboard load when city_id is null but city text is present.
 * Returns true if resolved and saved, false if could not resolve (API down or no match).
 */
export async function resolvePlayerCityAction(): Promise<{ resolved: boolean; city?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { resolved: false };

  const { data: player } = await (supabase as any)
    .from("players")
    .select("id, city, city_id, region_name, region_code, display_name, position")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!player) return { resolved: false };
  // Already resolved or nothing to resolve
  if (player.city_id || !player.city) return { resolved: false };

  const city: string = player.city;
  const regionName: string | null = player.region_name;

  try {
    const url = new URL(`${GEOREF_BASE}/localidades`);
    url.searchParams.set("nombre", city);
    url.searchParams.set("max", "5");
    url.searchParams.set("exacto", "false");
    if (regionName) url.searchParams.set("provincia", regionName);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) return { resolved: false };

    const data = await res.json();
    const hits: any[] = data.localidades ?? [];

    if (hits.length === 0) return { resolved: false };

    // Prefer "Localidad simple" over "Entidad" when name matches — avoids duplicate entries
    const PREFERRED = "Localidad simple";
    const exactMatches = hits.filter((h) => h.nombre.toLowerCase() === city.toLowerCase());
    const best =
      exactMatches.find((h) => h.categoria === PREFERRED) ||
      exactMatches[0] ||
      hits.find((h) => h.categoria === PREFERRED) ||
      hits[0];

    // Also resolve province code if missing
    const resolvedRegionCode: string = player.region_code || String(best.provincia?.id || "");
    const resolvedRegionName: string = player.region_name || best.provincia?.nombre || "";

    await playerService.updatePlayerProfile({
      player_id: player.id,
      display_name: player.display_name,
      position: player.position,
      city: best.nombre,
      city_id: String(best.id),
      region_code: resolvedRegionCode,
      region_name: resolvedRegionName,
      country_code: "AR",
    });

    return { resolved: true, city: best.nombre };
  } catch {
    return { resolved: false };
  }
}
