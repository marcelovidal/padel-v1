# PASALA — Decisiones tomadas

Documento de referencia. Lo que está acá **ya está decidido** y no se
vuelve a discutir salvo que aparezca información nueva que lo invalide.

Última actualización: 12 de agosto de 2026.

---

## Contexto comercial

Cliente piloto: **Nuevo Palau**, General Roca, Río Negro.
Administrador: Luciano Martos.
`club_id`: `3b5a7174-68f0-45c0-8926-d1103c1cee3b`

**Fecha límite: semana del 18 de agosto.** Quiere lanzar con la liga
de agosto. Ya probó la gestión de torneos y ligas y le pareció bien.

Lo que espera ver, en sus palabras: **cómo ve el jugador el torneo y
cómo se inscribe**.

Hoy junta inscripciones con un Google Form (21 parejas ya cargadas).
Quiere dejar de usarlo: que la gente se inscriba en PASALA, y que vea
tablas, resultados y cruces actualizados.

---

## Inscripción pública — DECIDIDO

### Quién puede inscribirse
Cualquiera, **sin cuenta previa**. El jugador se anota con nombre y
teléfono, queda creado como jugador sin reclamar, y el reclamo de
perfil viene después. Es el mismo modelo que ya se usa para cargar
jugadores en partidos.

Exigir cuenta antes de inscribirse pierde gente. La captación ocurre
en el momento de la acción, no antes.

### Qué pide el formulario
Nombre, apellido y **teléfono de los dos jugadores**. El que se
inscribe carga también el celular de su compañero.

Nada más. Cada campo extra baja la conversión. Nivel y posición
pueden venir después, ya dentro de la app.

### Matching por teléfono, no por nombre
El teléfono es el identificador fuerte. Los nombres en la base tienen
apodos sin apellido ("Dany", "Epi", "Floren") que nunca van a matchear
con el nombre completo que alguien escriba.

**Requiere normalización antes de comparar**: sin espacios, sin
guiones, sin el 15, con o sin +54. Sin eso, `2984315287` y
`+54 9 298 431-5287` son dos personas distintas.

**El teléfono NO es clave única.** El Excel de Luciano lo demuestra:
dos parejas comparten número y una persona se anotó dos veces. Si dos
jugadores comparten teléfono, el sistema muestra candidatos y deja
elegir — no asume.

### Los tres caminos
| Situación | Qué pasa |
|---|---|
| Teléfono existe y el jugador tiene cuenta | Ya es usuario. Se inscribe y listo. |
| Teléfono existe, jugador sin cuenta | Perfil sin reclamar. *"Encontramos un perfil con partidos ya cargados, ¿sos vos?"* — el gancho más fuerte del flujo. |
| Teléfono no existe | Jugador nuevo, se crea sin reclamar. |

### Quién confirma
**El club.** Es el control que ya existe y funciona
(`player_request_tournament_registration` + panel de solicitudes).

En pádel las parejas se acuerdan antes de anotarse: nadie anota a otro
sin permiso. Pedir confirmación del compañero sería resolver un
problema que no existe, a costa de fricción real.

### Link de confirmación del compañero — OPCIONAL
El inscriptor recibe un link único para mandarle por WhatsApp a su
compañero. **No es bloqueante**: la inscripción llega al club igual.
El club ve "confirmada por ambos" o "solo por el inscriptor" y decide.

El link no dice solo "confirmo": lleva a la **página pública del
torneo con su inscripción destacada**, para que el clic sea también el
primer contacto con el producto. Y si ese jugador tiene perfil sin
reclamar con partidos cargados, ahí aparece el gancho.

### Botón en el panel del club
En cada pareja inscripta, un botón **"link de confirmación"** para que
el club lo mande por WhatsApp cuando los datos son dudosos. Convierte
el problema de datos sucios en herramienta operativa: la limpieza la
hace el propio jugador.

### Criterio sobre calidad de datos
Se toma deuda ahora y se limpia progresivamente. El detector de
clusters duplicados ya existe en el panel admin.

### Vinculación por teléfono al registrarse — DECIDIDO 11/08/2026
`player_complete_onboarding` buscaba al jugador existente solo por
`user_id`. Quien se registraba teniendo ya un perfil sin reclamar
se creaba un **segundo** perfil, en silencio — y después no podía
arreglarlo, porque `player_claim_profile_v2` tira
`USER_ALREADY_HAS_PROFILE`. El perfil viejo quedaba huérfano.

