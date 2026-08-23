-- Categoría de jugador asignada por club.
-- Vocabulario numérico 1..7 (decisión de producto; players.category queda como está).
-- Una fila vigente por (club_id, player_id) + historial escrito exclusivamente
-- por los RPC de este archivo: RLS bloquea la escritura directa, así que el
-- historial es completo y a prueba de caminos alternos.
--
-- Membresía DERIVADA (no materializada): existe relación con el club si el
-- jugador fue creado por él (dueño o admin vía players.created_by), reservó
-- un turno, se inscribió a un torneo/liga del club o jugó un partido ahí.

CREATE TABLE IF NOT EXISTS public.player_club_categories (
  club_id     uuid        NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  player_id   uuid        NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category    integer     NOT NULL CHECK (category BETWEEN 1 AND 7),
  assigned_by uuid        NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_pcc_player
  ON public.player_club_categories(player_id);

CREATE TABLE IF NOT EXISTS public.player_club_category_history (
  id          bigserial   PRIMARY KEY,
  club_id     uuid        NOT NULL,
  player_id   uuid        NOT NULL,
  category    integer     NOT NULL,
  assigned_by uuid        NOT NULL,
  action      text        NOT NULL CHECK (action IN ('assigned','changed','removed')),
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pcch_pair
  ON public.player_club_category_history(club_id, player_id, recorded_at DESC);

ALTER TABLE public.player_club_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_club_category_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY pcc_manage ON public.player_club_categories
  FOR ALL TO authenticated
  USING (public.q6_can_manage_club(club_id))
  WITH CHECK (public.q6_can_manage_club(club_id));

CREATE POLICY pcch_read ON public.player_club_category_history
  FOR SELECT TO authenticated
  USING (public.q6_can_manage_club(club_id));

-- Asignar o cambiar la categoría del club para un jugador con membresía.
CREATE OR REPLACE FUNCTION public.club_assign_player_category(
  p_club_id uuid,
  p_player_id uuid,
  p_category integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  IF p_category IS NULL OR p_category < 1 OR p_category > 7 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CATEGORY');
  END IF;

  IF NOT public.q6_can_manage_club(p_club_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHORIZED');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = p_player_id AND p.status = 'active' AND p.deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'PLAYER_NOT_FOUND');
  END IF;

  -- Membresía derivada: cualquiera de las cuatro fuentes
  IF NOT (
    -- creado por el dueño del club
    EXISTS (
      SELECT 1 FROM players p
      JOIN players op ON op.user_id = p.created_by
      JOIN clubs c ON c.owner_player_id = op.id
      WHERE c.id = p_club_id AND p.id = p_player_id
    )
    -- creado por un admin del club
    OR EXISTS (
      SELECT 1 FROM players p
      JOIN club_admins ca ON ca.user_id = p.created_by
      WHERE ca.club_id = p_club_id AND p.id = p_player_id
    )
    -- reservó un turno
    OR EXISTS (
      SELECT 1 FROM court_bookings cb
      WHERE cb.club_id = p_club_id AND cb.requested_by_player_id = p_player_id
    )
    -- inscripto: solicitudes de torneo (públicas)
    OR EXISTS (
      SELECT 1 FROM tournament_registrations r
      JOIN club_tournaments t ON t.id = r.tournament_id
      WHERE t.club_id = p_club_id
        AND (r.player_id = p_player_id OR r.teammate_player_id = p_player_id)
    )
    -- inscripto: solicitudes de liga (públicas)
    OR EXISTS (
      SELECT 1 FROM league_registrations r
      JOIN club_leagues l ON l.id = r.league_id
      WHERE l.club_id = p_club_id
        AND (r.player_id = p_player_id OR r.teammate_player_id = p_player_id)
    )
    -- inscripto: equipos de torneo dados de alta por el club
    OR EXISTS (
      SELECT 1 FROM tournament_teams tt
      JOIN club_tournaments t ON t.id = tt.tournament_id
      WHERE t.club_id = p_club_id
        AND (tt.player_id_a = p_player_id OR tt.player_id_b = p_player_id)
    )
    -- inscripto: equipos de liga dados de alta por el club
    OR EXISTS (
      SELECT 1 FROM league_teams lt
      JOIN league_divisions d ON d.id = lt.division_id
      JOIN club_leagues l ON l.id = d.league_id
      WHERE l.club_id = p_club_id
        AND (lt.player_id_a = p_player_id OR lt.player_id_b = p_player_id)
    )
    -- jugó un partido ahí
    OR EXISTS (
      SELECT 1 FROM match_players mp
      JOIN matches m ON m.id = mp.match_id
      WHERE m.club_id = p_club_id AND mp.player_id = p_player_id
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_CLUB_MEMBERSHIP');
  END IF;

  -- Archivar estado previo si existía
  INSERT INTO player_club_category_history (club_id, player_id, category, assigned_by, action)
  SELECT club_id, player_id, category, assigned_by, 'changed'
  FROM player_club_categories
  WHERE club_id = p_club_id AND player_id = p_player_id;

  INSERT INTO player_club_categories (club_id, player_id, category, assigned_by)
  VALUES (p_club_id, p_player_id, p_category, v_uid)
  ON CONFLICT (club_id, player_id) DO UPDATE
    SET category = EXCLUDED.category,
        assigned_by = EXCLUDED.assigned_by,
        updated_at = now();

  RETURN jsonb_build_object('success', true, 'player_id', p_player_id, 'category', p_category);
END;
$$;

-- Quitar la categoría del club. Archiva y borra. No re-exige membresía:
-- la fila vigente ya la acreditó al asignar.
CREATE OR REPLACE FUNCTION public.club_remove_player_category(
  p_club_id uuid,
  p_player_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  IF NOT public.q6_can_manage_club(p_club_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHORIZED');
  END IF;

  INSERT INTO player_club_category_history (club_id, player_id, category, assigned_by, action)
  SELECT club_id, player_id, category, assigned_by, 'removed'
  FROM player_club_categories
  WHERE club_id = p_club_id AND player_id = p_player_id;

  DELETE FROM player_club_categories
  WHERE club_id = p_club_id AND player_id = p_player_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.club_assign_player_category(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.club_remove_player_category(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_assign_player_category(uuid, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.club_remove_player_category(uuid, uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
