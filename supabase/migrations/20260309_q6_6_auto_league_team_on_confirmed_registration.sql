-- Q6.6: Auto-insert league_team when a DUO league registration is confirmed
-- When a confirmed registration has both player_id AND teammate_player_id,
-- get or create the default division for the league, then insert the team
-- (ON CONFLICT DO NOTHING).
-- Solo registrations (no teammate) are confirmed but still require manual pairing.

BEGIN;

CREATE OR REPLACE FUNCTION public.club_resolve_league_registration(
  p_registration_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid                uuid;
  v_club_id            uuid;
  v_league_id          uuid;
  v_league_name        text;
  v_player_id          uuid;
  v_teammate_player_id uuid;
  v_notify_uid         uuid;
  v_division_id        uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_status NOT IN ('confirmed', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT lr.player_id, lr.teammate_player_id, cl.club_id, cl.id, cl.name
    INTO v_player_id, v_teammate_player_id, v_club_id, v_league_id, v_league_name
  FROM public.league_registrations lr
  JOIN public.club_leagues cl ON cl.id = lr.league_id
  WHERE lr.id = p_registration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  UPDATE public.league_registrations
  SET status      = p_status,
      resolved_at = now(),
      resolved_by = v_uid
  WHERE id = p_registration_id;

  IF p_status = 'confirmed' THEN
    -- Auto-create the team if it is a DUO registration
    IF v_teammate_player_id IS NOT NULL THEN
      -- Get or create the default division for this league
      SELECT id INTO v_division_id
      FROM public.league_divisions
      WHERE league_id = v_league_id
      ORDER BY created_at ASC
      LIMIT 1;

      IF v_division_id IS NULL THEN
        INSERT INTO public.league_divisions (league_id, name, category_mode, allow_override)
        VALUES (v_league_id, 'Principal', 'OPEN', true)
        RETURNING id INTO v_division_id;
      END IF;

      INSERT INTO public.league_teams (division_id, player_id_a, player_id_b)
      VALUES (v_division_id, v_player_id, v_teammate_player_id)
      ON CONFLICT DO NOTHING;
    END IF;

    -- Notify both players
    FOR v_notify_uid IN
      SELECT DISTINCT p.user_id
      FROM public.players p
      WHERE p.id IN (v_player_id, v_teammate_player_id)
        AND p.user_id IS NOT NULL
    LOOP
      INSERT INTO public.notifications (user_id, type, entity_id, payload, priority, dedupe_key)
      VALUES (
        v_notify_uid,
        'league_registration_confirmed',
        v_league_id,
        jsonb_build_object(
          'schema_version', 1,
          'title', 'Inscripcion confirmada',
          'message', 'Tu inscripcion a la liga "' || v_league_name || '" fue confirmada.',
          'cta_label', 'Ver liga',
          'link', '/player/events'
        ),
        2,
        'league_registration_confirmed:' || p_registration_id::text || ':' || v_notify_uid::text
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.club_resolve_league_registration(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