Se agrega `player_link_unclaimed_by_phone`, que corre **antes** del
onboarding y vincula por teléfono normalizado. No se redefine
`player_complete_onboarding`: si el jugador ya quedó vinculado, su
búsqueda por `user_id` lo encuentra y toma la rama UPDATE.

**Se vincula solo con exactamente UN jugador sin reclamar.** Más de
uno, o uno que ya tiene cuenta → perfil nuevo, como antes.

Producción al 12/08/2026, medido contra la base: 103 jugadores
activos, 31 con cuenta, 42 con teléfono cargado. De esos 42,
`pasala_phone_key()` normaliza 39 y devuelve `NULL` en 3. Los 39
normalizados dan **38 claves distintas**: un solo grupo repetido
(Marcelo y Pablo Vidal, misma línea, ambos con cuenta — dos personas,
no un perfil huérfano). El callejón sin salida todavía no se disparó:
**no hay limpieza de duplicados pendiente.** Los 3 no normalizables
están listados con nombre en `docs/estado.md`.

Ante la duda, perfil nuevo: un duplicado se limpia después, una
fusión equivocada se lleva puesto el historial de alguien.

---

## Página pública — DECIDIDO

### Acceso
**Público-público.** Se ve sin cuenta y sin login. Alguien abre el link
desde WhatsApp y ve cómo va la liga.

Las policies RLS actuales exigen sesión, así que estas páginas se
sirven con **admin client filtrando a eventos con `status` distinto de
`draft`**. Es más controlado que aflojar RLS.

Proyección acotada: nombres de jugadores sí, teléfonos y emails no.

### Rutas
- `/clubs/[slug]` — perfil del club **(ya implementado)**
- `/clubs/[slug]/torneos/[id]` — detalle público de torneo
- `/clubs/[slug]/ligas/[id]` — detalle público de liga

Todo bajo el slug del club, para reforzar su identidad. El slug se
autogenera del nombre, con sufijo numérico ante colisión, y **es fijo
una vez creado** para no romper links compartidos.

### Contenido del detalle público
Posiciones por grupo, fixture con resultados, bracket de playoffs,
torneos y ligas vigentes y pasados. **Solo lectura**: sin formularios
de programación ni carga de resultados.

**Corregido el 12/08/2026:** era falso que los componentes de
visualización ya existieran. En `components/club/` el único componente
reutilizable era `TournamentBracketView` —que sí se reutiliza tal cual,
porque ya era RSC y de solo lectura—. **Posiciones y fixture no existían
como componentes**: vivían embebidos en el JSX de las páginas del panel,
mezclados con los formularios de carga de resultados. Se escribieron de
cero como `EventStandingsTable` y `EventFixtureList` en
`components/public/events/`, junto con `PublicEventHeader`,
`PublicSectionCard` y `PublicClubEventsList`.

La lectura de datos no reusa las páginas del panel: `lib/clubs/publicEvent.ts`
arma la proyección pública con `createAdminClient()` y las RPCs
`club_get_group_table` / `club_get_tournament_group_table`.

Consecuencia para lo que viene: **no hay una capa de presentación
compartida entre el panel y lo público**. Cualquier cambio de formato en
posiciones o fixture hay que hacerlo dos veces. Se asume a propósito —
extraer la versión compartida es trabajo de después del lanzamiento.

### Compartir
`ShareCardButton` y `/api/og/league` ya existen. Falta el OG de torneo.

El logo del club ya está en un bucket público (`club-logos`), que es lo
que permite que aparezca en la preview de WhatsApp.

---

## Reserva pública — DECIDIDO, pendiente de implementar

Debe funcionar **exactamente igual** que `/player/bookings/new` —misma
grilla, misma disponibilidad— con el login o registro **al final**,
cuando la persona ya eligió su turno.

Bloqueantes conocidos:
- ~~La grilla son ~90 líneas de JSX inline, no un componente~~
  **Resuelto el 12/08/2026** en `feature/booking-grid-extract`:
  `components/bookings/CourtAvailabilityGrid.tsx` y
  `lib/bookings/availability.ts`
