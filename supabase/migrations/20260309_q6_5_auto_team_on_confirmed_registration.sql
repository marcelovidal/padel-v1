-- Q6.5: Auto-insert tournament_team when a DUO registration is confirmed
-- When a confirmed registration has both player_id AND teammate_player_id,
-- automatically creates the team in tournament_teams (ON CONFLICT DO NOTHING).
-- Solo registrations (no teammate) are confirmed but still require manual pairing.

BEGIN;

CREATE OR REPLACE FUNCTION public.club_resolve_tournament_registration(
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
  v_tournament_id      uuid;
  v_tournament_name    text;
  v_player_id          uuid;
  v_teammate_player_id uuid;
  v_notify_uid         uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;
  IF p_status NOT IN ('confirmed', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT tr.player_id, tr.teammate_player_id, ct.club_id, ct.id, ct.name
    INTO v_player_id, v_teammate_player_id, v_club_id, v_tournament_id, v_tournament_name
  FROM public.tournament_registrations tr
  JOIN public.club_tournaments ct ON ct.id = tr.tournament_id
  WHERE tr.id = p_registration_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REGISTRATION_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  UPDATE public.tournament_registrations
  SET status      = p_status,
      resolved_at = now(),
      resolved_by = v_uid
  WHERE id = p_registration_id;

  IF p_status = 'confirmed' THEN
    -- Auto-create the team if it is a DUO registration
    IF v_teammate_player_id IS NOT NULL THEN
      INSERT INTO public.tournament_teams (tournament_id, player_id_a, player_id_b)
      VALUES (v_tournament_id, v_player_id, v_teammate_player_id)
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
        'tournament_registration_confirmed',
        v_tournament_id,
        jsonb_build_object(
          'schema_version', 1,
          'title',     'Inscripcion confirmada',
          'message',   'Tu inscripcion al torneo "' || v_tournament_name || '" fue confirmada.',
          'cta_label', 'Ver torneo',
          'link',      '/player/events'
        ),
        2,
        'tournament_registration_confirmed:' || p_registration_id::text || ':' || v_notify_uid::text
      )
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.club_resolve_tournament_registration(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
