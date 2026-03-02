# Club Consolidation (Admin MVP)

## Objetivo
Consolidar clubes duplicados (alias/variantes de nombre) sin perder datos operativos ni trazabilidad.

## Modelo de datos
- `public.clubs`
  - `merged_into uuid null`: club canónico destino.
  - `archived_at timestamptz null`: marca de archivado lógico.
  - No se realiza delete físico.
- `public.club_aliases`
  - Alias de nombres asociados al club canónico.
  - Deduplicación por ubicación + alias normalizado.
  - Constraint robusta con llaves derivadas para evitar duplicados con `NULL`.
- `public.club_merge_log`
  - Auditoría de merges.
  - Guarda source, target, usuario admin, fecha, cantidad de partidos afectados y nota.

## RPCs admin
- `admin_find_club_duplicates(p_query text, p_limit int)`
  - Devuelve clusters candidatos por ubicación + bucket de nombre normalizado.
  - Incluye clubes candidatos, partidos por club, score/confianza.
- `admin_merge_clubs(p_source_club_id uuid, p_target_club_id uuid, p_note text)`
  - Reasigna `matches.club_id` de source a target.
  - Mueve aliases a target con upsert.
  - Archiva source (`merged_into`, `archived_at`) y limpia estado claim.
  - Inserta log en `club_merge_log`.
  - Es idempotente: si ya estaba fusionado al mismo target, retorna `ok` con `idempotent=true`.
- `admin_attach_alias_to_club(...)`
  - Agrega alias manualmente al club canónico.

## Seguridad
- Validación de admin dentro de cada RPC (`profiles.role = 'admin'`).
- RLS habilitada en `club_aliases` y `club_merge_log` con políticas solo admin.
- No se abren permisos públicos.

## Uso del panel admin
1. Ir a `/admin/clubs/duplicates`.
2. Buscar clusters por nombre/ciudad.
3. Abrir cluster y revisar candidatos + impacto.
4. Elegir club objetivo, seleccionar clubes origen, agregar nota.
5. Ejecutar consolidación.

## Reversión manual (si hiciera falta)
No existe RPC de rollback automático en MVP. Reversión operativa:
1. Leer último registro en `club_merge_log` del merge a revertir.
2. Reasignar partidos: `matches.club_id` desde target a source según criterio temporal/auditoría.
3. Restaurar source:
   - `archived_at = NULL`
   - `merged_into = NULL`
4. Revisar `club_aliases` y mover aliases que correspondan.
5. Registrar el rollback en un nuevo log/manual note para trazabilidad.

## Nota de compatibilidad
Este stage también fuerza consistencia para que clubes archivados no aparezcan en búsquedas y candidatos:
- `club_search`
- `club_create`
- `club_find_claim_candidates`