- `requirePlayer()` exige onboarding completo, no solo sesión
- ~~`requirePlayer()` redirige sin `next`~~ **Resuelto**, ver abajo
- `/clubs/[slug]/book` descarta el error en silencio (línea 43)

### Dónde se perdía `next` — verificado el 12/08/2026

La versión anterior de esta sección decía que el agujero era uno
solo y estaba en `requirePlayer()`. **Era incorrecto: eran tres, y
el principal estaba en el middleware.**

`middleware.ts` matchea `/player/:path*` y `/welcome/:path*`, así
que **corre antes** que `requirePlayer()` en 25 de sus 28
consumidores. Tenía dos redirects pelados:

| Punto | Qué hacía | Consecuencia |
|---|---|---|
| `middleware.ts:47` | `redirect("/welcome/onboarding")` sin `next` | **El que rompía el caso del usuario nuevo** |
| `middleware.ts:42` | `redirect("/player/profile")` si el onboarding ya estaba completo | Descartaba `next` y destino |
| `lib/auth.ts:47` y `:60` | los dos redirects de `requirePlayer` | Segundo filtro; `:47` solo se alcanza con cookie `sb-` rancia |

Lo que **sí** era correcto y sigue siéndolo: `/welcome/onboarding`
propaga `next`. La página lo lee de `searchParams` y lo respeta en
sus dos redirects, y `OnboardingForm` lo lee de
`window.location.search` (línea 150) y lo usa en sus dos salidas
(líneas 164 y **177**, no 172). Nunca hubo que tocarlo: le llegaba
vacío porque el middleware no se lo pasaba.

**Resuelto el 12/08/2026.** `requirePlayer(options?: { next?: string })`:
sin argumento deduce el destino del header `x-pasala-path` que pone
el middleware; con `next` explícito para las rutas fuera del
matcher, que hoy es solo `/clubs/[slug]/book`.

### Open redirect encontrado en el camino

`/auth/callback:133` validaba `rawNext.startsWith("/")`, que acepta
`//evil.com` — `new URL("//evil.com", origin)` resuelve a
`https://evil.com`. Se cerró con `lib/auth/safe-next.ts`, aplicado
sobre todos los sinks: el callback, `/welcome` —que era la puerta
de entrada—, `OnboardingForm` y las dos páginas de claim. La
validación no confía en una lista de patrones: resuelve el
candidato contra un origen de prueba y exige que el origen no
cambie.

**Ya resuelto (bloque A, mergeado)**: `club_get_occupied_slots` como
fuente única de disponibilidad con las siete fuentes de ocupación,
validación de solapamiento en `player_request_booking`, y EXCLUDE en
`court_bookings`. Una solicitud `requested` **bloquea** el turno: el
primero que pide se lo reserva de hecho.

---

## Unificación visual y de navegación — DECIDIDO

### El problema
Hay dos sistemas de diseño conviviendo: el panel usa tokens semánticos
de brand v2, el sitio público usa `slate/blue` de Tailwind (~250 usos).
Y hay tres perfiles públicos —jugador, club, entrenador— con tres
implementaciones distintas y cero componentes compartidos.

Es grave para la presentación: la página que el club comparte por
WhatsApp muestra el PASALA azul viejo en el header, con el contenido en
brand v2 abajo.

### Lo decidido

**Los perfiles públicos comparten navegación.** Club, jugador y
entrenador tienen el mismo shell y el mismo lenguaje visual, tomado del
panel del jugador que ya está trabajado.

**La navegación es adaptada**, no idéntica: quien no tiene cuenta ve una
cosa, quien está logueado ve otra.

**El panel del jugador logueado NO se toca** en su estructura. Solo se le
suman las funciones nuevas donde corresponda.

**Conversión de tokens, no rediseño.** Mismo layout, misma estructura,
brand correcto. El rediseño de la navegación queda para después del
lanzamiento.

### Alcance concreto
- Seis archivos concentran el `slate/blue`: `PublicHeader`,
  `PublicFooter`, `PublicSection`, `FeatureCard`, `StatCard`,
  `PublicContainer`.
- `/p/[playerId]` y `/entrenadores/[coachId]` hoy **no tienen shell**
  (sin header ni footer). La causa es de rutas: los dos viven en
  `app/p/…` y `app/entrenadores/…`, fuera de `app/(public)/(site)/`, así
  que no heredan el layout del sitio público — solo el root. Van bajo el
  mismo shell que el resto.
