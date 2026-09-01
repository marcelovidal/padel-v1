-- Drop de la sobrecarga vieja de player_create_guest_player sin p_category.
--
-- 20260820 agrego p_category vía CREATE OR REPLACE, que en Postgres crea
-- una SOBRECARGA nueva en vez de reemplazar: quedaron 2 funciones:
--   (text, text, text, text, player_position, text, text, text, text, text)           -- vieja, sin categoria
--   (text, text, text, text, player_position, text, text, text, text, text, int)      -- nueva, con p_category
--
-- Unico caller (repositories/player.repository.ts:196) siempre pasa
-- p_category, asi que resuelve a la de 11 params. La de 10 no la llama
-- nadie: se dropea. Si el DROP falla con "argument name p_category not
-- declared", la firma no coincide y no toco la otra por error.

DROP FUNCTION IF EXISTS public.player_create_guest_player(
  text, text, text, text, player_position, text, text, text, text, text
);

-- Despues del drop debe quedar una sola funcion (11 args)
DO $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public'
     AND p.proname = 'player_create_guest_player'
     AND p.pronargs = 11;

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'player_create_guest_player debe tener exactamente 1 funcion de 11 args, hay %', v_count;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';