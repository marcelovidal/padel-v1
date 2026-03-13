-- FIX Q6.2: Allow players to read tournament match data for finished tournaments.
-- The original policies only allowed reads when status = 'active', blocking
-- players from seeing their match history after a tournament ends.

BEGIN;

-- tournament_matches: allow read if active OR finished (player history) OR club manager
DROP POLICY IF EXISTS tournament_matches_select_authenticated ON public.tournament_matches;
CREATE POLICY tournament_matches_select_authenticated
  ON public.tournament_matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournament_groups g
      JOIN public.club_tournaments t ON t.id = g.tournament_id
      WHERE g.id = tournament_matches.group_id
        AND (
          t.status IN ('active', 'finished')
          OR public.q6_can_manage_club(t.club_id, auth.uid())
        )
    )
  );

-- tournament_playoff_matches: allow read if active OR finished OR club manager
DROP POLICY IF EXISTS tournament_playoff_matches_select_authenticated ON public.tournament_playoff_matches;
CREATE POLICY tournament_playoff_matches_select_authenticated
  ON public.tournament_playoff_matches FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_tournaments t
      WHERE t.id = tournament_playoff_matches.tournament_id
        AND (
          t.status IN ('active', 'finished')
          OR public.q6_can_manage_club(t.club_id, auth.uid())
        )
    )
  );

-- tournament_groups: same fix (needed for the nested join chain)
DROP POLICY IF EXISTS tournament_groups_select_authenticated ON public.tournament_groups;
CREATE POLICY tournament_groups_select_authenticated
  ON public.tournament_groups FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.club_tournaments t
      WHERE t.id = tournament_groups.tournament_id
        AND (
          t.status IN ('active', 'finished')
          OR public.q6_can_manage_club(t.club_id, auth.uid())
        )
    )
  );

-- club_tournaments: same fix (needed for the last nested join to get tournament name)
-- Preserves original club active/unclaimed check for public visibility.
DROP POLICY IF EXISTS club_tournaments_select_authenticated ON public.club_tournaments;
CREATE POLICY club_tournaments_select_authenticated
  ON public.club_tournaments FOR SELECT TO authenticated
  USING (
    (
      status IN ('active', 'finished')
      AND EXISTS (
        SELECT 1 FROM public.clubs c
        WHERE c.id = club_tournaments.club_id
          AND c.deleted_at IS NULL AND c.archived_at IS NULL AND c.merged_into IS NULL
      )
    )
    OR public.q6_can_manage_club(club_id, auth.uid())
  );

COMMIT;
