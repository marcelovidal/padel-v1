-- RPC to create a match as a player, ensuring auth.uid() is used for ownership
-- Using SECURITY DEFINER to bypass RLS issues with standard inserts in SSR.

CREATE OR REPLACE FUNCTION public.player_create_match(
  p_match_at timestamptz,
  p_club_name text,
  p_status public.match_status DEFAULT 'scheduled',
  p_notes text DEFAULT NULL,
  p_max_players integer DEFAULT 4
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid uuid;
    v_match_id uuid;
BEGIN
    -- 1. Get auth.uid() from context
    v_uid := auth.uid();
    
    -- 2. Fail if auth.uid() is null (Not authenticated)
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not authenticated: auth.uid() is null';
    END IF;

    -- 3. Insert into matches with explicit created_by
    INSERT INTO public.matches (
        match_at,
        club_name,
        status,
        notes,
        max_players,
        created_by
    )
    VALUES (
        p_match_at,
        p_club_name,
        p_status,
        p_notes,
        p_max_players,
        v_uid
    )
    RETURNING id INTO v_match_id;

    RETURN v_match_id;
END;
$$;

-- Security hardening: Revoke public execution, grant only to authenticated
REVOKE ALL ON FUNCTION public.player_create_match(timestamptz, text, public.match_status, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_create_match(timestamptz, text, public.match_status, text, integer) TO authenticated;

-- Debug RPC to verify auth context from the app
CREATE OR REPLACE FUNCTION public.debug_auth_context()
RETURNS TABLE (
    user_role text,
    jwt_sub text,
    auth_uid uuid
)
LANGUAGE sql
SECURITY INVOKER
AS $$
    SELECT 
        current_setting('role', true),
        current_setting('request.jwt.claims', true)::json->>'sub',
        auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.debug_auth_context() TO authenticated;
