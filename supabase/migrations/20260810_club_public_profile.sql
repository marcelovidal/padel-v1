-- ============================================================================
-- Perfil publico de club — slug, logo publico, contacto y ubicacion
-- ============================================================================
-- APLICAR MANUALMENTE EN SUPABASE. Este archivo no se ejecuta solo.
--
-- Proposito
-- ---------
-- Que un club pueda compartir el link de su perfil y que eso tenga sentido:
-- una URL legible, un logo que sobreviva al cache de WhatsApp, telefono y
-- un link para llegar.
--
-- Alcance de columnas
-- -------------------
-- Se agregan SOLO dos columnas: slug y maps_url.
--
--   * avatar_url    YA EXISTE desde 20260226_stage_q_club_avatar.sql.
--   * el telefono publico reusa contact_phone, que ya se carga en el
--     onboarding del club y ya se edita en /player/mi-club/perfil. No se
--     agrega una columna phone nueva porque la tabla ya tiene contact_phone
--     y responsible_phone, y una tercera dejaria sin criterio cual gana.
--
-- Orden respecto de las otras migraciones 20260810_*
-- --------------------------------------------------
-- Este archivo no toca ninguna de las 16 funciones club_* que redefine
-- 20260810_club_admins_unify_guard.sql, ni club_update_profile, ni ningun
-- RPC preexistente. Solo agrega objetos nuevos. Se puede aplicar antes o
-- despues de los otros 20260810_*, con una unica dependencia:
-- q6_can_manage_club debe existir (viene de 20260808_fix_q6_can_manage_club_
-- is_club_owner.sql, ya aplicada) porque la policy de escritura del bucket
-- la invoca.
--
-- El slug NO se regenera si cambia el nombre del club
-- ---------------------------------------------------
-- Es fijo una vez creado. Un link compartido por WhatsApp no se puede
-- reeditar, asi que renombrar el club no puede romperlo. Por eso el backfill
-- solo toca filas con slug IS NULL y no hay trigger sobre clubs.name.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Columnas nuevas
-- ---------------------------------------------------------------------------

ALTER TABLE public.clubs
  ADD COLUMN IF NOT EXISTS slug     text NULL,
  ADD COLUMN IF NOT EXISTS maps_url text NULL;

COMMENT ON COLUMN public.clubs.slug IS
  'Identificador estable para la URL publica /clubs/<slug>. Se genera una sola vez desde el nombre y NO se regenera al renombrar el club.';
COMMENT ON COLUMN public.clubs.maps_url IS
  'Link de Google Maps del club. Alimenta el boton "Como llegar" del perfil publico.';

-- ---------------------------------------------------------------------------
-- 2) Slugificacion
-- ---------------------------------------------------------------------------
-- Sin unaccent: la extension no esta instalada en esta base (ninguna migracion
-- la crea) y no se puede asumir. El desacentuado va con translate() sobre un
-- mapa explicito, que es IMMUTABLE y no depende de extensiones.
--
-- Cubre castellano y portugues: vocales con agudo, grave, circunflejo,
-- dieresis y tilde, mas ñ, ç y la y con acento. Las dos cadenas de translate()
-- tienen 53 caracteres cada una — si se agregan pares hay que mantenerlas
-- alineadas o translate() descarta el sobrante silenciosamente.
--
-- No reemplaza a club_normalize_name (20260302), que sirve para deduplicar
-- clubes y solo baja a minusculas y colapsa espacios. Esto es para URLs.

CREATE OR REPLACE FUNCTION public.club_slugify(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    NULLIF(
      TRIM(BOTH '-' FROM
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            LOWER(
              TRANSLATE(
                TRIM(COALESCE(p_name, '')),
                'áàâäãåÁÀÂÄÃÅéèêëÉÈÊËíìîïÍÌÎÏóòôöõÓÒÔÖÕúùûüÚÙÛÜñÑçÇýÿÝ',
                'aaaaaaAAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUnNcCyyY'
              )
            ),
            '[^a-z0-9]+', '-', 'g'   -- todo lo no alfanumerico pasa a guion
          ),
          '-+', '-', 'g'             -- guiones consecutivos colapsan a uno
        )
      ),
      ''
    ),
    'club'                           -- nombre que se slugifica a vacio
  );
$$;

COMMENT ON FUNCTION public.club_slugify(text) IS
  'Convierte un nombre a slug de URL: minusculas, sin tildes, solo [a-z0-9-]. No verifica unicidad — para eso esta club_generate_slug.';

