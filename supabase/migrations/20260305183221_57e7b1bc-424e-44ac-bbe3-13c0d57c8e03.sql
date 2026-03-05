
-- Force recreate as EXPLICITLY PERMISSIVE
DROP POLICY IF EXISTS "Admin global can view all empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admin global can update empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admin global can insert empresas" ON public.empresas;
DROP POLICY IF EXISTS "Anon can view active empresas" ON public.empresas;
DROP POLICY IF EXISTS "Users can view own empresa" ON public.empresas;
DROP POLICY IF EXISTS "Users can update own empresa" ON public.empresas;
DROP POLICY IF EXISTS "Tenant isolation" ON public.empresas;
DROP POLICY IF EXISTS "Anyone can view active empresas by slug" ON public.empresas;

-- PERMISSIVE SELECT (any ONE grants access)
CREATE POLICY "Anon can view active empresas" ON public.empresas
  AS PERMISSIVE FOR SELECT TO anon
  USING (status = 'ativo' AND deleted_at IS NULL);

CREATE POLICY "Users can view own empresa" ON public.empresas
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (id = get_tenant_id(auth.uid()));

CREATE POLICY "Admin global can view all empresas" ON public.empresas
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_global'::app_role) AND deleted_at IS NULL);

-- PERMISSIVE UPDATE
CREATE POLICY "Admin global can update empresas" ON public.empresas
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin_global'::app_role) AND deleted_at IS NULL)
  WITH CHECK (has_role(auth.uid(), 'admin_global'::app_role) AND deleted_at IS NULL);

CREATE POLICY "Users can update own empresa" ON public.empresas
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (id = get_tenant_id(auth.uid()))
  WITH CHECK (id = get_tenant_id(auth.uid()));
