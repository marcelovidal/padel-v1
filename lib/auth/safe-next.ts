/**
 * Destino por defecto cuando el `next` recibido no es usable.
 */
export const DEFAULT_NEXT = "/player";

/**
 * Caracteres de control, incluido NUL. Se usan para partir el parseo de la URL.
 * Se arma con `String.fromCharCode` para que el archivo no contenga bytes de
 * control literales.
 */
const CONTROL_CHARS = new RegExp(
  `[${String.fromCharCode(0)}-${String.fromCharCode(31)}${String.fromCharCode(127)}]`
);

/**
 * Valida un `next` recibido de la URL y devuelve un path relativo seguro.
 *
 * El chequeo que habia antes en `/auth/callback` era `rawNext.startsWith("/")`,
 * y eso deja pasar `//evil.com`: `new URL("//evil.com", origin)` resuelve a
 * `https://evil.com` porque `//` es una URL protocol-relative. Era un open
 * redirect — bastaba mandar a alguien a `/auth/callback?next=//evil.com` para
 * sacarlo del sitio con la sesion recien creada.
 *
 * Se rechaza todo lo que no sea inequivocamente un path de este origen:
 *
 * - `//host` — protocol-relative, resuelve a otro origen
 * - cualquier `\` — los navegadores lo normalizan a `/` antes de resolver,
 *   asi que `/\evil.com` y `\\evil.com` terminan en otro host
 * - `http://…`, `javascript:`, `data:` — cualquier cosa con esquema
 * - lo que no empiece con `/` — relativo al path actual, no controlable
 *
 * La comprobacion final no confia en la lista: resuelve el candidato contra un
 * origen de prueba y exige que el origen resultante no haya cambiado. Si
 * `new URL()` lo lleva a otro lado se descarta, sin importar como estaba
 * escrito.
 */
export function safeNextPath(
  rawNext: string | null | undefined,
  fallback: string = DEFAULT_NEXT
): string {
  if (typeof rawNext !== "string") return fallback;

  const value = rawNext.trim();
  if (value === "" || value === "/") return fallback;

  // Debe ser un path absoluto de este sitio.
  if (!value.startsWith("/")) return fallback;

  // Protocol-relative, y backslash en cualquier posicion: es la via habitual
  // para evadir este tipo de validacion.
  if (value.includes("\\")) return fallback;
  if (value[1] === "/") return fallback;

  if (CONTROL_CHARS.test(value)) return fallback;

  // Prueba final contra el parser real: si resolverlo cambia el origen, no era
  // un path relativo por mas que lo pareciera.
  const probe = "https://pasala.invalid";
  try {
    const resolved = new URL(value, probe);
    if (resolved.origin !== probe) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}
