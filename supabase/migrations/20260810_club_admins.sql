-- ============================================================================
-- club_admins — varios administradores por club
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
--
-- Problema
-- --------
-- Un club tiene UN solo administrador, en clubs.owner_player_id (columna
-- escalar). Un club real necesita varios (dueño + encargado + mostrador), y
-- hoy dar acceso a otro obliga a desplazar al titular.
--
-- Modelo nuevo
-- ------------
-- Tabla club_admins (N administradores por club, todos con permisos
-- identicos, sin jerarquia). q6_can_manage_club — el guardian de los RPCs de
-- gestion — pasa a autorizar por club_admins en vez de owner_player_id.
--
-- clubs.owner_player_id NO se elimina en esta migracion: hay ~15 RPCs y 5
-- archivos de la app que todavia lo leen. Ver el archivo
-- 20260810_club_admins_unify_guard.sql (se aplica despues) y el informe.
--
-- Orden de aplicacion
-- -------------------
--   1. 20260810_club_admins.sql              <- este archivo
--   2. 20260810_club_admins_rpcs.sql
--   3. 20260810_club_admins_unify_guard.sql
-- ============================================================================

BEGIN;

-- ─── 1. Tabla ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.club_admins (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id    uuid NOT NULL REFERENCES public.clubs(id)   ON DELETE CASCADE,
  player_id  uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  added_by   uuid REFERENCES public.players(id)          ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_club_admins_club_player UNIQUE (club_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_club_admins_club_id
  ON public.club_admins(club_id);

CREATE INDEX IF NOT EXISTS idx_club_admins_player_id
  ON public.club_admins(player_id);

COMMENT ON TABLE public.club_admins IS
  'Administradores de un club. Todos con los mismos permisos, sin jerarquia. Reemplaza a clubs.owner_player_id.';

-- ─── 2. RLS ─────────────────────────────────────────────────────────────────
-- Solo lectura, y solo de los clubes que uno administra. Alta y baja pasan
-- exclusivamente por los RPCs SECURITY DEFINER (club_add_admin /
-- club_remove_admin), que validan las reglas de negocio.
-- q6_can_manage_club es SECURITY DEFINER, asi que consultar club_admins desde
-- esta policy no vuelve a evaluar la policy: no hay recursion.

ALTER TABLE public.club_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "club_admins_select_own_clubs" ON public.club_admins;

CREATE POLICY "club_admins_select_own_clubs"
  ON public.club_admins FOR SELECT
  USING (public.q6_can_manage_club(club_id, auth.uid()));

-- ─── 3. Backfill ────────────────────────────────────────────────────────────
-- Todo owner_player_id no nulo pasa a ser administrador. Sin filtrar por
-- deleted_at/archived_at: q6_can_manage_club ya descarta esos clubes, y
-- filtrar aca perderia el dato si un club se restaura.
-- added_by queda NULL: son altas del modelo viejo, no las agrego nadie.

INSERT INTO public.club_admins (club_id, player_id, added_by)
SELECT c.id, c.owner_player_id, NULL
FROM public.clubs c
WHERE c.owner_player_id IS NOT NULL
ON CONFLICT (club_id, player_id) DO NOTHING;

-- ─── 4. q6_can_manage_club ──────────────────────────────────────────────────
-- Guardian de 74 call sites en los RPCs q6_* (ligas, torneos, playoffs,
-- fixtures, inscripciones, resultados).
--
-- Reemplaza a 20260808_fix_q6_can_manage_club_is_club_owner.sql.
--
-- Autoriza por tres vias:
--   1. claimed_by            — modelo viejo de club reclamado (se conserva)
--   2. club_admins           — modelo nuevo
--   3. q6_is_admin           — super admin
--
-- Se quita la rama owner_player_id + is_club_owner: queda cubierta por el
-- backfill del punto 3.
--
-- Nota deliberada: la rama club_admins NO exige players.is_club_owner. La
-- pertenencia a club_admins ES la autorizacion; el flag solo controla que
-- aparezca "Mi club" en el sidebar. Si dependiera del flag, un bug al
-- limpiarlo dejaria al club sin administradores efectivos.
-- Tampoco exige claim_status = 'claimed': un club puede tener administradores
-- sin haber pasado por el flujo de reclamo (alta por invitacion).

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
    FROM public.club_admins ca
    JOIN public.clubs c   ON c.id = ca.club_id
    JOIN public.players p ON p.id = ca.player_id
    WHERE ca.club_id = p_club_id
      AND c.deleted_at IS NULL
      AND c.archived_at IS NULL
      AND c.merged_into IS NULL
      AND p.user_id = p_uid
      AND p.deleted_at IS NULL
  )
  OR public.q6_is_admin(p_uid);
$function$;

COMMIT;

NOTIFY pgrst, 'reload schema';
