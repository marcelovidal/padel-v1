-- ============================================================================
-- pasala_phone_key — forma canonica de telefono, comparable
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
-- Primera migracion del bloque. No depende de ninguna otra.
--
-- Por que
-- -------
-- El matching de inscripciones publicas se hace por telefono, no por nombre:
-- la base tiene apodos sin apellido ("Dany", "Epi", "Floren") que nunca van a
-- matchear contra el nombre completo que alguien escribe en un formulario.
--
-- Pero `players.phone` guarda el texto crudo tal como se tipeo. `2984315287` y
-- `+54 9 298 431-5287` son la misma persona y dos strings distintos, asi que
-- comparar por igualdad no sirve. Esta funcion produce la forma canonica que si
-- se puede comparar.
--
-- Espejo exacto de lib/utils/phone.ts
-- -----------------------------------
-- Las dos implementaciones DEBEN dar el mismo resultado para la misma entrada.
-- El TS decide que se le muestra a la persona; el SQL decide contra que fila
-- matchea. Si divergen, el formulario dice "no te encontramos" sobre un perfil
-- que si existe. Si cambia una, cambia la otra.
--
-- Decision sobre el 0, el 9 y el 15
-- ---------------------------------
-- El `0` de discado nacional, el `9` que va despues del +54 y el `15` del
-- discado local son artefactos de discado, no parte del numero. En la base
-- conviven fijos y celulares escritos con y sin ellos, asi que la forma
-- canonica los omite y se queda con el numero nacional significativo de 10
-- digitos: +54 + area + abonado.
--
-- Los largos posibles y de donde salen:
--   10 → area + abonado, ya limpio
--   11 → 9 + area + abonado, o 0 + area + abonado
--   12 → area + 15 + abonado
--   13 → 0 + area + 15 + abonado, o 9 + area + 15 + abonado
--
-- Internacionales
-- ---------------
-- Un numero con prefijo explicito que no sea +54 se normaliza igual — se
-- devuelve E.164 — pero no pasa por la limpieza argentina. No se descarta.
--
-- NULL no matchea con NULL
-- ------------------------
-- Un telefono ilegible devuelve NULL. Dos telefonos ilegibles NO son la misma
-- persona: todo consumidor tiene que descartar los NULL antes de comparar.
-- El indice de abajo es parcial justamente por eso.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.pasala_phone_key(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
DECLARE
  v_trimmed  text;
  v_has_cc   boolean;
  v_digits   text;
  v_national text;
  v_pos      int;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;

  v_trimmed := btrim(p_phone);
  IF v_trimmed = '' THEN
    RETURN NULL;
  END IF;

  -- `00` es el prefijo internacional en discado; equivale a `+`.
  v_has_cc := (left(v_trimmed, 1) = '+') OR (v_trimmed ~ '^00[0-9]');

  v_digits := regexp_replace(v_trimmed, '[^0-9]', '', 'g');
  IF v_trimmed ~ '^00[0-9]' THEN
    v_digits := regexp_replace(v_digits, '^00', '');
  END IF;

  IF v_digits = '' THEN
    RETURN NULL;
  END IF;

  -- Con prefijo internacional explicito el pais no se adivina: se lee.
  IF v_has_cc AND left(v_digits, 2) <> '54' THEN
    IF length(v_digits) BETWEEN 8 AND 15 THEN
      RETURN '+' || v_digits;
    END IF;
    RETURN NULL;
  END IF;

  -- Un `54` al frente solo es codigo de pais si sobran digitos: `5411...` con
  -- 10 digitos es un numero local valido del area 54.
  IF left(v_digits, 2) = '54' AND (v_has_cc OR length(v_digits) > 10) THEN
    v_national := substr(v_digits, 3);
  ELSE
    v_national := v_digits;
  END IF;

  -- El `0` de discado nacional se saca siempre que este, sin mirar el largo:
  -- ningun codigo de area argentino empieza con 0.
  IF left(v_national, 1) = '0' THEN
    v_national := substr(v_national, 2);
  END IF;

  IF length(v_national) > 10 AND left(v_national, 1) = '9' THEN
    v_national := substr(v_national, 2);
  END IF;

  -- El `15` puede aparecer despues de un area de 2, 3 o 4 digitos.
  IF length(v_national) = 12 THEN
    FOREACH v_pos IN ARRAY ARRAY[2, 3, 4] LOOP
      IF substr(v_national, v_pos + 1, 2) = '15' THEN
        v_national := substr(v_national, 1, v_pos) || substr(v_national, v_pos + 3);
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF length(v_national) <> 10 THEN
    RETURN NULL;
  END IF;

  RETURN '+54' || v_national;
END;
$$;

COMMENT ON FUNCTION public.pasala_phone_key(text) IS
  'Forma canonica E.164 de un telefono, para comparar. Espejo exacto de lib/utils/phone.ts. NULL si no es normalizable; NULL nunca matchea con NULL.';

-- ─── Indice funcional ────────────────────────────────────────────────────────
-- NO es unico, a proposito: `decisiones.md` documenta que dos parejas comparten
-- numero en el Excel de Luciano. El telefono identifica bien, pero no es clave.
--
-- Parcial sobre las filas que pueden matchear: un jugador borrado o sin
-- telefono legible no es candidato de nada.
--
-- IMMUTABLE es lo que habilita el indice. Si alguna vez hay que cambiar la
-- funcion, hay que reindexar: CREATE OR REPLACE de una IMMUTABLE no invalida
-- el indice y las filas viejas quedarian con la clave anterior.

CREATE INDEX IF NOT EXISTS idx_players_phone_key
  ON public.players (public.pasala_phone_key(phone))
  WHERE phone IS NOT NULL
    AND btrim(phone) <> ''
    AND deleted_at IS NULL;

COMMIT;

-- ============================================================================
-- Verificacion posterior (no destructiva, correr aparte)
-- ============================================================================
-- 1) Los casos que el TS tambien cubre. Las cuatro primeras deben dar la MISMA
--    clave; la quinta es internacional; las ultimas dos son NULL.
--
-- SELECT v.entrada, public.pasala_phone_key(v.entrada) AS clave
-- FROM (VALUES
--   ('2984306135'), ('+54 9 298 430-6135'), ('0298 15 430-6135'),
--   ('+542984306135'), ('+39 02 1234 5678'), ('123'), ('')
-- ) AS v(entrada);
--
-- 2) Cuantos jugadores quedan agrupados por clave — el insumo del PASO 3.
--
-- SELECT public.pasala_phone_key(phone) AS clave,
--        count(*) AS jugadores,
--        count(user_id) AS con_cuenta,
--        array_agg(display_name ORDER BY display_name) AS nombres
-- FROM public.players
-- WHERE phone IS NOT NULL AND btrim(phone) <> '' AND deleted_at IS NULL
-- GROUP BY 1
-- HAVING public.pasala_phone_key(phone) IS NOT NULL AND count(*) > 1
-- ORDER BY 2 DESC;
--
-- 3) Cuantos telefonos cargados NO son normalizables. Si el numero es alto,
--    revisar los formatos antes de confiar en el matching.
--
-- SELECT count(*) FILTER (WHERE public.pasala_phone_key(phone) IS NULL) AS ilegibles,
--        count(*) AS con_telefono
-- FROM public.players
-- WHERE phone IS NOT NULL AND btrim(phone) <> '' AND deleted_at IS NULL;
-- ============================================================================
