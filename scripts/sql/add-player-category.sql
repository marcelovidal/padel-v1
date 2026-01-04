-- 1. Agregar columna category con valor por defecto
ALTER TABLE public.players
ADD COLUMN category TEXT NOT NULL DEFAULT '5';

-- 2. Restringir valores permitidos (1 a 7)
ALTER TABLE public.players
ADD CONSTRAINT players_category_check
CHECK (category IN ('1','2','3','4','5','6','7'));
