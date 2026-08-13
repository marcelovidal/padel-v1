# PASALA — Auditoría de seguridad pendiente

Registro de hallazgos y zonas sin revisar. **Nunca se hizo una
auditoría sistemática**: todo lo que está acá apareció mirando
otras cosas.

Fecha: 12 de agosto de 2026.

**Resuelto en esta fecha**: el open redirect —que resultó estar en
cuatro lugares, no en uno—, el merge de `feature/security-headers`,
y la verificación del revoke de `club_register_alias`. Quedan
marcados en su sección con lo que se midió, no borrados: el
hallazgo original explica por qué se buscó donde se buscó.

---

## Prioridad alta

### ~~Open redirect en /auth/callback~~ — RESUELTO 12/08/2026
`app/auth/callback/route.ts:133` validaba el `next` solo con
`startsWith("/")`. Eso acepta `//evil.com`, que
`new URL("//evil.com", origin)` resuelve a `https://evil.com`.

**Explotable**: alguien manda un link con
`next=//sitio-falso.com`, la víctima se loguea en PASALA de
verdad, y termina en un sitio que puede pedirle credenciales.

**El agujero era más grande que el callback.** Al auditar todos
los lugares que leen `next` de la URL apareció el mismo patrón en
`app/welcome/page.tsx:29`, que es **la puerta de entrada de toda
la cadena de autenticación**: el valor termina en un `redirect()`
de servidor y en los `router.replace(nextPath)` de
`WelcomePortalAuth`. Cerrar solo el callback habría dejado abierta
la puerta por la que entra el tráfico. También estaba en
`components/player/OnboardingForm.tsx:150`, que lee la URL del
navegador y hace `window.location.href`, y en las dos páginas de
claim.

**Medido con 15 vectores contra la validación vieja: 6 escapaban**
a `evil.com` —`//evil.com`, `//evil.com/phish`, `/\evil.com`,
`//evil.com\@pasala.com.ar`, y dos con tab y newline embebidos que
`new URL` descarta al parsear—. La nueva bloquea los 15 y deja
pasar los 5 casos legítimos sin tocar, incluido uno con query y
hash.

**Corregido** con `lib/auth/safe-next.ts`. La validación no confía
en una lista de patrones: resuelve el candidato contra un origen de
prueba y exige que el origen no haya cambiado. Aplicada sobre todos
los sinks. Los pass-through —`player/login`, `GoogleAuthButton`, el
`selfPath` de `claim/club`— quedan sin validar a propósito: reenvían
el parámetro a `/welcome` o `/auth/callback`, que ya validan.

**Lección**: el sink obvio no era el único. Cuando aparezca un
patrón así, auditar todos los lugares que leen el mismo parámetro
antes de dar por cerrado el hallazgo.

### Sin rate limiting en la superficie anónima
`public_request_tournament_registration` y su equivalente de
liga crean filas en `players` sin ningún humano identificado
detrás.

Defensas actuales: el evento debe estar `active`, los nombres no
pueden estar vacíos, y el teléfono debe ser normalizable. Nada
más.

Con el link circulando por WhatsApp, alguien puede llenar la
base. El lugar para poner el límite es delante de esas dos
funciones.

### ~~feature/security-headers sin mergear~~ — RESUELTO 12/08/2026
Un commit del 21/07, 13 líneas en `next.config.js`. **Mergeado a
main el 12/08/2026.**

La rama estaba muy atrás, pero introducía solo esas 13 líneas
respecto de su merge-base: `next.config.js` no había cambiado en
esa región y `vercel.json` solo tiene crons, así que no hubo
duplicación de headers.

Verificado sobre una respuesta real:

```
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
```

`geolocation=(self)` deja funcionar el `useGeoLocation` del
onboarding, que es el único que la usa.

Lo que **no** cubre y sigue pendiente: no hay
`Content-Security-Policy` ni `Strict-Transport-Security`.

### Node.js 20 llega a fin de vida el 30/09/2026
Vercel va a deshabilitar builds nuevos. Migrar a 24.x con
tiempo.

### 18 vulnerabilidades de npm
4 moderadas, 14 altas. `npm audit fix --force` mete breaking
changes, así que requiere una ventana tranquila.

