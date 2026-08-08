-- ============================================================================
-- q6_can_manage_club — soporte del modelo is_club_owner
-- ============================================================================
-- ATENCION: este cambio YA FUE APLICADO A MANO en Supabase produccion
-- el 08/08/2026. Este archivo es el REGISTRO del cambio, no una migracion
-- pendiente de ejecutar. No re-aplicar salvo para reconstruir un entorno
-- desde cero.
--
-- Motivo: con la migracion del panel de club a /player/mi-club, el dueño
-- de club dejo de ser un usuario con clubs.claimed_by y paso a ser un
-- player con players.is_club_owner + clubs.owner_player_id. La version
-- anterior de q6_can_manage_club solo contemplaba la rama claimed_by, por
-- lo que todos los RPCs de ligas y torneos (SECURITY DEFINER) rechazaban
-- al dueño de club con NOT_ALLOWED.
--
-- La funcion ahora autoriza por tres vias:
--   1. claimed_by  — modelo viejo de club reclamado
--   2. owner_player_id + is_club_owner — modelo nuevo
--   3. q6_is_admin — super admin
-- ============================================================================

CREATE OR REPLACE FUNCTION public.q6_can_manage_club(p_club_id uuid, p_uid uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND c.claim_status = 'claimed'
      AND c.claimed_by = p_uid
  )
  OR EXISTS (
    SELECT 1
    FROM public.clubs c
    JOIN public.players p ON p.id = c.owner_player_id
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND p.user_id = p_uid
      AND p.is_club_owner = true
      AND p.deleted_at IS NULL
  )
  OR public.q6_is_admin(p_uid);
$function$;
