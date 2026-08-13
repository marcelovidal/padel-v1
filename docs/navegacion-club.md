# PASALA — Navegación y estructura del club

Decisiones para la etapa de reestructuración del panel del club y
de su página pública.

Fecha: 12 de agosto de 2026.

---

## Panel del administrador

### Principio: progreso, no formularios sueltos

La creación de un torneo o liga es un proceso con etapas, y hoy
cada paso recarga la página. Con 21 parejas eso es molesto; con
una liga real es inutilizable.

**Lo decidido:** la carga debe sentirse continua. Validación en
segundo plano o guardado al final, sin recarga por paso.

### Lo que ya existe y funciona

El wizard de creación tiene tres pasos bien estructurados
—Identidad, Categoría, Difusión— y es lo único del flujo que ya
se siente fluido. El problema no está ahí.

### Dónde duele hoy, medido

| Momento | Qué pasa | Costo |
|---|---|---|
| Inscribir una pareja | Recarga la página entera | 39 queries por render en ligas |
| Asignar pareja a grupo | Recarga | Ídem |
| Cargar un resultado | Recarga | Ídem |
| Programar un partido | Recarga | Ídem |

Todos son `<form action>` con server action y redirect. La página
de liga tiene 1087 líneas y hace 1 + 3D + 2G queries, donde D son
divisiones y G grupos. Con 3 divisiones y 12 grupos son 39
queries **por cada inscripción**.

### Prioridad dentro de la etapa

1. **Inscripción de parejas sin recarga.** Es el que más se
   repite y el que bloquea la carga de una liga real.
2. **Exclusión de jugadores ya inscriptos** en el selector. Hoy
   se puede anotar a la misma persona en dos parejas, y la
   validación aparece recién al generar el fixture.
3. **Carga de resultados sin recarga.** Segundo en frecuencia.
4. **RPC único que devuelva el árbol de la liga.** Sin esto, el
   fan-out de queries limita cualquier mejora de fluidez.

### Sobre el orden de configuración

Un club que arranca de cero necesita, en este orden:
canchas → jugadores → torneo o liga → inscripciones → grupos →
fixture → resultados.

Hoy el sidebar no refleja ese orden ni indica dónde está parado.
Un club nuevo no sabe que sin canchas el fixture no tiene dónde
apoyarse.

**A evaluar:** un indicador de progreso de configuración en el
dashboard, que muestre qué falta. No un wizard obligatorio —un
club que ya está andando no debería verlo— sino una guía para el
que recién empieza.

### Advertencia sobre el fixture cerrado

Verificado el 12/08: si el club confirma una inscripción con el
fixture ya generado, el equipo entra a la liga pero **no al
fixture**. Queda en `league_teams` sin grupo asignado.

Eso va a pasar seguido cuando las inscripciones lleguen por el
formulario público. La UI tiene que avisarlo, no dejarlo en
silencio.

---

## Página pública del club

### Orden de prioridad decidido

1. **Reserva de canchas** — disponibilidad del día, con
   navegación a días siguientes
2. **Torneos y ligas abiertos a inscripción** — con el estado
   claramente visible
3. **En progreso** — con detalle de cómo va cada uno
4. **Finalizados** — con los cuatro primeros puestos destacados

### 1. Reserva de canchas

Lo que se prioriza: que alguien entre y vea **qué hay libre hoy**,
sin clics previos.

Hoy la página muestra una lista de canchas y un botón que lleva a
otra pantalla. La grilla de disponibilidad está en
`/player/bookings/new`, detrás de sesión y onboarding completo.

**Requiere:**
- Extraer la grilla a componente (hoy son ~90 líneas de JSX
  inline en un server component de 499)
- Hacerla pública, con login al final
- Propagar `next` a través de login y onboarding

**Ya resuelto (bloque A, mergeado):** `club_get_occupied_slots`
como fuente única de disponibilidad, con las siete fuentes de
ocupación. La grilla ya no miente.

### 2, 3 y 4 — Estados de torneos y ligas

Hoy hay dos secciones: "En juego" y "Ediciones anteriores". La
propuesta las lleva a tres, y el estado del evento pasa a ser
información de primer nivel, no un badge.

**Problema estructural:** el enum es `draft | active | finished`.
No existe un estado "inscripciones abiertas" distinto de "en
juego".

**RESUELTO el 13/08/2026** — ver `docs/decisiones.md`, sección
"Control de inscripciones". El enum quedó como está y el control
de inscripciones pasó a ser un eje aparte: `registrations_open`,
manual y reversible, del club.

Dos correcciones a lo que decía este documento:

- `registration_start_date` y `registration_end_date` **no
  existían**. Verificado contra producción: `42703`. Lo que había
  era `start_date`/`end_date`, rotuladas como fechas de
  inscripción en el wizard y usadas como fechas del evento en
  todos lados. Ahora los dos pares existen y son distintos.
- Derivar el estado de las fechas se descartó. Las inscripciones
  se cierran cuando se llena el cupo o cuando el club arma los
  grupos, no cuando llega una fecha.

El caso de inscripciones abiertas **y** partidos jugándose se
contempla: son dos chips, no una categoría.

### 4. Finalizados con podio

Los cuatro primeros con tratamiento visual competitivo:
campeón, subcampeón, y los dos semifinalistas.

**A resolver:** el podio no existe como dato. Hoy hay que
derivarlo del bracket —quién ganó la final, quién la perdió,
quiénes perdieron las semis— y eso cambia según la cantidad de
grupos:

| Grupos | Estructura | Cómo salen los 4 |
|---|---|---|
| 1 | Final directa | Solo hay 1° y 2°. **No hay 3° ni 4°.** |
| 2 | Semis + final | Los 4 salen limpio |
| 4 | Cuartos + semis + final | Los 4 salen limpio |

Con un solo grupo no se puede mostrar un podio de cuatro. Habría
que caer a la tabla de posiciones o mostrar solo dos.

**Y no existe partido por el tercer puesto.** Los dos
semifinalistas perdedores empatan en el tercer lugar. Hay que
decidir si se muestran ambos como terceros, o si se desempata
por posición en fase de grupos.

---

## Riesgo de alcance

Esta etapa toca las dos superficies más grandes del producto:

- La página de liga son 1087 líneas, la de torneo 800
- La reserva pública requiere extraer la grilla, hacerla anónima
  y arreglar la cadena de `next`
- El podio requiere lógica nueva que hoy no existe

**Sugerencia de corte:** la reserva pública y los estados de
eventos son lo que el cliente pidió. El podio y la fluidez del
panel del admin son mejoras que pueden ir después del
lanzamiento sin bloquear nada.
