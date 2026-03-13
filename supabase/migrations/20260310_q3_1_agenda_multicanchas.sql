-- ============================================================
-- Q3.1 Agenda multi-canchas
-- RPC: club_get_agenda_slots
-- Devuelve todos los slots ocupados (bookings + liga + torneo)
-- para un club en un rango de fechas.
-- ============================================================

CREATE OR REPLACE FUNCTION public.club_get_agenda_slots(
  p_club_id  uuid,
  p_from     timestamptz,
  p_to       timestamptz
)
RETURNS TABLE (
  slot_id        uuid,
  slot_type      text,
  court_id       uuid,
  court_name     text,
  start_at       timestamptz,
  end_at         timestamptz,
  entity_id      uuid,
  entity_name    text,
  match_id       uuid,
  team_a         text,
  team_b         text,
  requester_name text,
  note           text,
  booking_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  -- Auth check
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Club ownership check
  PERFORM 1
  FROM public.clubs c
  WHERE c.id           = p_club_id
    AND c.deleted_at   IS NULL
    AND c.claim_status = 'claimed'
    AND c.claimed_by   = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  RETURN QUERY

    -- ── court_bookings (solicitudes + confirmadas) ────────────────────────
    SELECT
      cb.id                                                           AS slot_id,
      CASE cb.status
        WHEN 'requested' THEN 'booking_requested'
        ELSE 'booking_confirmed'
      END                                                             AS slot_type,
      cb.court_id,
      cc.name                                                         AS court_name,
      cb.start_at,
      cb.end_at,
      cb.id                                                           AS entity_id,
      NULL::text                                                      AS entity_name,
      cb.match_id,
      NULL::text                                                      AS team_a,
      NULL::text                                                      AS team_b,
      p.display_name                                                  AS requester_name,
      cb.note,
      cb.status::text                                                 AS booking_status
    FROM public.court_bookings cb
    JOIN public.club_courts   cc ON cc.id = cb.court_id
    LEFT JOIN public.players  p  ON p.id  = cb.requested_by_player_id
    WHERE cb.club_id           = p_club_id
      AND cb.status IN ('requested', 'confirmed')
      AND cb.start_at          < p_to
      AND cb.end_at            > p_from

  UNION ALL

    -- ── league_matches con cancha y horario asignados ──────────────────────
    SELECT
      lm.id                                                           AS slot_id,
      'league_match'                                                  AS slot_type,
      lm.court_id,
      cc.name                                                         AS court_name,
      lm.scheduled_at                                                 AS start_at,
      lm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute') AS end_at,
      lm.id                                                           AS entity_id,
      cl.name                                                         AS entity_name,
      lm.match_id,
      COALESCE(pa1.display_name, '?') || ' / ' || COALESCE(pa2.display_name, '?') AS team_a,
      COALESCE(pb1.display_name, '?') || ' / ' || COALESCE(pb2.display_name, '?') AS team_b,
      NULL::text                                                      AS requester_name,
      NULL::text                                                      AS note,
      NULL::text                                                      AS booking_status
    FROM public.league_matches   lm
    JOIN public.club_courts      cc  ON cc.id  = lm.court_id
    JOIN public.league_groups    lg  ON lg.id  = lm.group_id
    JOIN public.league_divisions ld  ON ld.id  = lg.division_id
    JOIN public.club_leagues     cl  ON cl.id  = ld.league_id
    JOIN public.league_teams     ta  ON ta.id  = lm.team_a_id
    JOIN public.league_teams     tb  ON tb.id  = lm.team_b_id
    LEFT JOIN public.players     pa1 ON pa1.id = ta.player_id_a
    LEFT JOIN public.players     pa2 ON pa2.id = ta.player_id_b
    LEFT JOIN public.players     pb1 ON pb1.id = tb.player_id_a
    LEFT JOIN public.players     pb2 ON pb2.id = tb.player_id_b
    WHERE cl.club_id             = p_club_id
      AND lm.court_id            IS NOT NULL
      AND lm.scheduled_at        IS NOT NULL
      AND lm.scheduled_at        < p_to
      AND (lm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute')) > p_from

  UNION ALL

    -- ── tournament_matches con cancha y horario asignados ─────────────────
    SELECT
      tm.id                                                           AS slot_id,
      'tournament_match'                                              AS slot_type,
      tm.court_id,
      cc.name                                                         AS court_name,
      tm.scheduled_at                                                 AS start_at,
      tm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute') AS end_at,
      tm.id                                                           AS entity_id,
      ct.name                                                         AS entity_name,
      tm.match_id,
      COALESCE(pa1.display_name, '?') || ' / ' || COALESCE(pa2.display_name, '?') AS team_a,
      COALESCE(pb1.display_name, '?') || ' / ' || COALESCE(pb2.display_name, '?') AS team_b,
      NULL::text                                                      AS requester_name,
      NULL::text                                                      AS note,
      NULL::text                                                      AS booking_status
    FROM public.tournament_matches  tm
    JOIN public.club_courts         cc  ON cc.id  = tm.court_id
    JOIN public.tournament_groups   tg  ON tg.id  = tm.group_id
    JOIN public.club_tournaments    ct  ON ct.id  = tg.tournament_id
    JOIN public.tournament_teams    ta  ON ta.id  = tm.team_a_id
    JOIN public.tournament_teams    tb  ON tb.id  = tm.team_b_id
    LEFT JOIN public.players        pa1 ON pa1.id = ta.player_id_a
    LEFT JOIN public.players        pa2 ON pa2.id = ta.player_id_b
    LEFT JOIN public.players        pb1 ON pb1.id = tb.player_id_a
    LEFT JOIN public.players        pb2 ON pb2.id = tb.player_id_b
    WHERE ct.club_id             = p_club_id
      AND tm.court_id            IS NOT NULL
      AND tm.scheduled_at        IS NOT NULL
      AND tm.scheduled_at        < p_to
      AND (tm.scheduled_at
        + (COALESCE(cc.slot_interval_minutes, 90) * INTERVAL '1 minute')) > p_from

  ORDER BY start_at, court_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.club_get_agenda_slots(uuid, timestamptz, timestamptz)
  TO authenticated;
