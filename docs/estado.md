# PASALA — Estado al cierre del 12 de agosto de 2026

Documento de arranque. Si estás retomando desde otra máquina, leé esto
primero y seguí el orden de la sección 7.

`docs/decisiones.md` dice **por qué** están tomadas las decisiones.
Este archivo dice **dónde quedó todo**.

Todo lo que sigue está medido contra producción el 12/08/2026 con
sondas de solo lectura, salvo donde diga explícitamente "sin confirmar".

---

## 1. Migraciones de Supabase

Las migraciones de este proyecto **se aplican a mano en el SQL Editor**.
Que el archivo esté en el repo no significa que esté vivo en la base.

### APLICADAS en producción — no re-ejecutar

| Migración | Qué dejó | Cómo se confirmó |
|---|---|---|
| `20260808_fix_q6_can_manage_club_is_club_owner.sql` | guardián de gestión de club | `q6_can_manage_club` expuesta |
| `20260808_add_count_players_in_cities.sql` | RPC `club_count_players_in_cities(p_city_ids text[])` | existe en el OpenAPI y responde `NOT_AUTHENTICATED` (el guard corre) |
| `20260808_fix_notification_links_mi_club.sql` | links de notificación a `/player/mi-club/...` | notificación del 12/08 01:14 con `payload->>link = /player/mi-club/dashboard/leagues/...` |
| `20260810_complete_incomplete_match_roster.sql` | RPC `player_complete_match_roster` | expuesta |
| `20260810_club_admins.sql` | tabla `club_admins` | — |
| `20260810_club_admins_rpcs.sql` | RPCs de alta/baja de admins | — |
| `20260810_club_admins_unify_guard.sql` | `q6_can_manage_club` como guardián único | — |
| `20260810_club_public_profile.sql` | `clubs.slug` + `club_get_public_profile` | slugs poblados (`el-palau`, `zona-padel`, `tu-club`) |
| `20260812_club_get_occupied_slots.sql` | RPC `club_get_occupied_slots` | expuesta |
| `20260814_phone_normalization.sql` | `pasala_phone_key()` + backfill | corrida sobre los 42 teléfonos, devuelve claves |
| `20260815_onboarding_link_by_phone.sql` | `player_link_unclaimed_by_phone` | expuesta |
| `20260816_public_event_registration.sql` | RPCs de inscripción pública (`TO anon`) | expuestas |
| `20260817_wire_notify_event_open.sql` | cablea `q6_notify_event_open` al activar evento | `q6_notify_event_open(p_city_ids…)` expuesta |
| `20260818_public_club_read_anon.sql` | policies SELECT `TO anon` en `club_courts` y `club_booking_settings` | **con la anon key se leen las canchas** |

**Corrección respecto de lo que decía este archivo ayer:** las dos
`20260808` —conteo de jugadores y fix de links— figuraban como
pendientes y **están aplicadas**. Ninguna de las dos hay que tocarla.
Los links viejos rotos que quedan son **2 filas históricas de marzo**
(`/club/dashboard/tournaments/f8a8cecc…` y `/club/dashboard/leagues/158face4…`):
son datos ya escritos, no un bug vivo. Se arreglan con un UPDATE o se
dejan morir.

### SIN APLICAR — pendiente

| Migración | Qué rompe mientras tanto |
|---|---|
| `20260810_fix_club_list_my_matches_sets.sql` | el listado de partidos de `/player/mi-club` viene vacío con un `42703` silencioso. Rota en producción desde el 15/04 |

No se pudo confirmar desde afuera: `club_list_my_matches` corta con
`NOT_AUTHENTICATED` antes de llegar al `SELECT`, así que el guard tapa
el error de columnas. Hay que mirar el cuerpo en el SQL Editor.

### ESTADO NO CONFIRMADO — verificar antes de tocar nada que dependa de ellas

`20260811_fix_club_update_profile_guard.sql`,
`20260812_player_request_booking_overlap.sql`,
`20260813_court_bookings_exclude_overlap.sql`.

