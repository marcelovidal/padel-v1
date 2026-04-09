-- Supabase Realtime (postgres_changes) requiere SELECT directo sobre la tabla.
-- El migration original revocó todos los permisos a authenticated, lo que impide
-- que el canal Realtime funcione. RLS ya garantiza que cada user ve solo sus filas.

GRANT SELECT ON public.notifications TO authenticated;
