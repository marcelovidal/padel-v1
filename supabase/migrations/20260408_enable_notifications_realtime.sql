-- Habilitar Realtime en notifications para suscripciones client-side
-- Necesario para que NotificationBell reciba INSERTs en tiempo real

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
