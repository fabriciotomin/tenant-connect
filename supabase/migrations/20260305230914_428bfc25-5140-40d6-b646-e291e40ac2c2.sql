-- Fix: Admin profile policies should be RESTRICTIVE
-- Only self-access remains PERMISSIVE (service door)
DROP POLICY IF EXISTS "Admin view profiles" ON profiles;
DROP POLICY IF EXISTS "Admin update profiles" ON profiles;

-- Admin access to OTHER profiles: RESTRICTIVE (requires role)
CREATE POLICY "Admin view profiles" ON profiles AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    auth_id = auth.uid()
    OR has_role(auth.uid(), 'admin_global')
    OR (has_role(auth.uid(), 'admin_empresa') AND tenant_id = get_tenant_id(auth.uid()))
  );

CREATE POLICY "Admin update profiles" ON profiles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    auth_id = auth.uid()
    OR has_role(auth.uid(), 'admin_global')
    OR (has_role(auth.uid(), 'admin_empresa') AND tenant_id = get_tenant_id(auth.uid()))
  );