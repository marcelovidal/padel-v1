Estado de la rama — feature/player-edit

Resumen rápido
- Objetivo: `player.category` soportado; "Resultados inteligentes" (computeWinner) implementado y usado en upsert de resultados; UI para resultado integrada.
- Estado actual: TypeScript limpio (npx tsc --noEmit retornó 0 errores). Cambios funcionales aplicados en servicios, repositorios y UI.

Archivos con casts temporales (`as any`) y TODOs
- repositories/match.repository.ts — varias llamadas `.insert/.update/.upsert` usan `as any` y cliente Supabase casteado a `any`.
- repositories/player.repository.ts — llamadas a `.insert/.update` y cliente casteado a `any`.
- services/match.service.ts — uso de `computeWinner(input.sets as any[])` y persistencia con `sets: computed.normalizedSets as any`.
- lib/auth.ts — `(profile as any).role` guard; añade TODO.
- app/login/page.tsx — `useFormState(signInAction as any)`.
- app/admin/users/[id]/edit/page.tsx — `player.position/status/category` casteados a `any`.
- app/admin/users/[id]/edit/edit-form.tsx — `useFormState(updatePlayerAction as any)` and state casts.
- app/admin/users/actions.ts — `(error as any)?.digest` usage.
- app/admin/matches/[id]/result-inline.tsx — `existingResult!.sets as any[]` cast.
- app/admin/matches/[id]/result/result-form.tsx — `useFormState(upsertMatchResultAction as any)` and `existingResult.sets` cast.
- app/admin/matches/[id]/add-player-form.tsx — `useFormState(addPlayerToMatchAction as any)`.
- app/admin/matches/page.tsx — `match.match_results!.sets as any[]` cast.
- app/admin/matches/new/page.tsx — `useFormState(createMatchAction as any)`.

Qué se hizo para estabilizar
- Añadí guards para `match_results.sets` antes de mapearlos (Array.isArray checks).
- Implementé `computeWinner` en `lib/match/computeWinner.ts` y lo integré en `services/match.service.ts`.
- Unifiqué estados iniciales de `useFormState` y añadí comentarios TODO donde se usó `as any`.
- Aplicaciones mínimas de `as any` localizadas para resolver incompatibilidades temporales con tipos del cliente Supabase.

Deuda técnica y recomendaciones
1. Eliminar todos los `as any` y crear/usar un Supabase server client correctamente tipado: `createServerClient<Database>()` en `lib/supabase/server` y propagar `Database` por todo el repo.
2. Agregar tests unitarios para `lib/match/computeWinner.ts` (casos válidos, inválidos, cortes tempranos, sets extra).
3. Ejecutar `npm run dev` y probar manualmente los flujos clave: crear/editar jugador (category), crear partido, agregar jugadores, cargar/editar resultado.
4. Revisar triggers/DB: asegurar que `match_results` trigger que actualiza `matches.status` existe; si no, el servicio actualiza manualmente el status.

Próximos pasos sugeridos (rápidos)
- ¿Quieres que añada comentarios TODO adicionales a cada `as any` con un enlace a este documento? (puedo hacerlo y luego commitear).
- ¿Deseas que intente ejecutar `npm run dev` aquí y capturar logs, o prefieres ejecutarlo localmente y compartir errores?

Notas
- No se cambiaron contratos externos ni migraciones de DB en este parche; si vas a desplegar, valida la presencia de la nueva columna `players.category` en la base de datos.

Autoevaluación (player_match_assessments)

- Modelo actualizado para permitir autoevaluaciones parciales: los campos de golpes (`volea`, `globo`, `remate`, `bandeja`, `vibora`, `bajada_pared`, `saque`, `recepcion_saque`) son ahora `NULLABLE` y `comments` también puede ser `NULL`.
- Se agregó una constraint a nivel tabla para evitar filas totalmente vacías: al menos un golpe no nulo o un `comments` no vacío.
- El SQL definitivo está en `scripts/sql/create-player-match-assessments.sql`. Se aplicó una migración correctiva documentada en `scripts/sql/migrate-player-match-assessments-nullable.sql` y ya se actualizó el entorno de desarrollo/staging.

Notas operativas:

- La validación se realiza en cliente (formulario) y en servidor (Zod refine), además del CHECK en BD para robustez.
- Revisar políticas RLS/roles si se va a habilitar acceso player-first en un futuro.

Fecha: (auto) rama trabajada por el agente
