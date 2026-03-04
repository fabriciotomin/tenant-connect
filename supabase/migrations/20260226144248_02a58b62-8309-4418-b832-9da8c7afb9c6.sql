
-- CRITICAL FIX: Revert is_admin_global_in_tenant to use active tenant only
-- The previous change used user_tenants EXISTS which matches ALL linked tenants,
-- causing admin_global to see data from all tenants simultaneously.
-- get_user_tenant_id() returns profiles.tenant_id = the ACTIVE tenant only.

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
    AND _tenant_id = public.get_user_tenant_id(_user_id)
  )
$$;

-- CRITICAL FIX: Revert service_orders policy to use get_user_tenant_id
-- The EXISTS on user_tenants allowed seeing service_orders from all linked tenants.
DROP POLICY IF EXISTS tenant_all_service_orders ON public.service_orders;
CREATE POLICY tenant_all_service_orders ON public.service_orders
  FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