Las tres cambian **cuerpos de función y constraints**, que no se ven
desde PostgREST. Esta query las resuelve en el SQL Editor:

```sql
SELECT 'club_update_profile_guard' AS migracion,
       pg_get_functiondef('public.club_update_profile(uuid,text,text,text,text,integer,boolean,boolean,text,text,text,text)'::regprocedure)
         LIKE '%q6_can_manage_club%' AS aplicada
UNION ALL SELECT 'player_request_booking_overlap',
       pg_get_functiondef('public.player_request_booking(uuid,uuid,timestamptz,timestamptz,text)'::regprocedure)
         LIKE '%tstzrange%'
UNION ALL SELECT 'court_bookings_exclude_overlap',
       EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'excl_court_bookings_no_overlap')
UNION ALL SELECT 'club_list_my_matches_sets (pendiente conocida)',
       pg_get_functiondef('public.club_list_my_matches'::regproc) NOT LIKE '%set_number%';
```

Si una firma no matchea, la función no existe con esos argumentos — que
ya es la respuesta. La verdad sobre un cuerpo de función se saca de
`pg_get_functiondef()` sobre producción, **nunca** de los archivos del
repo: los archivos mienten.

---

## 2. Ramas

`main` está en `2644219`, sincronizado con `origin/main`, y es lo que
Vercel tiene desplegado. Encima de eso van los commits de documentación
de este cierre.

**No hay trabajo en riesgo.** Se verificó rama por rama: ninguna rama
local tiene commits que no estén en `origin`. Las 4 ramas locales sin
upstream (`feat/public-home-padel-design`, `feature/pilot-readiness-fixes`,
`feature/public-tournament-registration`, `fix/stage-public-test-polish`)
tienen su tip **contenido en `origin/main`**: son punteros viejos, no
trabajo suelto.

### Mergeadas a main el 11/08
- `feature/public-tournament-registration` → `71018cf` (normalización de
  teléfono, vinculación por teléfono, detalle público de torneo y liga,
  formulario de inscripción, difusión por ciudad cableada)
- `fix/public-club-courts-anon` → `2644219` (policies `TO anon`)

Ambas siguen en `origin` como registro. Se pueden borrar sin perder nada.

### Con trabajo real fuera de main
- **`origin/feature/security-headers`** — 1 commit, sin mergear desde el
  21/07. Es la única rama vieja con valor pendiente: headers
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`.
- `feature/player-portal-v2` (+1) y `feature/stage-k-from-v1.3.0` (+2) —
  las dos únicas ramas cuyo tip no es ancestro de `origin/main`. De
  etapas viejas, ya pusheadas a `origin`, sin tocar en meses. Están para
  borrar salvo que quieras rescatar algo puntual.
- `feature/player-auth-v2` aparece como "ahead 4" de **su propio**
  upstream, pero esos 4 commits ya están en `main`. No es trabajo
  pendiente.

### El resto
Las ~28 ramas locales restantes ya están contenidas en `main`. Son
historia.

Hay **6 stashes** viejos (`feature/stage-q6-leagues`, `stage-p1-claim`,
`stage-k`, `player-auth-v2`, `player-portal-v2`). No se revisaron; son
de etapas cerradas.

---

## 3. Qué se verificó y qué falta

### Verificado contra producción el 12/08
- **Las canchas se leen sin sesión.** Con la anon key, `club_courts`
  devuelve filas (Cancha 1 a 4 activas) y `club_booking_settings`
  también. La causa del bug —cero policies `TO anon`, que con RLS
  encendido no es error sino cero filas— está corregida en la base.
  Falta solo el chequeo visual de la página.
- **Los links de notificación salen bien.** La inscripción del 12/08
  01:14 generó `payload.link = /player/mi-club/dashboard/leagues/…#registrations`.
- **`club_count_players_in_cities` existe y está guardada** con el mismo
  nombre de argumento que usa el código (`p_city_ids`, en
  `repositories/registrations.repository.ts:79`).
- **La inscripción llega al panel del club.** Hay una solicitud real de
  liga del 12/08 con su notificación al club correctamente formada.
