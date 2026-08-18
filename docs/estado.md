# PASALA — Estado al cierre del 20 de agosto de 2026

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
| `20260820_guest_player_category.sql` | `p_category int DEFAULT NULL` en `player_create_guest_player` | expuesta, verificada |
| `20260820_fix_group_team_reassign.sql` | DELETE previo en `club_assign_team_to_group` y `club_assign_tournament_team_to_group` + guard `FIXTURE_ALREADY_EXISTS` en torneos | expuesta, verificada |

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
| `20260819_registrations_open.sql` | **bloqueante para el deploy.** El código de `main` ya pide las columnas nuevas por nombre; sin la migración, las páginas de gestión de torneo y liga y las públicas de evento devuelven 404 mudo |

#### `20260819_registrations_open.sql` — orden y verificación

**Aplicar ANTES de desplegar.** `getLeagueById`, `getTournamentById` y
`lib/clubs/publicEvent.ts` piden `registrations_open`,
`registration_start_date` y `registration_end_date` por nombre. Sin
ellas PostgREST responde `42703`, la página lo captura y hace
`notFound()`: 404 sin error visible, el mismo patrón silencioso que ya
nos costó días con `q6_can_manage_club`.

Qué deja: las tres columnas en `club_tournaments` y `club_leagues`, los
RPC `club_set_tournament_registrations_open` /
`club_set_league_registrations_open` con guardián `q6_can_manage_club`,
las dos `club_update_*_info` ampliadas a seis parámetros (van DROP +
CREATE, porque agregar parámetros con DEFAULT crea una sobrecarga y deja
la llamada vieja ambigua) y el chequeo de `registrations_open` dentro de
los dos `public_request_*_registration`.

Backfill: cierra las inscripciones de los eventos `finished` y de los
que ya tienen fixture generado. El resto queda abierto, que es lo que
hacen hoy. Las fechas nuevas quedan en `NULL` a propósito: las cargadas
son del evento, no de inscripción.

Después de aplicarla:

```sql
-- 1. backfill: los dos finished en false, los dos draft en true
SELECT name, status, registrations_open FROM club_leagues
UNION ALL
SELECT name, status, registrations_open FROM club_tournaments;

-- 2. una sola fila por nombre, con pronargs = 6.
--    Dos filas = el DROP no corrió y toda edición de fechas falla
--    con "function is not unique"
SELECT proname, pronargs FROM pg_proc
WHERE proname IN ('club_update_tournament_info', 'club_update_league_info');
```

3. Guardar fechas desde "Fechas y difusión": si responde `PGRST202`,
   forzar el reload del schema de PostgREST.
4. Abrir y cerrar inscripciones en un evento y ver que la página pública
   cambie entre formulario y aviso de cerradas.
5. Con un evento `active` y las inscripciones cerradas, un POST con la
   anon key a `/rest/v1/rpc/public_request_tournament_registration` tiene
   que devolver `REGISTRATIONS_CLOSED`. Si devuelve 200, el
   `CREATE OR REPLACE` de la sección 5 no corrió.
6. Reabrir la Liga de prueba desde el selector y generar playoffs.
7. Regenerar `types/database.ts` para sacar los casts `as any` de las
   tres columnas.

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

~~**`requirePlayer()` pierde el `next`.**~~ **RESUELTO** en
`feature/public-booking-page` (13/08). `middleware.ts` ya propagaba
`next`; `requirePlayer` ahora deduce el destino del header
`x-pasala-path`. La reserva pública además es pública: no usa
`requirePlayer` en el render.

~~**`/clubs/[slug]/book` descarta el error en silencio.**~~ **RESUELTO**
en `feature/public-booking-page` (13/08). El error redirige con `?error=`
preservando fecha, horario y cursor.

**`player_request_booking` — `requested_by_player_id` puede ser NULL.**
Confirmado con `pg_get_functiondef` sobre producción (13/08/2026):
`v_player_id` se puebla con `SELECT INTO` desde `players` por `auth.uid()`
pero **nunca se verifica que la fila exista**. Si alguien tiene sesión de
Supabase sin fila en `players`, la reserva se crea con
`requested_by_player_id = NULL`. No rompe el flujo visible, pero es un
dato corrupto. `requirePlayer(sessionOnly: true)` garantiza que hay fila
antes de mostrar el form — en producción no debería llegar un `NULL` —
pero el RPC debería hacer el chequeo él mismo. Pendiente corregir en SQL.

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

**Sitio público a medio convertir — dos acentos peleándose.**
`feature/public-brand-v2` (12/08) convirtió el shell —`PublicHeader`,
`PublicFooter`, `PublicSection`, `FeatureCard`, `StatCard` y el wrapper
de `app/(public)/(site)/layout.tsx`— pero los cuerpos de las páginas de
marketing siguen en `slate/blue`. Medido sobre el HTML servido:

| Página | Literales en el body |
|---|---|
| `/clubs` | 45 |
| `/players` | 28 |
| `/pricing` | 2 |
| `/faq`, `/terms`, `/privacy`, `/clubs/[slug]` | 0 |

Consecuencia visible: en `/clubs` y `/players` el CTA del header es
**rojo** (`bg-brand-rojo`, criterio de brand v2) y los del cuerpo siguen
**azules** (`bg-blue-600`). Antes eran consistentes en azul; ahora son
inconsistentes hasta convertir los cuerpos. Se mergeó así a propósito:
`/clubs/[slug]` es la que se comparte por WhatsApp y quedó en cero
literales. Las de marketing se convierten en otro bloque.

Corolario: el **dark mode funciona en el shell pero no en el sitio
completo**. Los `bg-white` y `text-slate-900` de esos cuerpos quedan como
islas claras. No hay `ThemeToggle` en el sitio público —solo en
`app/player/(app)/page.tsx`—, pero `localStorage` es por origen, así que
un jugador que puso dark en su panel y después abre el link del club sí
las ve.

**`PublicContactModal` fuera de la conversión.** Su trigger sí quedó en
tokens (Header y Footer le pasan `buttonClassName` explícito), pero el
cuerpo del modal conserva 13 usos de `slate/blue`: hay salto visual al
abrirlo. Su default interno sigue siendo `hover:text-blue-700`, hoy
inalcanzable porque los dos únicos llamadores pasan clase.

**Comentarios que documentan lo que el código no hace — segunda vez.**
`getAvatarInfo` clasificaba como `storage` cualquier `avatar_url` no
vacío, sin mirar el prefijo, así que la URL pública del bucket
`club-logos` se firmaba contra el bucket `avatars`, fallaba siempre y
caía a las iniciales: el club subía su logo y veía una letra. Mientras
tanto **dos comentarios daban la rama por implementada** —
`components/club/ClubProfileForm.tsx:42` y
`app/(public)/(site)/clubs/[slug]/page.tsx:95` dicen textualmente que
"getAvatarInfo discrimina por prefijo http". Nunca se había escrito.
Arreglado en `feature/public-brand-v2`.

Es el mismo patrón que `club_list_my_matches` con `score_a`: el archivo
del repo describía columnas que la base no tiene. **Un comentario no es
evidencia de que algo esté implementado — verificar contra el código o
contra producción antes de descartar una hipótesis por lo que dice un
comentario.**

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
