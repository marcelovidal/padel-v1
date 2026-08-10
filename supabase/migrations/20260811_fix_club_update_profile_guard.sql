-- ============================================================================
-- club_update_profile — unificar autorizacion en q6_can_manage_club
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
--
-- Problema
-- --------
-- 20260810_club_admins_unify_guard.sql unifico 16 funciones club_* para que
-- deleguen la autorizacion en q6_can_manage_club. club_update_profile quedo
-- afuera porque su chequeo no era un IF al principio del cuerpo: vivia dentro
-- del WHERE del UPDATE, como una condicion mas de la fila a actualizar:
--
--     WHERE c.id = p_club_id
--       AND c.deleted_at IS NULL
--       AND c.claim_status = 'claimed'
--       AND c.claimed_by = v_uid;     <-- el chequeo, escondido acá
--
--     IF NOT FOUND THEN
--       RAISE EXCEPTION 'NOT_ALLOWED';
--     END IF;
--
-- Al estar en el WHERE no matcheaba el grep de la unificacion, y como el
-- unico sujeto autorizado era claimed_by, un administrador dado de alta por
-- club_admins recibia NOT_ALLOWED al guardar el perfil del club.
--
-- Confirmado en produccion: en Nuevo Palau, claimed_by apunta a un tercer
-- usuario que no es ninguno de los dos administradores actuales, asi que
-- ninguno de los dos podia editar el perfil.
--
-- Cambio
-- ------
-- El chequeo sale del WHERE y pasa a ser un bloque de autorizacion antes del
-- UPDATE, con la misma forma que las 16 funciones ya unificadas
-- (PERFORM 1 FROM clubs ... AND q6_can_manage_club; IF NOT FOUND). El WHERE
-- del UPDATE queda solo con la identidad de la fila.
--
-- Por que se conserva claim_status = 'claimed'
-- --------------------------------------------
-- Estaba en el WHERE original, asi que sacarlo ampliaria el alcance de la
-- funcion a clubes no reclamados — un cambio de comportamiento que excede
-- arreglar la autorizacion. Se mueve al bloque de autorizacion en vez de
-- eliminarse, y las 16 funciones de 20260810 tambien lo conservan junto al
-- guardian, asi que el criterio queda parejo en todo el conjunto.
--
-- Ambas condiciones levantan el mismo NOT_ALLOWED que levantaba antes: es el
-- unico error que lib/actions/club-profile.actions.ts mapea a mensaje de
-- permisos, y distinguirlos obligaria a tocar la app sin necesidad.
--
-- El IF NOT FOUND posterior al UPDATE se deja tal cual. Con el guardian
-- adelante ya no se puede alcanzar, pero sacarlo seria un cambio de mas:
-- todo lo que no es la autorizacion queda verbatim.
--
-- Orden de aplicacion
-- -------------------
-- El nombre arranca con 20260811 a proposito: 20260810_club_admins_unify_
-- guard.sql no toca club_update_profile, pero si alguna vez se reaplica el
-- lote 20260810_* en orden alfabetico, este archivo tiene que quedar despues.
--
-- Dependencia: q6_can_manage_club debe existir con soporte de club_admins
-- (20260808_fix_q6_can_manage_club_is_club_owner.sql + el lote de club_admins).
--
-- CREATE OR REPLACE conserva los GRANT existentes: no hace falta re-otorgar.
-- La firma se reproduce exacta — cambiar un tipo o un DEFAULT crearia una
-- sobrecarga nueva en vez de reemplazar la funcion.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.club_update_profile(p_club_id uuid, p_name text DEFAULT NULL::text, p_address text DEFAULT NULL::text, p_description text DEFAULT NULL::text, p_access_type text DEFAULT NULL::text, p_courts_count integer DEFAULT NULL::integer, p_has_glass boolean DEFAULT false, p_has_synthetic_grass boolean DEFAULT false, p_contact_first_name text DEFAULT NULL::text, p_contact_last_name text DEFAULT NULL::text, p_contact_phone text DEFAULT NULL::text, p_avatar_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid;
  v_access_type text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Autorizacion via guardian centralizado q6_can_manage_club (club_admins,
  -- claimed_by, owner_player_id y super admin). Antes esto vivia dentro del
  -- WHERE del UPDATE como c.claimed_by = v_uid.
  PERFORM 1
  FROM public.clubs c
  WHERE c.id           = p_club_id
    AND c.deleted_at   IS NULL
    AND c.claim_status = 'claimed'
    AND public.q6_can_manage_club(c.id, v_uid);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF p_access_type IS NOT NULL THEN
    v_access_type := NULLIF(TRIM(LOWER(p_access_type)), '');
    IF v_access_type IS NOT NULL AND v_access_type NOT IN ('abierta', 'cerrada') THEN
      RAISE EXCEPTION 'INVALID_ACCESS_TYPE';
    END IF;
  ELSE
    v_access_type := NULL;
  END IF;

  IF p_courts_count IS NOT NULL AND p_courts_count < 0 THEN
    RAISE EXCEPTION 'INVALID_COURTS_COUNT';
  END IF;

  UPDATE public.clubs c
  SET
    name = COALESCE(NULLIF(TRIM(p_name), ''), c.name),
    normalized_name = LOWER(TRIM(COALESCE(NULLIF(TRIM(p_name), ''), c.name))),
    address = NULLIF(TRIM(p_address), ''),
    description = NULLIF(TRIM(p_description), ''),
    access_type = COALESCE(v_access_type, c.access_type),
    courts_count = p_courts_count,
    has_glass = COALESCE(p_has_glass, c.has_glass),
    has_synthetic_grass = COALESCE(p_has_synthetic_grass, c.has_synthetic_grass),
    contact_first_name = NULLIF(TRIM(p_contact_first_name), ''),
    contact_last_name = NULLIF(TRIM(p_contact_last_name), ''),
    contact_phone = NULLIF(TRIM(p_contact_phone), ''),
    avatar_url = COALESCE(NULLIF(TRIM(p_avatar_url), ''), c.avatar_url),
    updated_at = now()
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  RETURN p_club_id;
END;
$function$;

COMMIT;

-- ============================================================================
-- Verificacion post-aplicacion
-- ============================================================================
-- 1) La funcion quedo con el guardian y sin claimed_by suelto:
--
--    select p.prosrc ~* 'q6_can_manage_club' as usa_guardian,
--           p.prosrc ~* 'claimed_by\s*=\s*v_uid' as usa_claimed_by_suelto
--    from pg_proc p
--    join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'club_update_profile';
--
--    Esperado: true, false.
--
-- 2) No se creo una sobrecarga por firma distinta:
--
--    select count(*) from pg_proc p
--    join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'club_update_profile';
--
--    Esperado: 1.
--
-- 3) Prueba funcional: con la sesion de un administrador de club_admins que
--    NO sea claimed_by, guardar el perfil desde /player/mi-club/perfil.
--    Antes: "No tienes permisos para editar este club". Ahora: guarda.
-- ============================================================================
