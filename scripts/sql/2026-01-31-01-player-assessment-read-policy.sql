BEGIN;

-- 1) Permitir que los jugadores vean sus propias autoevaluaciones
DROP POLICY IF EXISTS player_match_assessments_player_select ON public.player_match_assessments;
CREATE POLICY player_match_assessments_player_select
ON public.player_match_assessments
FOR SELECT
TO authenticated
USING (
  player_id = (
    SELECT p.id
    FROM public.players p
    WHERE p.user_id = auth.uid()
    LIMIT 1
  )
);

COMMIT;
