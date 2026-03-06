
CREATE OR REPLACE FUNCTION public.check_permission(_module text, _action text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT
    -- admin_global: full bypass
    has_role(auth.uid(), 'admin_global')
    OR
    -- admin_empresa: full access within tenant, EXCEPT global-only modules
    (
      has_role(auth.uid(), 'admin_empresa')
      AND NOT (
        _module = 'Administração - Empresas'
        OR (_module = 'Administração - Usuários' AND _action IN ('Aprovar', 'Rejeitar'))
      )
    )
    OR
    -- regular users: check user_permissions table
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