- **`npx tsc --noEmit` pasa limpio** en `main` (exit 0).
- **`requirePlayer()` no propaga `next`** — `lib/auth.ts:47` y `:60`,
  los dos `redirect()` van pelados.
- **`/clubs/[slug]/book` descarta el error** —
  `app/(public)/(site)/clubs/[slug]/book/page.tsx:43`, `if (!result.success) return;`.

### Falta verificar
1. **La página `/clubs/nuevo-palau` en incógnito.** La base ya devuelve
   las canchas; falta confirmar que la página diga "4 para reservar" y
   no haya quedado un segundo filtro en el camino.
2. **El alta de jugador nuevo desde el formulario público.** La rama
   "teléfono conocido" está probada; la rama "teléfono nuevo → se crea
   jugador sin reclamar" **no**. El último jugador creado en producción
   es del 06/06: el formulario todavía no creó ninguno. Es el camino que
   más va a usar la gente de Luciano.
3. **La difusión por ciudad.** Nunca se disparó. Antes de la primera
   vez, leer el punto 4 — hoy alcanzaría a 71 de 84 personas.
4. **Las 3 migraciones de la sección 1** que no se pueden sondear desde
   afuera.

---

## 4. Bugs conocidos sin resolver

**`city_id` fragmentado — bloquea la difusión.** Los 84 jugadores que
dicen "General Roca" tienen **cuatro** `city_id` distintos:

| `city_id` | jugadores |
|---|---|
| `6204245002` | 71 |
| `62042450` | 11 |
| `58035070` (id de Neuquén) | 1 |
| `NULL` | 1 |

`club_count_players_in_cities` y `q6_notify_event_open` filtran por
`city_id`. Elegir "General Roca" alcanza a 71 de 84 y el modal va a
mostrar 71 como si estuviera bien. Uno de los jugadores recibiría además
la difusión de Neuquén. **Normalizar antes de la primera difusión real.**

**`requirePlayer()` pierde el `next`.** `lib/auth.ts:47` y `:60` hacen
`redirect("/player/login")` y `redirect("/welcome/onboarding")` sin
propagar a dónde quería ir la persona. Todo el resto del sistema sí lo
propaga —`/welcome`, `/p/[playerId]`, `/m/[id]`, `PlayerLoginForm` lee
`nextPath`, `OnboardingForm` lo lee de `searchParams`—, así que el
agujero es este y es uno solo. Impacto: quien toca "Reservar cancha" en
el perfil público del club termina en `/player` después de loguearse, no
en la reserva. **Es el bloqueante de la reserva pública.**

**`/clubs/[slug]/book` descarta el error en silencio.** Línea 43:
`if (!result.success) return;`. Si la reserva falla, no pasa nada en
pantalla.

**`club_list_my_matches` rota desde abril.** Hasta aplicar
`20260810_fix_club_list_my_matches_sets.sql`.

**Turnos fijos invisibles.** `club_get_agenda_slots` no los devuelve
aunque `AgendaGrid` los sabe renderizar. El club puede confirmar una
reserva encima de un turno fijo propio.

**RPCs de tabla de grupo sin guard.** `club_get_group_table` y
`club_get_tournament_group_table` son `SECURITY DEFINER` sin chequeo de
permisos. Hoy no se explota porque las páginas públicas las llaman con
service role (`lib/clubs/publicEvent.ts`), pero cualquiera con el
`group_id` las puede llamar.

**Sin capa de presentación compartida.** Posiciones y fixture existen
dos veces: embebidos en las páginas del panel y como componentes nuevos
en `components/public/events/`. Cambiar el formato hay que hacerlo dos
veces. Asumido a propósito hasta después del lanzamiento.

**UX de torneos y ligas.** Cada inscripción de pareja recarga la página;
el selector no excluye a los ya inscriptos; los anchors del detalle
deberían ser pestañas; el botón de playoffs no se deshabilita con
cantidad inválida de grupos.

**Infraestructura.** Node.js 20 muere el 30/09/2026;
`feature/security-headers` sin mergear desde el 21/07; 18 vulnerabilidades
de npm.

---

