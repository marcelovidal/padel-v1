-- Prioridad de categoría en inscripciones de torneos y ligas.
-- Regla decidida: al inscribir una pareja, la categoría efectiva de cada
-- jugador es primero la asignada por el CLUB ORGANIZADOR
-- (player_club_categories); si no tiene, la autoasignada (players.category).
-- El orden completo del valor final queda:
--   entry manual > club(A) > auto(A) > club(B) > auto(B)
--
-- Reescribe los dos RPCs de alta del club con la MISMA firma que producción
-- (verificada con pg_get_functiondef). Sin cambios de parámetros: CREATE OR
-- REPLACE directo, sin sobrecargas.
--
-- PENDIENTE (fuera de esta migración): aplicar la misma regla dentro de los
-- cuatro RPCs de solicitudes públicas/de jugador —public_request_tournament_
-- registration, public_request_league_registration, player_request_tournament_
-- registration, player_request_league_registration— cuando se tengan sus
-- cuerpos vigentes completos.

CREATE OR REPLACE FUNCTION public.club_register_tournament_team(
  p_tournament_id uuid,
  p_player_a_id uuid,
  p_player_b_id uuid,
  p_entry_category_int integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_club_id uuid;
  v_team_id uuid;
  v_cat_a text;
  v_cat_b text;
  v_cat_a_int int;
  v_cat_b_int int;
  v_club_cat_a int;
  v_club_cat_b int;
BEGIN
  SELECT club_id INTO v_club_id FROM public.club_tournaments WHERE id = p_tournament_id;
  IF v_club_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'TOURNAMENT_NOT_FOUND');
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHORIZED');
  END IF;

  -- Categorías autoasignadas
  SELECT category INTO v_cat_a FROM public.players WHERE id = p_player_a_id;
  SELECT category INTO v_cat_b FROM public.players WHERE id = p_player_b_id;

  -- Categoría del club organizador: prima sobre la autoasignada
  SELECT pcc.category INTO v_club_cat_a
  FROM public.player_club_categories pcc
  WHERE pcc.club_id = v_club_id AND pcc.player_id = p_player_a_id;

  SELECT pcc.category INTO v_club_cat_b
  FROM public.player_club_categories pcc
  WHERE pcc.club_id = v_club_id AND pcc.player_id = p_player_b_id;

  v_cat_a_int := COALESCE(v_club_cat_a, NULLIF(v_cat_a, '')::integer);
  v_cat_b_int := COALESCE(v_club_cat_b, NULLIF(v_cat_b, '')::integer);

  INSERT INTO public.tournament_teams (
    tournament_id,
    player_id_a,
    player_id_b,
    entry_category_int,
    created_at
  ) VALUES (
    p_tournament_id,
    p_player_a_id,
    p_player_b_id,
    COALESCE(p_entry_category_int, v_cat_a_int, v_cat_b_int),
    now()
  ) RETURNING id INTO v_team_id;

  RETURN jsonb_build_object('success', true, 'team_id', v_team_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.club_register_league_team(
  p_league_id uuid,
  p_division_id uuid,
  p_player_a_id uuid,
  p_player_b_id uuid,
  p_entry_category_int integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_club_id uuid;
  v_team_id uuid;
  v_cat_a text;
  v_cat_b text;
  v_cat_a_int int;
  v_cat_b_int int;
  v_club_cat_a int;
  v_club_cat_b int;
BEGIN
  SELECT club_id INTO v_club_id FROM public.club_leagues WHERE id = p_league_id;
  IF v_club_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'LEAGUE_NOT_FOUND');
  END IF;

  IF NOT public.q6_can_manage_club(v_club_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHORIZED');
  END IF;

  SELECT category INTO v_cat_a FROM public.players WHERE id = p_player_a_id;
  SELECT category INTO v_cat_b FROM public.players WHERE id = p_player_b_id;

  SELECT pcc.category INTO v_club_cat_a
  FROM public.player_club_categories pcc
  WHERE pcc.club_id = v_club_id AND pcc.player_id = p_player_a_id;

  SELECT pcc.category INTO v_club_cat_b
  FROM public.player_club_categories pcc
  WHERE pcc.club_id = v_club_id AND pcc.player_id = p_player_b_id;

  v_cat_a_int := COALESCE(v_club_cat_a, NULLIF(v_cat_a, '')::integer);
  v_cat_b_int := COALESCE(v_club_cat_b, NULLIF(v_cat_b, '')::integer);

  INSERT INTO public.league_teams (
    league_id,
    division_id,
    player_id_a,
    player_id_b,
    entry_category_int,
    created_at
  ) VALUES (
    p_league_id,
    p_division_id,
    p_player_a_id,
    p_player_b_id,
    COALESCE(p_entry_category_int, v_cat_a_int, v_cat_b_int),
    now()
  ) RETURNING id INTO v_team_id;

  RETURN jsonb_build_object('success', true, 'team_id', v_team_id);
END;
$function$;

NOTIFY pgrst, 'reload schema';
