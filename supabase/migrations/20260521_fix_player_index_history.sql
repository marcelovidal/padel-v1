-- Fix get_player_index_history: outer ORDER BY referenced r.recorded_at which
-- doesn't exist in the subquery (it's aliased as "date"). Use r.date instead.

CREATE OR REPLACE FUNCTION public.get_player_index_history(
  p_player_id uuid,
  p_limit     int DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT jsonb_agg(row_to_json(r) ORDER BY r.date ASC)
      FROM (
        SELECT
          to_char(recorded_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          pasala_index AS value
        FROM public.player_index_history
        WHERE player_id = p_player_id
        ORDER BY recorded_at DESC
        LIMIT p_limit
      ) r
    ),
    '[]'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_player_index_history(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_index_history(uuid, int) TO authenticated;
