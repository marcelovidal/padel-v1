-- FIX: completar jugadores en partidos incompletos
--
-- Problema: un partido con menos de 4 jugadores queda trabado sin salida.
--   * player_update_match_roster exige created_by = auth.uid(), asi que un
--     turno agendado por el club (created_by = usuario del club) no lo puede
--     completar ningun jugador.
--   * ambos RPCs de edicion exigen status = 'scheduled', y player_update_match
--     pisa el status a 'completed' cuando match_at < now(), de modo que editar
--     un partido vencido falla a mitad de camino con INVALID_STATUS.
--   * player_update_match_roster borra el roster entero y reinserta al llamante
--     en el equipo A, cambiando de equipo a quien ya estaba cargado.
--
-- Este RPC es aditivo y esta pensado solo para completar:
--   * permite a CUALQUIER participante del partido (o a quien lo creo)
--   * no mira la fecha: un partido incompleto se completa siempre
--   * no borra ni reordena a los jugadores ya cargados
--   * se bloquea si ya hay resultado: el orden es jugadores -> resultado
--
-- Los RPCs existentes (player_update_match / player_update_match_roster) no se
-- tocan: siguen sirviendo a la edicion completa de un partido programado.

CREATE OR REPLACE FUNCTION public.player_complete_match_roster(
  p_match_id uuid,
  p_team_a_ids uuid[] DEFAULT '{}'::uuid[],
  p_team_b_ids uuid[] DEFAULT '{}'::uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_player_id uuid;
  v_created_by uuid;
  v_status public.match_status;
  v_max_players int;
  v_current int;
  v_current_a int;
  v_current_b int;
  v_add_a int;
  v_add_b int;
  v_additions uuid[];
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT p.id
    INTO v_player_id
  FROM public.players p
  WHERE p.user_id = v_uid
    AND p.deleted_at IS NULL;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_PROFILE_NOT_FOUND';
  END IF;

  SELECT m.created_by, m.status, m.max_players
    INTO v_created_by, v_status, v_max_players
  FROM public.matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'MATCH_NOT_FOUND';
  END IF;

  IF v_status = 'cancelled'::public.match_status THEN
    RAISE EXCEPTION 'MATCH_CANCELLED';
  END IF;

  -- Permiso por participacion, no por autoria: el que agenda puede ser el club.
  IF v_created_by IS DISTINCT FROM v_uid
     AND NOT EXISTS (
       SELECT 1
       FROM public.match_players mp
       WHERE mp.match_id = p_match_id
         AND mp.player_id = v_player_id
     )
  THEN
    RAISE EXCEPTION 'NOT_A_PARTICIPANT';
  END IF;

  IF EXISTS (SELECT 1 FROM public.match_results r WHERE r.match_id = p_match_id) THEN
    RAISE EXCEPTION 'RESULT_ALREADY_RECORDED';
  END IF;

  v_max_players := COALESCE(v_max_players, 4);

  SELECT
      count(*) FILTER (WHERE mp.team = 'A'::public.team_type),
      count(*) FILTER (WHERE mp.team = 'B'::public.team_type),
      count(*)
    INTO v_current_a, v_current_b, v_current
  FROM public.match_players mp
  WHERE mp.match_id = p_match_id;

  IF v_current >= v_max_players THEN
    RAISE EXCEPTION 'MATCH_ALREADY_COMPLETE';
  END IF;

  p_team_a_ids := COALESCE(p_team_a_ids, '{}'::uuid[]);
  p_team_b_ids := COALESCE(p_team_b_ids, '{}'::uuid[]);
  v_add_a := COALESCE(array_length(p_team_a_ids, 1), 0);
  v_add_b := COALESCE(array_length(p_team_b_ids, 1), 0);
  v_additions := p_team_a_ids || p_team_b_ids;

  IF v_add_a + v_add_b = 0 THEN
    RAISE EXCEPTION 'NO_PLAYERS_PROVIDED';
  END IF;

  IF (SELECT count(DISTINCT x) FROM unnest(v_additions) AS x) <> v_add_a + v_add_b THEN
    RAISE EXCEPTION 'DUPLICATE_PLAYERS';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.match_players mp
    WHERE mp.match_id = p_match_id
      AND mp.player_id = ANY(v_additions)
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_PLAYERS';
  END IF;

  IF (
    SELECT count(*)
    FROM public.players p
    WHERE p.id = ANY(v_additions)
      AND p.deleted_at IS NULL
  ) <> v_add_a + v_add_b THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  IF v_current_a + v_add_a > 2 OR v_current_b + v_add_b > 2 THEN
    RAISE EXCEPTION 'TEAM_FULL';
  END IF;

  IF v_current + v_add_a + v_add_b > v_max_players THEN
    RAISE EXCEPTION 'MATCH_FULL';
  END IF;

  INSERT INTO public.match_players (match_id, player_id, team)
  SELECT p_match_id, x, 'A'::public.team_type FROM unnest(p_team_a_ids) AS x
  UNION ALL
  SELECT p_match_id, x, 'B'::public.team_type FROM unnest(p_team_b_ids) AS x;

  -- El status queda como esta: la UI deriva el estado efectivo de match_at.
  UPDATE public.matches
  SET updated_at = now()
  WHERE id = p_match_id;

  RETURN p_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.player_complete_match_roster(uuid, uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_complete_match_roster(uuid, uuid[], uuid[]) TO authenticated;

COMMENT ON FUNCTION public.player_complete_match_roster(uuid, uuid[], uuid[]) IS
  'Agrega los jugadores faltantes a un partido incompleto. Permiso por participacion o autoria; independiente de la fecha; bloqueado si ya hay resultado.';

NOTIFY pgrst, 'reload schema';