- Componentes a compartir: header de entidad, tarjeta de sección,
  `UserAvatar` generalizado (hoy el club arma un `<img>` crudo), y **una
  sola función de nivel de jugador**.

### Sobre la función de nivel: son más de dos
Verificado el 12/08/2026. No hay dos implementaciones sino **ocho**, y
todas menos una son privadas de su módulo:

| Archivo | Función |
|---|---|
| `lib/clubs/publicEventLabels.ts:54` | `categoryLabel` — la única exportada |
| `components/coach/CoachPlayerSearch.tsx:53,73` | `levelLabel` + `categoryLabel` |
| `components/player/PlayersDirectoryTable.tsx:36,49` | `categoryLabel` + `levelLabel` |
| `components/players/ClubPlayerProfileModal.tsx:36,64` | `levelLabel` + `categoryLabel` |
| `components/players/EditPlayerForm.tsx:51` | `categoryLabel` |
| `components/player/PlayerHeroCard.tsx:50` | `getLevelInfo` |
| `components/players/PlayerDirectoryCard.tsx:40` | `getLevelInfo` |

Y son **dos conceptos distintos** mezclados bajo el mismo nombre
informal de "nivel": `levelLabel` traduce el enum `level` (`ROOKIE` →
`INICIAL`), mientras que `getLevelInfo` **deriva el nivel del
`pasala_index`** y además devuelve un color. Unificar los dos en una
sola función sería un error: son dos funciones, y hay que decidir cuál
se muestra en cada lugar antes de extraerlas.

Las tres copias de `levelLabel` hoy coinciden en el resultado, así que
la unificación no cambia nada visible. Es refactor puro, sin riesgo.

### Verificado, sin trabajo pendiente
`player_get_open_events` ya filtra correctamente: el jugador ve los
eventos activos sin ciudades objetivo más los que apuntan a su ciudad.
No ve todos los del país ni está limitado a su club.

Nota: un evento **sin** ciudades objetivo se muestra a TODOS los
jugadores con cuenta. Hoy son 31 y todos en Patagonia, así que no
molesta, pero es un criterio que va a envejecer.

Segunda nota, del hallazgo de `city_id` fragmentado más abajo: el filtro
por ciudad de esta función depende del mismo `players.city_id` que la
difusión. Los 13 jugadores de General Roca con el `city_id` minoritario
tampoco ven los eventos dirigidos a su ciudad.

---

## Administradores de club — DECIDIDO e implementado

Varios administradores por club, **todos con los mismos permisos**. No
hay jerarquía ni rol de dueño.

- Cualquiera puede agregar o quitar a cualquiera
- Al ser removido, el jugador recibe notificación
- **Nadie puede quitarse a sí mismo**
- Un club no puede quedarse sin administradores

Tabla `club_admins`. `q6_can_manage_club` es el **guardián único** de
las funciones de gestión de club.

---

## Convenciones técnicas — NO NEGOCIABLES

### SQL
**Las definiciones vigentes se sacan de `pg_get_functiondef()` sobre
producción, NUNCA de los archivos del repo.** Los archivos mienten:
`club_list_my_matches` estuvo rota desde abril porque la migración del
repo pedía columnas (`score_a`, `score_b`, `set_number`) que la base no
tiene.

**El orden alfabético de migraciones es una trampa.** `_` ordena antes
que letras, y los archivos sin número ordenan después de los numerados.
Una migración correctiva debe llevar fecha posterior al lote que
corrige.

**Al redefinir una función, cambiar SOLO el bloque en cuestión** y
verificar por diff que no cambió nada más.

**Las migraciones se aplican a mano en Supabase**, y el archivo queda
versionado en el repo. El agente nunca aplica nada.

**Para saber si una migración está viva, sondear producción, no
preguntar.** Con `SUPABASE_SERVICE_ROLE_KEY` de `.env.local` alcanza
para resolver la mayoría de los casos sin abrir el SQL Editor, y es
todo de solo lectura:
- **¿Existe la función y con qué argumentos?** `GET /rest/v1/` devuelve
  el OpenAPI de PostgREST con todas las RPC expuestas y sus parámetros.
  Ahí se ve el nombre exacto de cada argumento, que es donde más se
  falla.
