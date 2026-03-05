
-- Drop all existing restrictive policies on empresas
DROP POLICY IF EXISTS "Admin global can update empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admin global can view all empresas" ON public.empresas;
DROP POLICY IF EXISTS "Anon can view active empresas" ON public.empresas;
DROP POLICY IF EXISTS "Users can update own empresa" ON public.empresas;
DROP POLICY IF EXISTS "Users can view own empresa" ON public.empresas;

-- Recreate as PERMISSIVE (default) so each policy independently grants access
CREATE POLICY "Anon can view active empresas"
  ON public.empresas FOR SELECT
  TO anon, authenticated
  USING (status = 'ativo' AND deleted_at IS NULL);

CREATE POLICY "Admin global can view all empresas"
  ON public.empresas FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin_global') AND deleted_at IS NULL);

CREATE POLICY "Users can view own empresa"
  ON public.empresas FOR SELECT
  TO authenticated
  USING (id = get_tenant_id(auth.uid()));

CREATE POLICY "Admin global can update empresas"
  ON public.empresas FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin_global') AND deleted_at IS NULL)
  WITH CHECK (has_role(auth.uid(), 'admin_global') AND deleted_at IS NULL);

CREATE POLICY "Users can update own empresa"
  ON public.empresas FOR UPDATE
  TO authenticated
  USING (id = get_tenant_id(auth.uid()))
  WITH CHECK (id = get_tenant_id(auth.uid()));
