
-- Fix empresas policy: change from RESTRICTIVE to PERMISSIVE
-- RESTRICTIVE without any PERMISSIVE policy = 0 rows returned always
DROP POLICY IF EXISTS "Tenant isolation" ON public.empresas;

-- Recreate as PERMISSIVE (matching all other tables)
CREATE POLICY "Tenant isolation"
  ON public.empresas FOR ALL
  TO authenticated
  USING (
    id = get_tenant_id(auth.uid())
    OR has_role(auth.uid(), 'admin_global')
  )
  WITH CHECK (
    id = get_tenant_id(auth.uid())
    OR has_role(auth.uid(), 'admin_global')
  );
