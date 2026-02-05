-- RPC to create a match as a player, ensuring auth.uid() is used for ownership
-- This bypasses standard INSERT logic if the DEFAULT is not firing as expected.

CREATE OR REPLACE FUNCTION public.player_create_match(
    p_match_at timestamptz,
    p_club_name text,
    p_max_players integer default 4,
    p_status text default 'scheduled'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
    v_match_id uuid;
BEGIN
    INSERT INTO public.matches (
        match_at,
        club_name,
        max_players,
        status,
        created_by
    )
    VALUES (
        p_match_at,
        p_club_name,
        p_max_players,
        p_status,
        auth.uid() -- Explicitly use auth.uid() inside the function
    )
    RETURNING id INTO v_match_id;

    RETURN v_match_id;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.player_create_match(timestamptz, text, integer, text) TO authenticated;
