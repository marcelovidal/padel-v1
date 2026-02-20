-- STAGE P (incremental): Club claim manual review hardening + admin workflow support
-- Safe to run after stage_club migration.

-- 1) Claim request requester fields (for admin review UI)
ALTER TABLE public.club_claim_requests
  ADD COLUMN IF NOT EXISTS requester_first_name text,
  ADD COLUMN IF NOT EXISTS requester_last_name text,
  ADD COLUMN IF NOT EXISTS requester_phone text,
  ADD COLUMN IF NOT EXISTS requester_email text;

UPDATE public.club_claim_requests
SET
  requester_first_name = COALESCE(NULLIF(TRIM(requester_first_name), ''), 'N/D'),
  requester_last_name = COALESCE(NULLIF(TRIM(requester_last_name), ''), 'N/D'),
  requester_phone = COALESCE(NULLIF(TRIM(requester_phone), ''), NULLIF(TRIM(contact_phone), ''), 'N/D'),
  requester_email = COALESCE(NULLIF(TRIM(requester_email), ''), 'unknown@pasala.local')
WHERE
  requester_first_name IS NULL
  OR requester_last_name IS NULL
  OR requester_phone IS NULL
  OR requester_email IS NULL;

ALTER TABLE public.club_claim_requests
  ALTER COLUMN requester_first_name SET NOT NULL,
  ALTER COLUMN requester_last_name SET NOT NULL,
  ALTER COLUMN requester_phone SET NOT NULL,
  ALTER COLUMN requester_email SET NOT NULL;

-- 2) Stronger pending uniqueness: only one pending request per club
DROP INDEX IF EXISTS public.uq_club_claim_pending;
CREATE UNIQUE INDEX IF NOT EXISTS uq_club_claim_pending_by_club
  ON public.club_claim_requests(club_id)
  WHERE status = 'pending';

-- 3) RPC: request claim with required requester identity
CREATE OR REPLACE FUNCTION public.club_request_claim(
  p_club_id uuid,
  p_requester_first_name text,
  p_requester_last_name text,
  p_requester_phone text,
  p_requester_email text,
  p_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_claim_status text;
  v_request_id uuid;
  v_existing record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF NULLIF(TRIM(p_requester_first_name), '') IS NULL
    OR NULLIF(TRIM(p_requester_last_name), '') IS NULL
    OR NULLIF(TRIM(p_requester_phone), '') IS NULL
    OR NULLIF(TRIM(p_requester_email), '') IS NULL THEN
    RAISE EXCEPTION 'INVALID_REQUESTER_DATA';
  END IF;

  SELECT c.claim_status
    INTO v_claim_status
  FROM public.clubs c
  WHERE c.id = p_club_id
    AND c.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLUB_NOT_FOUND';
  END IF;

  IF v_claim_status = 'claimed' THEN
    RAISE EXCEPTION 'CLUB_ALREADY_CLAIMED';
  END IF;

  -- If already in review, allow only same requester to update their own pending request.
  IF v_claim_status = 'pending' THEN
    SELECT r.*
      INTO v_existing
    FROM public.club_claim_requests r
    WHERE r.club_id = p_club_id
      AND r.status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'CLUB_CLAIM_IN_REVIEW';
    END IF;

    IF v_existing.requested_by <> v_uid THEN
      RAISE EXCEPTION 'CLUB_CLAIM_IN_REVIEW';
    END IF;

    UPDATE public.club_claim_requests
    SET requester_first_name = TRIM(p_requester_first_name),
        requester_last_name = TRIM(p_requester_last_name),
        requester_phone = TRIM(p_requester_phone),
        requester_email = TRIM(p_requester_email),
        message = COALESCE(NULLIF(TRIM(p_message), ''), message),
        contact_phone = TRIM(p_requester_phone)
    WHERE id = v_existing.id
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
  END IF;

  INSERT INTO public.club_claim_requests (
    club_id,
    requested_by,
    requester_first_name,
    requester_last_name,
    requester_phone,
    requester_email,
    status,
    message,
    contact_phone
  )
  VALUES (
    p_club_id,
    v_uid,
    TRIM(p_requester_first_name),
    TRIM(p_requester_last_name),
    TRIM(p_requester_phone),
    TRIM(p_requester_email),
    'pending',
    NULLIF(TRIM(p_message), ''),
    TRIM(p_requester_phone)
  )
  RETURNING id INTO v_request_id;

  UPDATE public.clubs
  SET claim_status = 'pending',
      updated_at = now()
  WHERE id = p_club_id;

  RETURN v_request_id;
END;
$$;

-- 4) Resolver remains manual/admin. Recreate to keep deterministic behavior.
CREATE OR REPLACE FUNCTION public.club_resolve_claim(
  p_request_id uuid,
  p_decision text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid;
  v_is_admin boolean;
  v_req record;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = v_uid
      AND pr.role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'NOT_ALLOWED';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_DECISION';
  END IF;

  SELECT *
    INTO v_req
  FROM public.club_claim_requests r
  WHERE r.id = p_request_id
    AND r.status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  UPDATE public.club_claim_requests
  SET status = p_decision,
      resolved_at = now(),
      resolved_by = v_uid
  WHERE id = p_request_id;

  IF p_decision = 'approved' THEN
    UPDATE public.clubs
    SET claimed_by = v_req.requested_by,
        claim_status = 'claimed',
        claimed_at = now(),
        updated_at = now()
    WHERE id = v_req.club_id;
  ELSE
    UPDATE public.clubs
    SET claim_status = 'unclaimed',
        claimed_by = NULL,
        claimed_at = NULL,
        updated_at = now()
    WHERE id = v_req.club_id
      AND claim_status = 'pending';
  END IF;

  RETURN p_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.club_request_claim(uuid, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_request_claim(uuid, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.club_resolve_claim(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.club_resolve_claim(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