- **¿Existe la columna?** Un `select` sobre ella: si no está, PostgREST
  responde `42703`.
- **¿La policy `TO anon` quedó puesta?** La misma consulta con
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`: si devuelve filas, quedó.
- **¿El cambio de comportamiento salió?** Mirar los datos que produjo.
  El fix de links de notificación se confirmó viendo el `payload->>link`
  de una notificación reciente, no leyendo la función.

Lo que este método **no** alcanza: el cuerpo de una función y los
constraints. Para eso sigue haciendo falta `pg_get_functiondef()` y
`pg_constraint` en el SQL Editor.

### Flujo de trabajo
Feature branch → push → revisión del diff → merge manual a main →
Vercel auto-deploy.

**El orden importa**: primero el SQL, después el merge. Si el código
depende de una función que no existe, la página se cae.

### Backend
Repositorio → servicio → server action. Operaciones de admin con
`createAdminClient()`.

### Prompts al agente
En español, alcance acotado, con hard stops. Paso 0 de lectura como
gate antes de escribir código. Commit por paso. "No planifiques,
ejecutá."

---

## Deuda conocida, no bloqueante

**Visual**: el sitio público está escrito en `slate/blue` de Tailwind
(~250 usos) y el panel en tokens semánticos de brand v2. Seis archivos
concentran casi todo: `PublicHeader`, `PublicFooter`, `PublicSection`,
`FeatureCard`, `StatCard`, `PublicContainer`. Convertirlos alinea el
sitio entero y arregla el dark mode roto.

**Perfiles públicos**: tres implementaciones distintas (jugador, club,
entrenador), cero componentes compartidos. `/p/[playerId]` no tiene
shell — sin header ni footer, y es la página que más se comparte.

**UX de torneos y ligas**: cada inscripción de pareja recarga la
página; el selector no excluye a los ya inscriptos; los anchors del
detalle deberían ser pestañas; el botón de playoffs no se deshabilita
con cantidad inválida de grupos.

**Notificaciones**: resuelto el 11/08/2026. `q6_notify_event_open`
quedó cableada dentro de las funciones de cambio de estado por
`20260817_wire_notify_event_open.sql`, aplicada en producción. Activar
un torneo o una liga con ciudades objetivo **ahora sí** notifica. El
modal de confirmación de alcance estaba mergeado desde antes, así que la
protección quedó puesta primero y el disparo después, que era el orden
buscado. **Todavía no se disparó ninguna difusión real** — ver el
bloqueante de `city_id` acá abajo antes de hacerlo.

**Difusión geográfica — `city_id` fragmentado. DESCUBIERTO EL 12/08/2026,
bloqueante de la difusión.** Tanto `club_count_players_in_cities` como
`q6_notify_event_open` filtran por `players.city_id`, no por el nombre de
la ciudad. En producción, los 84 jugadores que dicen "General Roca"
están repartidos en **cuatro** `city_id` distintos: 71 en `6204245002`,
11 en `62042450`, 1 en `58035070` —que es el id de Neuquén— y 1 en
`NULL`. Elegir "General Roca" en el modal alcanza **71 de 84**: 13
jugadores quedan afuera en silencio, y uno recibiría la difusión de
Neuquén. El modal va a mostrar 71 y va a parecer correcto.

Decisión: **normalizar los `city_id` antes de la primera difusión real**,
no después. Es un UPDATE acotado sobre una tabla chica y el error es
invisible desde la interfaz. Esto es la parte concreta y urgente del
"fix geo — datos estáticos" que ya figuraba como pendiente genérico.

**Turnos fijos invisibles**: `club_get_agenda_slots` no los devuelve,
aunque `AgendaGrid` los sabe renderizar. El club puede confirmar una
reserva encima de un turno fijo propio.

**Infraestructura**: Node.js 20 muere el 30/09/2026;
`feature/security-headers` sin mergear desde el 21/07; 18
vulnerabilidades de npm.

---

## Lo que NO se hace antes del lanzamiento

- Unificación de los tres perfiles públicos
- Extracción de `ProfileHero` y componentes compartidos
- Conversión completa del sitio público a tokens (salvo los seis
  componentes, si entra)
- Importador de Excel — las 21 parejas se cargan a mano
- Organizador de torneos independiente (`is_organizer`)
- Login con magic link / OTP
