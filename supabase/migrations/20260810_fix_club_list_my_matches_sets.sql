-- ============================================================================
-- Fix: club_list_my_matches leia columnas inexistentes en match_results
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE, DESPUES de 20260810_club_admins_unify_guard.sql.
--
-- El nombre de este archivo ordena alfabeticamente DESPUES de los tres
-- 20260810_club_admins_*.sql ("c" < "f"), asi que una reaplicacion por orden de
-- nombre no revive la version rota.
--
-- Problema
-- --------
-- La definicion vigente en 20260415_006_fix_club_list_my_matches_club_id.sql
-- (y su gemela 20260415_fix_club_list_my_matches_club_id.sql, contenido
-- identico) armaba el campo match_results asi:
--
--   jsonb_agg(jsonb_build_object('a', r.score_a, 'b', r.score_b)
--             ORDER BY r.set_number)
--
-- match_results NO tiene score_a, score_b ni set_number. Su estructura real es:
--   id, match_id, sets (jsonb), winner_team, recorded_at, created_at, updated_at
--
-- En produccion eso rompe la query entera:
--   code 42703 — column r.score_a does not exist
-- GET /player/mi-club responde 200 pero el listado de partidos viene vacio.
--
-- 20260810_club_admins_unify_guard.sql copio esa definicion verbatim (solo
-- cambiaba el bloque del guardian), asi que arrastro el bug.
--
-- Segundo defecto, independiente de las columnas: devolvia un ARRAY, pero el
-- consumidor declara un OBJETO —
--   repositories/club.repository.ts:98
--   match_results: { sets: Array<{a,b}>; winner_team: "A"|"B" } | null
-- Aun con las columnas correctas, el mapeo del repositorio no lo leeria bien.
--
-- Cambio
-- ------
-- El bloque de match_results vuelve a la forma de la definicion original
-- (20260226_stage_r_club_portal.sql), que era correcta en ambas cosas:
--
--   jsonb_build_object('sets', r.sets, 'winner_team', r.winner_team)
--
-- Sin jsonb_agg: match_results tiene UNIQUE (match_id) — constraint
-- match_results_match_id_key, 20260206_stage_j_results.sql — o sea una fila por
-- partido. Agregar no tenia sentido.
--
-- r.sets se pasa crudo a proposito: lib/match/matchUtils.ts normalizeSets()
-- acepta tanto {a,b} como {team_a_games,team_b_games}, igual que en el resto de
-- los caminos de lectura del proyecto.
--
-- ALCANCE ESTRICTO: se cambia UNICAMENTE el subselect de match_results. Todo lo
-- demas es copia verbatim de 20260810_club_admins_unify_guard.sql, incluido el
-- guardian unificado public.q6_can_manage_club(c.id, v_uid) — NO se vuelve al
-- chequeo inline de claimed_by / owner_player_id.
--
-- La firma no cambia (uuid, int), asi que CREATE OR REPLACE conserva los GRANT:
-- no hace falta re-otorgar ni hacer DROP.
-- ============================================================================

BEGIN;


CREATE OR REPLACE FUNCTION public.club_list_my_matches(
  p_club_id uuid,
  p_limit int DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  match_at timestamptz,
  club_name text,
  club_id uuid,
  status text,
  max_players int,
  notes text,
  created_at timestamptz,
  updated_at timestamptz,
  players_count int,
  players_by_team jsonb,
  match_results jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Guardian unificado: claimed_by, club_admins y super admin viven todos
  -- adentro de q6_can_manage_club.
  IF NOT EXISTS (
    SELECT 1 FROM public.clubs c
    WHERE c.id = p_club_id
      AND c.deleted_at IS NULL
      AND public.q6_can_manage_club(c.id, v_uid)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.match_at,
    m.club_name,
    m.club_id,
    m.status::text,
    m.max_players,
    m.notes,
    m.created_at,
    m.updated_at,
    COALESCE(mp.players_count, 0)::int AS players_count,
    jsonb_build_object(
      'A', COALESCE(mp.team_a, '[]'::jsonb),
      'B', COALESCE(mp.team_b, '[]'::jsonb)
    ) AS players_by_team,
    mr.match_results
  FROM public.matches m
  LEFT JOIN (
    SELECT
      mp2.match_id,
      COUNT(*)::int AS players_count,
      jsonb_agg(mp2.player_id) FILTER (WHERE mp2.team = 'A') AS team_a,
      jsonb_agg(mp2.player_id) FILTER (WHERE mp2.team = 'B') AS team_b
    FROM public.match_players mp2
    GROUP BY mp2.match_id
  ) mp ON mp.match_id = m.id
  LEFT JOIN (
    -- Una fila por partido (UNIQUE match_id): objeto, no array.
    SELECT
      r.match_id,
      jsonb_build_object(
        'sets', r.sets,
        'winner_team', r.winner_team
      ) AS match_results
    FROM public.match_results r
  ) mr ON mr.match_id = m.id
  WHERE m.club_id = p_club_id
  ORDER BY m.match_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 100), 1);
END;
$$;


COMMIT;

NOTIFY pgrst, 'reload schema';
