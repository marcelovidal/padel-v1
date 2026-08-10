import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Columnas que alimentan el perfil publico. Se lee `clubs` directo en vez de
 * pasar por el RPC `club_get_public_profile` porque ese RPC vive solamente en
 * la base — no esta en ninguna migracion del repo — y no se puede saber que
 * proyecta sin inspeccionar produccion. Leyendo la tabla se controla la
 * proyeccion y las columnas nuevas entran sin depender de esa definicion.
 */
const PUBLIC_CLUB_COLUMNS_BASE =
  "id,name,display_name,avatar_url,city,region_name,country_code,address,description,contact_phone,courts_count,has_glass,has_synthetic_grass,access_type";

// Igual que en lib/auth.ts: slug y maps_url van aparte para que el perfil siga
// resolviendo por UUID si 20260810_club_public_profile.sql todavia no se aplico.
const PUBLIC_CLUB_COLUMNS = `${PUBLIC_CLUB_COLUMNS_BASE},slug,maps_url`;

export type PublicClub = {
  id: string;
  slug: string | null;
  name: string;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  region_name: string | null;
  country_code: string | null;
  address: string | null;
  description: string | null;
  contact_phone: string | null;
  maps_url: string | null;
  courts_count: number | null;
  has_glass: boolean | null;
  has_synthetic_grass: boolean | null;
  access_type: string | null;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

/**
 * Resuelve el parametro de ruta de `/clubs/[slug]`, que puede ser el slug
 * nuevo o un UUID de un link viejo ya compartido.
 *
 * `matchedBy` le dice a la pagina si tiene que redirigir a la URL canonica.
 *
 * Usa el admin client porque la pagina es publica: sin sesion no hay policy
 * de lectura sobre `clubs` que aplique. Los filtros de visibilidad van
 * explicitos en la query — no hay RLS abajo que los garantice.
 */
export async function findPublicClub(
  param: string
): Promise<{ club: PublicClub; matchedBy: "id" | "slug" } | null> {
  const value = (param || "").trim();
  if (!value) return null;

  const supabase = createAdminClient();
  const matchedBy: "id" | "slug" = isUuid(value) ? "id" : "slug";

  const select = (columns: string) =>
    (supabase as any)
      .from("clubs")
      .select(columns)
      .eq(matchedBy, value)
      .is("deleted_at", null)
      .is("archived_at", null)
      .is("merged_into", null)
      .maybeSingle();

  let { data, error } = await select(PUBLIC_CLUB_COLUMNS);

  // Sin la migracion aplicada no existe la columna slug: buscar por slug es
  // imposible, pero un link por UUID tiene que seguir funcionando.
  if (error && matchedBy === "id") {
    ({ data, error } = await select(PUBLIC_CLUB_COLUMNS_BASE));
  }

  if (error || !data) return null;
  return { club: data as PublicClub, matchedBy };
}

/**
 * URL canonica del perfil. Cae al id si el club todavia no tiene slug —
 * puede pasar entre que se despliega el codigo y se aplica la migracion.
 */
export function publicClubHref(club: { id: string; slug?: string | null }) {
  return `/clubs/${club.slug || club.id}`;
}