## 5. Los 3 teléfonos no normalizables

Producción al 12/08/2026: **103 jugadores activos**, 31 con cuenta, 42
con teléfono cargado. `pasala_phone_key()` normaliza 39 y devuelve
`NULL` en 3. Los 39 dan **38 claves distintas**; el único grupo repetido
es Marcelo y Pablo Vidal (`+542984315287`, misma línea, los dos con
cuenta: son dos personas, no un perfil huérfano). **No hay limpieza de
duplicados pendiente.**

Los 3 que la función no puede normalizar:

| Jugador | `phone` | ¿Tiene cuenta? | Qué le pasa al número |
|---|---|---|---|
| **Carlos Siri** | `00000000` | no | relleno, no es un teléfono |
| **Fer Roncallo** | `298458712710` | no | 12 dígitos: `298` + 9 dígitos. Sobra uno, o falta el `15`. Probablemente `2984587127` |
| **Ana** | `28273939` | **sí** | 8 dígitos sin código de área |

Qué implica: esos 3 **no participan del matching por teléfono**. Si
alguno se inscribe desde el formulario público, no se lo encuentra por
número y se le crea un perfil nuevo en vez de vincularlo al que ya
tiene. Con 3 casos sobre 42 se arregla a mano: corregir el `phone` en la
fila. **Ana es la urgente** — ya tiene cuenta, así que un perfil
duplicado la deja con el historial partido en dos.

Para volver a sacar la lista:

```sql
SELECT id, display_name, phone, user_id IS NOT NULL AS tiene_cuenta
  FROM public.players
 WHERE phone IS NOT NULL AND btrim(phone) <> '' AND deleted_at IS NULL
   AND public.pasala_phone_key(phone) IS NULL
 ORDER BY display_name;
```

---

## 6. Los `docs/promt*.txt`

Quedaron **sin versionar** a propósito: son los 12 prompts de la sesión
del 08/08, ya ejecutados y mergeados. Lo que produjeron está en los
commits y lo que decidieron está en `docs/decisiones.md`. Si los querés
igual: `git add -f docs/promt*.txt`.

---

## 7. Cómo retomar — en orden

1. **Clonar y arrancar.**
   ```
   git clone https://github.com/marcelovidal/padel-v1.git
   cd padel-v1
   git checkout main        # 2644219 o posterior
   npm install
   ```
   Hace falta `.env.local` con las claves de Supabase — no está en el
   repo. Copiarlo de la otra máquina o sacarlo de Vercel.

2. **Abrir `/clubs/nuevo-palau` en incógnito.** Tiene que decir "4 para
   reservar". La base ya devuelve las canchas al rol `anon`: si la
   página sigue en 0, el problema es de la página, no de RLS.

3. **Correr la query de la sección 1** en el SQL Editor para cerrar las
   3 migraciones no confirmadas. Es la fuente de la mitad de los bugs
   fantasma de este proyecto.

4. **Aplicar `20260810_fix_club_list_my_matches_sets.sql`** si la query
   confirma que falta.

5. **Normalizar los `city_id` de General Roca** (sección 4). Antes de
   cualquier difusión. Son 13 filas.

6. **Arreglar el `next` de `requirePlayer()`.** Es el bloqueante de la
   reserva pública y es chico: aceptar el path actual y propagarlo en
   los dos `redirect()` de `lib/auth.ts`. Ojo con los Server Components
   — el path hay que pasarlo explícito, no se puede leer de `headers()`
   en todos los casos. De paso, `book/page.tsx:43`.

7. **Probar el alta de jugador nuevo** desde el formulario público, con
   un teléfono que no esté en la base y sin sesión. Es la rama sin
   probar del flujo de inscripción.

8. **Recién después, la difusión**, con un evento de prueba y ciudades
   acotadas. La primera activación real le escribe a los jugadores de
   General Roca y no se puede deshacer.

**Fecha límite: semana del 18 de agosto**, lanzamiento con la liga de
agosto de Nuevo Palau. Lo que Luciano quiere ver es cómo el jugador ve
el torneo y cómo se inscribe.
