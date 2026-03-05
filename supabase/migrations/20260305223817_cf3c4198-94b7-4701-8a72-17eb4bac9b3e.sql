-- Fix: admin_empresa should NOT bypass permission checks
-- Only admin_global bypasses; admin_empresa must have explicit permissions
CREATE OR REPLACE FUNCTION public.check_permission(_module text, _action text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    has_role(auth.uid(), 'admin_global')
    OR
    EXISTS (
      SELECT 1
      FROM user_permissions up
      JOIN permissions p ON p.id = up.permission_id
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = get_tenant_id(auth.uid())
        AND up.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND p.module = _module
        AND p.action = _action
    )
$$;