/**
 * Header con la URL que la persona pidio, puesto por el middleware.
 *
 * En App Router no hay API para leer la URL actual desde un server component,
 * asi que el middleware la reinyecta como header y `requirePlayer()` la lee con
 * `headers()`.
 *
 * Vive en su propio modulo y no en `middleware.ts` porque importar el
 * middleware desde `lib/auth.ts` arrastraria todo ese modulo —cliente de
 * Supabase incluido— a cada server component que pida sesion.
 *
 * Solo llega a las rutas del `matcher` del middleware: `/player/*`,
 * `/welcome/*`, `/admin/*` y `/login`. Las paginas fuera de ahi —hoy
 * `/clubs/[slug]/book`— tienen que pasar el `next` explicito.
 */
export const CURRENT_PATH_HEADER = "x-pasala-path";
