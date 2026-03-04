
-- 1) Add slug column to empresas
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS slug text;

-- 2) Generate slugs from existing data
UPDATE public.empresas 
SET slug = lower(regexp_replace(
  regexp_replace(COALESCE(nome_fantasia, razao_social), '[^a-zA-Z0-9\s-]', '', 'g'),
  '\s+', '-', 'g'
));

-- 3) Make it NOT NULL and UNIQUE
ALTER TABLE public.empresas ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_empresas_slug ON public.empresas (slug);

-- 4) Allow anon to lookup empresa by slug (for login/register pages)
CREATE POLICY "anon_select_empresas_by_slug"
ON public.empresas
FOR SELECT
TO anon
USING (status = 'ativo');