---

## Prioridad media

### Funciones SECURITY DEFINER sin guard
- `club_get_group_table`
- `club_get_tournament_group_table`

Cualquier usuario autenticado que conozca un UUID de grupo puede
leer la tabla de posiciones. Están `REVOKE ALL FROM PUBLIC` +
`GRANT EXECUTE TO authenticated`, así que el alcance es
"cualquier autenticado", no anónimo. Existen desde marzo.

Severidad baja —son posiciones deportivas— pero son el único
lugar donde la suposición "RLS nos cubre" es falsa.

### Policies RLS deliberadamente permisivas
Las de torneos tienen la forma
`USING (t.status = 'active' OR q6_can_manage_club(...))`.

Para un torneo activo, **cualquier autenticado puede leer**
equipos, grupos, fixture y playoffs de cualquier club. Es
intencional —alimenta la vista pública— pero significa que no
hay aislamiento entre clubes para eventos activos.

### club_count_players_in_cities sin acotar
Solo valida `auth.uid() IS NOT NULL`. Cualquier autenticado
puede consultar cuántos jugadores hay en cualquier ciudad. Es un
agregado sin datos personales, pero es información de negocio
—densidad de la base por ciudad— que podría interesarle a un
competidor.

Se acota agregando `p_club_id` y chequeando
`q6_can_manage_club`.

### ~~club_register_alias~~ — VERIFICADO 12/08/2026
Revocada a PUBLIC y anon el 11/08, con GRANT a `service_role`.
**El revoke surtió efecto.** `proacl` devuelve:

```
{postgres=X/postgres,service_role=X/postgres}
```

Ni `PUBLIC` ni `anon` figuran, así que la función quedó fuera del
alcance de la API REST anónima. Sin trabajo pendiente.

---

## Zonas nunca revisadas

- **Policies RLS de forma sistemática.** Se miraron solo las que
  aparecieron por síntoma (`club_courts`,
  `club_booking_settings`).
- **Qué expone la API REST de Supabase por defecto.** PostgREST
  publica todo lo que tenga GRANT. No se auditó.
- **Endpoints de `/api/*`.** Doce rutas, incluidos los seis
  generadores de OG y los de geo. No se revisó si alguno acepta
  parámetros sin validar.
- **`SUPABASE_SERVICE_ROLE_KEY`** aparece marcada como "Needs
  Attention" en Vercel. Da acceso total saltando RLS. Verificar
  qué significa esa marca.
- **Storage.** El bucket `avatars` es privado y se sirve con
  URLs firmadas; `club-logos` es público. No se revisó si hay
  otros buckets ni sus policies.
- **Validación de entrada en server actions.** Se asume que los
  RPC validan, pero no se auditó qué llega sin sanitizar.

---

## Lo que sí está bien resuelto

Vale registrarlo para no rehacerlo:

- **`q6_can_manage_club` como guardián único.** Antes había tres
  modelos de autorización conviviendo. Unificado el 11/08.
- **`public_find_players_by_phone`** nunca devuelve el teléfono
  —sería un oráculo para enumerar la base probando números— y
  verifica que el jugador elegido tenga realmente ese número
  antes de inscribirlo.
- **Validación del host de Maps** acotada a `[a-z]{2,}` con un
  solo nivel opcional, para que `google.com.evil.com/maps` no
  pase. Probada contra 12 casos.
- **Bucket `club-logos`**: lectura pública, escritura restringida
  por `q6_can_manage_club`, con validación de formato UUID antes
  del cast para que un nombre malformado rechace en vez de
  lanzar excepción.
- **Páginas públicas con proyección acotada**: nombres de
  jugadores sí, teléfonos y emails no.
- **`EXCLUDE` en `court_bookings`** contra reservas superpuestas.

---

## Criterio

Con el lanzamiento encima, lo mínimo antes de exponer el link:

1. El open redirect (en curso)
2. Mergear `security-headers`
3. Evaluar rate limiting en el formulario público

El resto es auditoría posterior. Nada de lo pendiente es
explotable de forma trivial por un usuario común, pero la
superficie crece cuando el link empiece a circular.