-- ---------------------------------------------------------------------------
-- 3) Generacion con resolucion de colisiones
-- ---------------------------------------------------------------------------
-- Ante colision agrega sufijo numerico incremental: el primer "Zona Padel"
-- se queda con zona-padel, el segundo es zona-padel-2, el tercero
-- zona-padel-3. El sufijo arranca en 2 y no en 1 para que el numero diga
-- cuantos hay, no cuantos hubo antes.
--
-- p_club_id se excluye de la busqueda para que regenerar el slug de un club
-- que ya lo tiene no colisione consigo mismo.
--
-- La base se corta a 60 caracteres antes del sufijo: deja margen para el
-- sufijo sin que el slug se vuelva impracticable de compartir.

CREATE OR REPLACE FUNCTION public.club_generate_slug(
  p_name text,
  p_club_id uuid DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_base text;
  v_slug text;
  v_n    int := 1;
BEGIN
  v_base := TRIM(BOTH '-' FROM LEFT(public.club_slugify(p_name), 60));

  IF v_base IS NULL OR v_base = '' THEN
    v_base := 'club';
  END IF;

  v_slug := v_base;

  WHILE EXISTS (
    SELECT 1
    FROM public.clubs c
    WHERE c.slug = v_slug
      AND (p_club_id IS NULL OR c.id <> p_club_id)
  ) LOOP
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n::text;
  END LOOP;

  RETURN v_slug;
END;
$$;

COMMENT ON FUNCTION public.club_generate_slug(text, uuid) IS
  'Devuelve un slug unico para el club. Ante colision agrega -2, -3, ... Excluye p_club_id de la comparacion.';

-- ---------------------------------------------------------------------------
-- 4) Backfill
-- ---------------------------------------------------------------------------
-- Orden por created_at para que el resultado sea determinista y el club mas
-- antiguo se quede con el slug limpio. Incluye clubes borrados y archivados:
-- si alguno se restaura despues, no puede quedar sin slug.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id, name
    FROM public.clubs
    WHERE slug IS NULL
    ORDER BY created_at NULLS LAST, id
  LOOP
    UPDATE public.clubs
    SET slug = public.club_generate_slug(r.name, r.id)
    WHERE id = r.id;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Indice unico sobre slug
-- ---------------------------------------------------------------------------
-- Unico porque el slug resuelve la ruta: dos clubes con el mismo slug harian
-- ambiguo /clubs/<slug>. Es tambien el indice de lectura — cada visita al
-- perfil publico busca por esta columna.

CREATE UNIQUE INDEX IF NOT EXISTS clubs_slug_unique_idx
  ON public.clubs (slug);

-- ---------------------------------------------------------------------------
-- 6) Bucket publico para logos de club
-- ---------------------------------------------------------------------------
-- Por que un bucket nuevo y no el de avatars:
--
-- avatars es PRIVADO y se sirve con URLs firmadas de 600 segundos. Para una
-- pagina renderizada en servidor eso alcanza — la URL se emite fresca en cada
-- request. Para un perfil que se comparte, no:
--
--   * Open Graph queda imposible. WhatsApp y Facebook cachean el metadata por
--     dias y refetchean la imagen tarde; una URL que vence a los 10 minutos
--     da un thumbnail roto permanente.
--   * Cero cache. La URL cambia en cada render, asi que ni el browser ni un
--     CDN pueden reusar la imagen, y cada visita paga un round-trip a la
--     Storage API.
--
-- El logo de un club es informacion publica por definicion — es lo que el
-- club quiere que se vea cuando comparte su link.

INSERT INTO storage.buckets (id, name, public)
SELECT 'club-logos', 'club-logos', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'club-logos'
);

-- Si el bucket ya existia privado, asegurar que quede publico.
UPDATE storage.buckets SET public = true WHERE id = 'club-logos' AND public IS DISTINCT FROM true;

-- ---------------------------------------------------------------------------
-- 7) Guardian de escritura del bucket
-- ---------------------------------------------------------------------------
-- Convencion de path: {club_id}/{archivo}. La carpeta raiz ES el club id, y
-- de ahi sale el permiso.
--
-- Por que una funcion y no el predicado inline en la policy: hay que castear
-- la carpeta a uuid, y un cast que falla lanza excepcion en vez de devolver
-- false. Postgres no garantiza cortocircuito en un AND, asi que un objeto
-- subido a "cualquiercosa/x.png" podria abortar la evaluacion de la policy en
-- lugar de rechazarla. Aca se valida el formato con regex antes de castear.
--
-- SECURITY DEFINER para poder leer public.clubs desde el contexto de
-- storage.objects. auth.uid() sigue leyendo el JWT del caller, no del owner.

