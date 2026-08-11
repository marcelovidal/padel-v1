-- ============================================================================
-- player_link_unclaimed_by_phone — evita el duplicado al registrarse
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
-- APLICAR DESPUES de 20260814_phone_normalization.sql: usa pasala_phone_key.
--
-- El agujero
-- ----------
-- player_complete_onboarding busca al jugador existente con
--   WHERE user_id = auth.uid()
-- y con nada mas. Ni telefono, ni email. Quien se registra teniendo ya un
-- perfil sin reclamar se crea un SEGUNDO perfil, en silencio.
--
-- Y despues no lo puede arreglar: player_claim_profile_v2 tira
-- USER_ALREADY_HAS_PROFILE porque el onboarding ya le creo uno. El perfil
-- viejo, con sus partidos, queda huerfano para siempre. Es un callejon sin
-- salida en las dos direcciones.
--
-- Por que una funcion nueva y no un cambio en player_complete_onboarding
-- ---------------------------------------------------------------------
-- Porque no hace falta tocarla. Si el jugador queda vinculado ANTES de que
-- corra, la busqueda por user_id lo encuentra y toma su rama UPDATE, que ya
-- hace exactamente lo que se necesita: completa los datos sobre la fila que ya
-- existia en vez de insertar una nueva.
--
-- Eso ademas respeta la regla de no redefinir funciones vigentes sin tener su
-- definicion de produccion a la vista. Esta migracion no toca ninguna funcion
-- existente: solo agrega una.
--
-- La regla de vinculacion
-- -----------------------
-- Se vincula UNICAMENTE cuando hay exactamente un jugador con ese telefono
-- normalizado y esta sin reclamar. Cualquier otra cosa sigue el camino de
-- siempre y crea un perfil nuevo.
--
-- Los datos de produccion al escribir esto: 42 jugadores con telefono, 41
-- telefonos normalizados distintos, y un solo grupo repetido — Marcelo Vidal y
-- Pablo Vidal comparten numero y AMBOS tienen cuenta. Son dos personas
-- distintas compartiendo linea, no un perfil huerfano.
--
-- Por eso el telefono identifica bien pero no alcanza para decidir solo. Con
-- 200 jugadores va a haber varios casos asi, y vincular por mayoria o por el
-- mas reciente seria fusionar a dos personas. Ante la duda, perfil nuevo: un
-- duplicado se limpia despues, una fusion equivocada se lleva puesto el
-- historial de alguien.
--
-- Los cuatro desenlaces
-- ---------------------
--   no_phone           el telefono no es normalizable → no se busca nada
--   no_match           nadie tiene ese numero → perfil nuevo (caso normal)
--   ambiguous          mas de un jugador → NO se vincula, perfil nuevo
--   already_claimed    el unico candidato ya tiene cuenta → perfil nuevo
--   linked             exactamente uno y sin reclamar → VINCULADO
--
-- Ninguno de estos es un error. La funcion nunca falla por no encontrar: solo
-- informa que paso, y quien la llama sigue adelante igual.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.player_link_unclaimed_by_phone(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid       uuid;
  v_key       text;
  v_total     int;
  v_unclaimed int;
  v_target    uuid;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Si el usuario ya tiene perfil no hay nada que vincular, y pisarle el
  -- user_id a otra fila le romperia el indice unico uq_players_user_id.
  IF EXISTS (
    SELECT 1 FROM public.players
    WHERE user_id = v_uid AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('outcome', 'already_has_profile');
  END IF;

  v_key := public.pasala_phone_key(p_phone);
  IF v_key IS NULL THEN
    RETURN jsonb_build_object('outcome', 'no_phone');
  END IF;

  SELECT count(*), count(*) FILTER (WHERE p.user_id IS NULL)
    INTO v_total, v_unclaimed
  FROM public.players p
  WHERE p.deleted_at IS NULL
    AND p.phone IS NOT NULL
    AND btrim(p.phone) <> ''
    AND public.pasala_phone_key(p.phone) = v_key;

  IF v_total = 0 THEN
    RETURN jsonb_build_object('outcome', 'no_match');
  END IF;

  -- Dos personas pueden compartir linea. No se adivina cual es.
  IF v_total > 1 THEN
    RETURN jsonb_build_object('outcome', 'ambiguous', 'candidates', v_total);
  END IF;

  IF v_unclaimed = 0 THEN
    RETURN jsonb_build_object('outcome', 'already_claimed');
  END IF;

  SELECT p.id
    INTO v_target
  FROM public.players p
  WHERE p.deleted_at IS NULL
    AND p.phone IS NOT NULL
    AND btrim(p.phone) <> ''
    AND public.pasala_phone_key(p.phone) = v_key
    AND p.user_id IS NULL
  LIMIT 1
  FOR UPDATE;

  -- El guard `user_id IS NULL` en el UPDATE cierra la ventana entre el SELECT
  -- y la escritura: si alguien reclamo el perfil en el medio, no se pisa.
  UPDATE public.players
     SET user_id    = v_uid,
         is_guest   = false,
         updated_at = now()
   WHERE id = v_target
     AND user_id IS NULL
     AND deleted_at IS NULL
  RETURNING id INTO v_target;

  IF v_target IS NULL THEN
    RETURN jsonb_build_object('outcome', 'already_claimed');
  END IF;

  RETURN jsonb_build_object('outcome', 'linked', 'player_id', v_target);
END;
$$;

COMMENT ON FUNCTION public.player_link_unclaimed_by_phone(text) IS
  'Vincula al usuario actual con su perfil sin reclamar cuando hay exactamente uno con ese telefono normalizado. Se llama ANTES de player_complete_onboarding para que tome la rama UPDATE en vez de insertar un duplicado. Nunca falla por no encontrar.';

REVOKE ALL ON FUNCTION public.player_link_unclaimed_by_phone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_link_unclaimed_by_phone(text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- Verificacion posterior (no destructiva, correr aparte)
-- ============================================================================
-- 1) Que perfiles sin reclamar se vincularian hoy, y cuales no. Esta consulta
--    es la contracara exacta de la funcion: 'linked' son los que se vincularian
--    solos, el resto seguiria creando perfil nuevo.
--
-- SELECT public.pasala_phone_key(phone) AS clave,
--        count(*)                                  AS candidatos,
--        count(*) FILTER (WHERE user_id IS NULL)    AS sin_reclamar,
--        CASE
--          WHEN count(*) > 1                            THEN 'ambiguous'
--          WHEN count(*) FILTER (WHERE user_id IS NULL) = 0 THEN 'already_claimed'
--          ELSE 'linked'
--        END AS desenlace,
--        array_agg(display_name ORDER BY display_name) AS nombres
-- FROM public.players
-- WHERE phone IS NOT NULL AND btrim(phone) <> '' AND deleted_at IS NULL
--   AND public.pasala_phone_key(phone) IS NOT NULL
-- GROUP BY 1
-- ORDER BY 2 DESC, 1;
--
-- 2) El caso Vidal tiene que dar 'ambiguous'. Si diera 'linked', la funcion
--    estaria por fusionar a dos personas distintas.
--
-- SELECT public.pasala_phone_key(phone), display_name, user_id IS NOT NULL AS con_cuenta
-- FROM public.players
-- WHERE public.pasala_phone_key(phone) = '+542984315287'
--   AND deleted_at IS NULL;
-- ============================================================================
