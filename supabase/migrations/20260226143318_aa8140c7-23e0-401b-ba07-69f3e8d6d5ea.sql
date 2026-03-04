
-- Fix: tenant_all_service_orders should check user_tenants membership, not get_user_tenant_id
DROP POLICY IF EXISTS tenant_all_service_orders ON public.service_orders;
CREATE POLICY tenant_all_service_orders ON public.service_orders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = service_orders.tenant_id
        AND ut.ativo = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = service_orders.tenant_id
        AND ut.ativo = true
    )
  );

-- Also fix is_admin_global_in_tenant to remove the get_user_tenant_id check
CREATE OR REPLACE FUNCTION public.is_admin_global_in_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _tenant_id IS NOT NULL
    AND public.is_admin_global(_user_id)
    AND EXISTS (
      SELECT 1
      FROM public.user_tenants ut
      WHERE ut.user_id = _user_id
        AND ut.tenant_id = _tenant_id
        AND ut.ativo = true
    )
  )
$$;
