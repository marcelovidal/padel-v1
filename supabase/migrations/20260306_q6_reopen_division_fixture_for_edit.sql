-- STAGE Q6 HOTFIX: reabrir fixture de division para volver a modo edicion

BEGIN;

CREATE OR REPLACE FUNCTION public.club_reopen_division_fixture_for_edit(
  p_division_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_club_id uuid;
  v_league_id uuid;
  v_league_status text;
  v_removed_matches int := 0;
  v_removed_bookings int := 0;
  v_removed_results int := 0;
  v_removed_match_players int := 0;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT l.club_id, l.id, l.status
    INTO v_club_id, v_league_id, v_league_status
  FROM public.league_divisions d
  JOIN public.club_leagues l ON l.id = d.league_id
  WHERE d.id = p_division_id;

  IF v_club_id IS NULL THEN
    RAISE EXCEPTION 'DIVISION_NOT_FOUND';
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF v_league_status <> 'draft' THEN
    RAISE EXCEPTION 'LEAGUE_NOT_DRAFT'
      USING DETAIL = 'Solo se puede reabrir fixture en ligas en borrador.',
            HINT = 'Pasa la liga a borrador antes de reabrir la edicion.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.league_matches lm
    JOIN public.league_groups g ON g.id = lm.group_id
    WHERE g.division_id = p_division_id
  ) THEN
    RAISE EXCEPTION 'NO_FIXTURE_FOR_DIVISION';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.league_matches lm
    JOIN public.league_groups g ON g.id = lm.group_id
    JOIN public.matches m ON m.id = lm.match_id
    WHERE g.division_id = p_division_id
      AND m.status = 'completed'
  ) THEN
    RAISE EXCEPTION 'COMPLETED_MATCHES_EXIST'
      USING DETAIL = 'Hay partidos completados en esta division.',
            HINT = 'No se puede reabrir en modo edicion cuando existen resultados cargados.';
  END IF;

  CREATE TEMP TABLE tmp_q6_reopen_match_ids (
    match_id uuid PRIMARY KEY
  ) ON COMMIT DROP;

  INSERT INTO tmp_q6_reopen_match_ids(match_id)
  SELECT DISTINCT lm.match_id
  FROM public.league_matches lm
  JOIN public.league_groups g ON g.id = lm.group_id
  WHERE g.division_id = p_division_id;

  DELETE FROM public.court_bookings b
  WHERE b.match_id IN (SELECT match_id FROM tmp_q6_reopen_match_ids);
  GET DIAGNOSTICS v_removed_bookings = ROW_COUNT;

  DELETE FROM public.match_results mr
  WHERE mr.match_id IN (SELECT match_id FROM tmp_q6_reopen_match_ids);
  GET DIAGNOSTICS v_removed_results = ROW_COUNT;

  DELETE FROM public.match_players mp
  WHERE mp.match_id IN (SELECT match_id FROM tmp_q6_reopen_match_ids);
  GET DIAGNOSTICS v_removed_match_players = ROW_COUNT;

  DELETE FROM public.league_matches lm
  USING public.league_groups g
  WHERE g.id = lm.group_id
    AND g.division_id = p_division_id;
  GET DIAGNOSTICS v_removed_matches = ROW_COUNT;

  DELETE FROM public.matches m
  WHERE m.id IN (SELECT match_id FROM tmp_q6_reopen_match_ids);

  RETURN jsonb_build_object(
    'division_id', p_division_id,
    'league_id', v_league_id,
    'removed_matches', v_removed_matches,
    'removed_bookings', v_removed_bookings,
    'removed_match_players', v_removed_match_players,
    'removed_results', v_removed_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.club_reopen_division_fixture_for_edit(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_reopen_division_fixture_for_edit(uuid) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
