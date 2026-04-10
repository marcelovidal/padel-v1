-- Sidebar: último partido del jugador autenticado
-- RPC: get_player_last_match()
-- Devuelve el match completado más reciente con resultado.
-- Usado por el componente UltimoPartido en el sidebar del jugador.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_player_last_match()
RETURNS TABLE (
  match_id    uuid,
  match_at    timestamptz,
  club_name   text,
  my_team     text,
  winner_team text,
  rival_name  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid := auth.uid();
  v_player_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT id INTO v_player_id
  FROM public.players
  WHERE user_id = v_uid AND deleted_at IS NULL
  LIMIT 1;

  IF v_player_id IS NULL THEN
    RAISE EXCEPTION 'PLAYER_NOT_FOUND';
  END IF;

  RETURN QUERY
  SELECT
    m.id                                          AS match_id,
    m.match_at,
    COALESCE(c.name, m.club_name, '')             AS club_name,
    mp_me.team::text                              AS my_team,
    mr.winner_team::text                          AS winner_team,
    -- Primer rival (equipo contrario): "Nombre A."
    (
      SELECT p_rival.first_name
             || ' '
             || LEFT(p_rival.last_name, 1)
             || '.'
      FROM   public.match_players mp_rival
      JOIN   public.players p_rival ON p_rival.id = mp_rival.player_id
      WHERE  mp_rival.match_id = m.id
        AND  mp_rival.team <> mp_me.team
      LIMIT 1
    )                                             AS rival_name
  FROM   public.matches m
  JOIN   public.match_players mp_me
         ON  mp_me.match_id = m.id
         AND mp_me.player_id = v_player_id
  JOIN   public.match_results mr
         ON  mr.match_id = m.id
         AND mr.winner_team IS NOT NULL
  LEFT JOIN public.clubs c ON c.id = m.club_id
  WHERE  m.status = 'completed'
  ORDER  BY m.match_at DESC
  LIMIT  1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_player_last_match() TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;
