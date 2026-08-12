import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { safeNextPath } from "@/lib/auth/safe-next";
import { CURRENT_PATH_HEADER } from "@/lib/auth/request-path";

function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/player/login");
  }

  // Verificar que el usuario tenga rol admin
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // TODO: narrow `profile` type instead of using `as any` once Database types are aligned
  if (profileError || !profile || (profile as any).role !== "admin") {
    redirect("/login");
  }

  return { user, profile };
}

/**
 * A donde volver despues de loguearse o completar el onboarding.
 *
 * Prioridad:
 * 1. El `next` explicito que pase quien llama. Obligatorio en las paginas
 *    fuera del `matcher` del middleware — hoy `/clubs/[slug]/book`, que es
 *    justo la reserva publica.
 * 2. El header que pone el middleware con la URL pedida. Cubre solo
 *    `/player/*`, `/welcome/*`, `/admin/*` y `/login`.
 * 3. Nada: se redirige pelado, como antes.
 */
async function resolveNextPath(explicitNext?: string): Promise<string | null> {
  if (explicitNext) return safeNextPath(explicitNext, "") || null;

  const fromHeader = headers().get(CURRENT_PATH_HEADER);
  if (!fromHeader) return null;
  return safeNextPath(fromHeader, "") || null;
}

function withNext(target: string, next: string | null): string {
  if (!next) return target;
  const url = new URL(target, "https://pasala.invalid");
  url.searchParams.set("next", next);
  return `${url.pathname}${url.search}`;
}

export type RequireAuthOptions = {
  /**
   * URL a la que volver, con searchParams. Solo hace falta en paginas fuera
   * del `matcher` del middleware; en el resto se deduce del header.
   */
  next?: string;
};

export async function requirePlayer(options?: RequireAuthOptions) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  const nextPath = await resolveNextPath(options?.next);

  if (authError || !user) {
    // redirect to player login (admins use /login)
    redirect(withNext("/player/login", nextPath));
  }

  const { data: player, error: playerError } = await (supabase
    .from("players")
    .select(
      "id, onboarding_completed, display_name, avatar_url, first_name, last_name, city, city_id, region_code, region_name, country_code, position, category, birth_year, phone, is_coach, coach_enabled_at, is_club_owner, club_owner_enabled_at"
    )
    .eq("user_id", user.id)
    .maybeSingle() as any);

  // Si no hay player o no completó el onboarding, redirigir al flujo de bienvenida
  if (playerError || !player || !player.onboarding_completed) {
    redirect(withNext("/welcome/onboarding", nextPath));
  }

  return { user, player };
}

export async function requireClub() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/welcome?portal=club&mode=login");
  }

  const { data: club, error: clubError } = await (supabase as any)
    .from("clubs")
    .select("id,name,city,city_id,region_code,region_name,country_code,claim_status,claimed_by,claimed_at,address,description,access_type,courts_count,has_glass,has_synthetic_grass,contact_first_name,contact_last_name,contact_phone,avatar_url,onboarding_completed,onboarding_completed_at,created_at,updated_at,deleted_at")
    .eq("claimed_by", user.id)
    .eq("claim_status", "claimed")
    .is("deleted_at", null)
    .order("claimed_at", { ascending: false })
    .maybeSingle();

  if (clubError || !club) {
    redirect("/welcome?portal=club&mode=login");
  }

  return { user, club };
}

const CLUB_COLUMNS_BASE =
  "id,name,city,city_id,region_code,region_name,country_code,claim_status,claimed_by,claimed_at,address,description,access_type,courts_count,has_glass,has_synthetic_grass,contact_first_name,contact_last_name,contact_phone,avatar_url,onboarding_completed,onboarding_completed_at,created_at,updated_at,deleted_at,owner_player_id";

// Columnas de 20260810_club_public_profile.sql. Van aparte porque si esa
// migracion todavia no se aplico, pedirlas hace fallar el select entero y el
// panel del club queda inaccesible — requireClubOwner interpreta el error como
// "sin club" y redirige afuera. Con el fallback, hasta que se aplique la
// migracion el panel funciona sin slug ni maps_url en vez de no funcionar.
const CLUB_COLUMNS_PUBLIC_PROFILE = "slug,maps_url";
const CLUB_COLUMNS = `${CLUB_COLUMNS_BASE},${CLUB_COLUMNS_PUBLIC_PROFILE}`;

/**
 * Los redirects propios de esta funcion —"solicita acceso", "club no
 * encontrado"— son mensajes de estado, no interrupciones de un viaje: nadie
 * vuelve de ahi a lo que estaba haciendo, asi que no llevan `next`. El
 * `options` existe solo para reenviarselo a `requirePlayer`, que si lo usa.
 */
export async function requireClubOwner(options?: RequireAuthOptions) {
  const { user, player } = await requirePlayer(options);

  if (!(player as any).is_club_owner) {
    redirect("/player/profile?msg=solicita-acceso-club");
  }

  // Usar service role para bypassar RLS — el player no tiene política de lectura
  // sobre clubs, y la de club_admins depende de q6_can_manage_club
  const sbAdmin = createAdminClient();

  // TODO: un jugador puede administrar varios clubes; por ahora se toma el más
  // antiguo en club_admins. Falta un selector de club + club activo en sesión.
  const { data: memberships } = await (sbAdmin as any)
    .from("club_admins")
    .select("club_id, created_at")
    .eq("player_id", player.id)
    .order("created_at", { ascending: true });

  const clubIds = ((memberships || []) as any[]).map((m) => m.club_id);

  let club: any = null;

  if (clubIds.length > 0) {
    // Se filtran acá los clubes borrados: club_admins conserva la fila para no
    // perder el dato si el club se restaura.
    const selectClubs = (columns: string) =>
      (sbAdmin as any).from("clubs").select(columns).in("id", clubIds).is("deleted_at", null);

    let { data: rows, error: clubsError } = await selectClubs(CLUB_COLUMNS);
    if (clubsError) {
      ({ data: rows } = await selectClubs(CLUB_COLUMNS_BASE));
    }

    const byId = new Map(((rows || []) as any[]).map((c) => [c.id, c]));
    club = clubIds.map((id) => byId.get(id)).find(Boolean) ?? null;
  }

  if (!club) {
    redirect("/player/profile?msg=club-no-encontrado");
  }

  return { user, player, club };
}

export async function getOptionalPlayer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, playerId: null };

  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return { user, playerId: (player as any)?.id ?? null };
}


