-- ============================================================================
-- RPCs de gestion de administradores de club
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE, DESPUES de 20260810_club_admins.sql.
--
-- club_add_admin    — agrega un administrador
-- club_remove_admin — quita un administrador (nunca a uno mismo, nunca al ultimo)
-- club_list_admins  — lista los administradores del club
--
-- Reglas de negocio:
--   * todos los administradores tienen permisos identicos, sin jerarquia
--   * cualquier administrador puede agregar o quitar a cualquier otro
--   * NADIE puede quitarse a si mismo (evita clubes huerfanos por error)
--   * un club no puede quedarse sin administradores
--   * al ser removido, el jugador recibe una notificacion
--
-- players.is_club_owner: lo prende club_add_admin y lo apaga club_remove_admin
-- SOLO si el jugador no queda administrando ningun otro club. Ese flag es lo
-- que hace aparecer "Mi club" en el sidebar del jugador.
-- ============================================================================

BEGIN;

-- ─── 1. Tipo de notificacion nuevo ──────────────────────────────────────────
-- Se agrega club_admin_removed a los 22 tipos vigentes (20260415_003).
-- notification_create NO se toca: como el resto de los RPCs del proyecto,
-- club_remove_admin inserta directo en public.notifications.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS chk_notifications_type;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type = ANY (ARRAY[
    'player_match_result_ready',
    'player_claim_success',
    'club_claim_requested',
    'club_match_created',
    'tournament_open_for_registration',
    'league_open_for_registration',
    'tournament_registration_requested',
    'league_registration_requested',
    'tournament_registration_confirmed',
    'league_registration_confirmed',
    'coach_invitation',
    'coach_invitation_accepted',
    'coach_challenge_assigned',
    'coach_booking_request',
    'coach_booking_confirmed',
    'booking_confirmed',
    'booking_cancelled',
    'booking_requested',
    'training_session_scheduled',
    'coach_booking_cancelled',
    'club_owner_request_approved',
    'club_owner_request_rejected',
    'club_admin_removed'
  ])) NOT VALID;

-- ─── 2. club_add_admin ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_add_admin(
  p_club_id uuid,
  p_player_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_caller_player_id uuid;
  v_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NOT public.q6_can_manage_club(p_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  PERFORM 1
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
    AND c.archived_at IS NULL
    AND c.merged_into IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  PERFORM 1
  FROM public.players p
  WHERE p.id = p_player_id
    AND p.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.club_admins ca
    WHERE ca.club_id = p_club_id AND ca.player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_ADMIN';
  END IF;

  -- Puede ser NULL si quien agrega es un super admin sin perfil de jugador.
  SELECT p.id INTO v_caller_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL;

  INSERT INTO public.club_admins (club_id, player_id, added_by)
  VALUES (p_club_id, p_player_id, v_caller_player_id)
  RETURNING id INTO v_id;

  -- Sin este flag el jugador no ve "Mi club" en el sidebar.
  UPDATE public.players
  SET is_club_owner = true,
      club_owner_enabled_at = COALESCE(club_owner_enabled_at, now())
  WHERE id = p_player_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_add_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_add_admin(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.club_add_admin(uuid, uuid) IS
  'Agrega un administrador al club. Requiere ser administrador del club. Activa players.is_club_owner.';

-- ─── 3. club_remove_admin ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_remove_admin(
  p_club_id uuid,
  p_player_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_caller_player_id uuid;
  v_admins_count int;
  v_club_name text;
  v_target_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NOT public.q6_can_manage_club(p_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  SELECT p.id INTO v_caller_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL;

  -- Nadie se quita a si mismo: evita dejar el club huerfano por error.
  IF v_caller_player_id IS NOT NULL AND v_caller_player_id = p_player_id THEN
    RAISE EXCEPTION 'CANNOT_REMOVE_SELF';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.club_admins ca
    WHERE ca.club_id = p_club_id AND ca.player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'NOT_AN_ADMIN';
  END IF;

  SELECT count(*) INTO v_admins_count
  FROM public.club_admins ca
  WHERE ca.club_id = p_club_id;

  IF v_admins_count <= 1 THEN
    RAISE EXCEPTION 'LAST_ADMIN';
  END IF;

  SELECT c.name INTO v_club_name
  FROM public.clubs c
  WHERE c.id = p_club_id;

  SELECT p.user_id INTO v_target_uid
  FROM public.players p
  WHERE p.id = p_player_id;

  DELETE FROM public.club_admins
  WHERE club_id = p_club_id
    AND player_id = p_player_id;

  -- El flag se apaga solo si no le queda ningun otro club que administrar.
  IF NOT EXISTS (
    SELECT 1 FROM public.club_admins ca
    WHERE ca.player_id = p_player_id
  ) THEN
    UPDATE public.players
    SET is_club_owner = false,
        club_owner_enabled_at = NULL
    WHERE id = p_player_id;
  END IF;

  IF v_target_uid IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
    VALUES (
      v_target_uid,
      'club_admin_removed',
      p_club_id,
      jsonb_build_object(
        'schema_version', 1,
        'title', 'Ya no administras ' || COALESCE(v_club_name, 'el club'),
        'message', 'Se te quito el acceso de administrador de ' || COALESCE(v_club_name, 'el club') || '. Si creés que es un error, hablá con el club.'
      ),
      1,
      'club_admin_removed:' || p_club_id::text || ':' || p_player_id::text || ':' || to_char(now(), 'YYYYMMDDHH24MISS')
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN p_player_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_remove_admin(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_remove_admin(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.club_remove_admin(uuid, uuid) IS
  'Quita un administrador del club. Nunca a uno mismo ni al ultimo administrador. Notifica al removido.';

-- ─── 4. club_list_admins ────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.club_list_admins(
  p_club_id uuid
)
RETURNS TABLE (
  player_id uuid,
  display_name text,
  first_name text,
  last_name text,
  avatar_url text,
  city text,
  created_at timestamptz,
  added_by_player_id uuid,
  added_by_name text,
  is_self boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_caller_player_id uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NOT public.q6_can_manage_club(p_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  SELECT p.id INTO v_caller_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(NULLIF(TRIM(p.display_name), ''),
             NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
             'Jugador')::text,
    p.first_name::text,
    p.last_name::text,
    p.avatar_url::text,
    p.city::text,
    ca.created_at,
    ca.added_by,
    COALESCE(NULLIF(TRIM(ab.display_name), ''),
             NULLIF(TRIM(CONCAT_WS(' ', ab.first_name, ab.last_name)), ''))::text,
    (p.id = v_caller_player_id) AS is_self
  FROM public.club_admins ca
  JOIN public.players p ON p.id = ca.player_id
  LEFT JOIN public.players ab ON ab.id = ca.added_by
  WHERE ca.club_id = p_club_id
  ORDER BY ca.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.club_list_admins(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_list_admins(uuid) TO authenticated;

COMMENT ON FUNCTION public.club_list_admins(uuid) IS
  'Lista los administradores del club, ordenados por antiguedad. Requiere ser administrador del club.';

COMMIT;

NOTIFY pgrst, 'reload schema';
