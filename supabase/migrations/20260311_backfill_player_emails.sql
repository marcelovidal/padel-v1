-- Backfill: copy email from auth.users → players where players.email IS NULL
-- Safe: only updates players with a confirmed email in auth, never overwrites existing values.

UPDATE public.players p
SET email = u.email
FROM auth.users u
WHERE p.user_id = u.id
  AND u.email IS NOT NULL
  AND u.email <> ''
  AND p.email IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.players p2
    WHERE p2.email = u.email
      AND p2.id <> p.id
  );