CREATE OR REPLACE FUNCTION public.club_logos_can_write(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
DECLARE
  v_uid     uuid;
  v_folder  text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RETURN false;
  END IF;

  v_folder := (storage.foldername(p_object_name))[1];

  IF v_folder IS NULL
     OR v_folder !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  THEN
    RETURN false;
  END IF;

  RETURN public.q6_can_manage_club(v_folder::uuid, v_uid);
END;
$$;

COMMENT ON FUNCTION public.club_logos_can_write(text) IS
  'True si el usuario actual puede escribir el objeto del bucket club-logos. Espera path {club_id}/{archivo} y delega el permiso en q6_can_manage_club.';

-- ---------------------------------------------------------------------------
-- 8) Policies del bucket club-logos
-- ---------------------------------------------------------------------------
-- Lectura publica, escritura solo de administradores del club.
--
-- Con public = true las lecturas por el endpoint /object/public/ no pasan por
-- RLS. La policy de SELECT esta igual para el acceso via API con rol anon o
-- authenticated, que si la evalua.
--
-- Se dropean por nombre unicamente, para no tocar las policies de avatars ni
-- de ningun otro bucket sobre storage.objects.

DROP POLICY IF EXISTS "club_logos_select_public" ON storage.objects;
CREATE POLICY "club_logos_select_public"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'club-logos');

DROP POLICY IF EXISTS "club_logos_insert_admin" ON storage.objects;
CREATE POLICY "club_logos_insert_admin"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'club-logos'
  AND public.club_logos_can_write(name)
);

DROP POLICY IF EXISTS "club_logos_update_admin" ON storage.objects;
CREATE POLICY "club_logos_update_admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'club-logos'
  AND public.club_logos_can_write(name)
)
WITH CHECK (
  bucket_id = 'club-logos'
  AND public.club_logos_can_write(name)
);

DROP POLICY IF EXISTS "club_logos_delete_admin" ON storage.objects;
CREATE POLICY "club_logos_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'club-logos'
  AND public.club_logos_can_write(name)
);

-- ---------------------------------------------------------------------------
-- 9) RPC de edicion del perfil publico
-- ---------------------------------------------------------------------------
-- Solo maps_url. avatar_url y contact_phone siguen viajando por
-- club_update_profile, que ya los escribe desde /player/mi-club/perfil — no
-- se toca esa funcion para no pisar su definicion vigente en produccion, que
-- difiere de la del repo.
--
-- Semantica de NULL: p_maps_url NULL deja el valor como esta; cadena vacia lo
-- borra. Asi el formulario puede limpiar el campo sin un parametro aparte.
--
-- La validacion de host tambien vive en la server action. Aca se repite como
-- defensa en profundidad: el RPC es invocable directamente con el anon key.

CREATE OR REPLACE FUNCTION public.club_update_public_profile(
  p_club_id  uuid,
  p_maps_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid      uuid;
  v_maps_url text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NOT public.q6_can_manage_club(p_club_id, v_uid) THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  v_maps_url := NULLIF(TRIM(COALESCE(p_maps_url, '')), '');

  -- Los cuatro hosts que Google usa para compartir un lugar. El TLD se acota a
  -- [a-z]{2,} con un solo nivel opcional (.com, .com.ar, .co.uk) en vez de
  -- [a-z.]+, porque este ultimo hace pasar google.com.evil.com/maps.
  IF v_maps_url IS NOT NULL
     AND v_maps_url !~* '^https://((www|maps)\.)?google\.[a-z]{2,}(\.[a-z]{2,})?/maps|^https://maps\.google\.[a-z]{2,}(\.[a-z]{2,})?/|^https://goo\.gl/maps/|^https://maps\.app\.goo\.gl/'
  THEN
    RAISE EXCEPTION 'INVALID_MAPS_URL';
  END IF;

  UPDATE public.clubs c
  SET
    maps_url   = CASE WHEN p_maps_url IS NULL THEN c.maps_url ELSE v_maps_url END,
    updated_at = now()
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  RETURN p_club_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_update_public_profile(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_update_public_profile(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.club_update_public_profile(uuid, text) IS
  'Actualiza maps_url del club. Gated por q6_can_manage_club. NULL deja el valor, cadena vacia lo borra.';

COMMIT;

NOTIFY pgrst, 'reload schema';
