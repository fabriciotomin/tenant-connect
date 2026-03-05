-- 1) Revert ALL empresas policies to RESTRICTIVE
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'empresas' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.empresas', pol.policyname);
  END LOOP;
END $$;

-- Recreate as RESTRICTIVE
CREATE POLICY "Tenant isolation"
  ON public.empresas AS RESTRICTIVE FOR ALL
  TO authenticated
  USING (
    id = get_tenant_id(auth.uid())
    OR has_role(auth.uid(), 'admin_global')
  )
  WITH CHECK (
    id = get_tenant_id(auth.uid())
    OR has_role(auth.uid(), 'admin_global')
  );

-- 2) Create SECURITY DEFINER function for tenant resolution (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.resolve_tenant_by_slug(_slug text)
RETURNS TABLE(id uuid, slug text, razao_social text, nome_fantasia text, status text, plano text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT e.id, e.slug, e.razao_social, e.nome_fantasia, e.status::text, e.plano::text
  FROM public.empresas e
  WHERE e.slug = _slug
    AND e.deleted_at IS NULL
    AND e.status = 'ativo'
  LIMIT 1;
$$;