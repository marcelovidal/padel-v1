-- AUTOCOMPLETE MATCH STATUS JOB (NO BUFFER)
-- =========================================

-- Function to transition past scheduled matches to completed
CREATE OR REPLACE FUNCTION public.job_autocomplete_matches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.matches
  SET status = 'completed'
  WHERE status = 'scheduled'
    AND match_at < now();
END;
$$;

-- Security: Only allow postgres (or elevated roles) to execute
REVOKE ALL ON FUNCTION public.job_autocomplete_matches() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.job_autocomplete_matches() TO postgres;

-- Note:
-- Run once manually:
-- SELECT public.job_autocomplete_matches();

-- If pg_cron is available (Supabase standard):
-- Every 10 minutes
-- SELECT cron.schedule('autocomplete-matches', '*/10 * * * *', $$SELECT public.job_autocomplete_matches();$$);
