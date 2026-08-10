/**
 * Valida que una URL sea un link de Google Maps.
 *
 * Los cuatro hosts que Google usa para compartir un lugar:
 *   google.<tld>/maps        — link largo desde el navegador
 *   www. / maps. google...   — variantes del mismo
 *   goo.gl/maps/...          — acortador viejo
 *   maps.app.goo.gl/...      — acortador actual del boton Compartir
 *
 * El TLD se acota a [a-z]{2,} con un solo nivel opcional (.com, .com.ar,
 * .co.uk) en vez de [a-z.]+, porque este ultimo hace pasar hosts como
 * google.com.evil.com. Solo https.
 *
 * Este regex tiene que quedar en sync con el de club_update_public_profile
 * en 20260810_club_public_profile.sql, que lo repite como defensa en
 * profundidad — el RPC es invocable directamente con el anon key.
 */
const GOOGLE_MAPS_RE =
  /^https:\/\/((www|maps)\.)?google\.[a-z]{2,}(\.[a-z]{2,})?\/maps|^https:\/\/maps\.google\.[a-z]{2,}(\.[a-z]{2,})?\/|^https:\/\/goo\.gl\/maps\/|^https:\/\/maps\.app\.goo\.gl\//i;

export function isGoogleMapsUrl(value: string): boolean {
  return GOOGLE_MAPS_RE.test(value.trim());
}

export const MAPS_URL_HINT =
  "Pegá el link de Google Maps del club. Sirve el de 'Compartir' (maps.app.goo.gl/...) o la URL larga (google.com/maps/...).";
