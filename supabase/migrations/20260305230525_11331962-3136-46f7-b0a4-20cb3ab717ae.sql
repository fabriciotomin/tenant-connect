-- ============================================================
-- Service doors: ensure basic auth flow always works
-- These PERMISSIVE policies guarantee minimum access for login/session
-- ============================================================

-- 1. profiles: any authenticated user can ALWAYS read their own profile
-- Add a PERMISSIVE self-access policy (works alongside RESTRICTIVE admin policies)
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;
DROP POLICY IF EXISTS "Own profile read" ON profiles;
DROP POLICY IF EXISTS "Own profile update" ON profiles;
DROP POLICY IF EXISTS "Admin view profiles" ON profiles;
DROP POLICY IF EXISTS "Admin update profiles" ON profiles;

-- Self-access: always allowed (PERMISSIVE = guaranteed door)
CREATE POLICY "Own profile read" ON profiles FOR SELECT TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Own profile update" ON profiles FOR UPDATE TO authenticated
  USING (auth_id = auth.uid());

-- Admin access: PERMISSIVE too (admins need to see other profiles)
CREATE POLICY "Admin view profiles" ON profiles FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin_global')
    OR (has_role(auth.uid(), 'admin_empresa') AND tenant_id = get_tenant_id(auth.uid()))
  );

CREATE POLICY "Admin update profiles" ON profiles FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin_global')
    OR (has_role(auth.uid(), 'admin_empresa') AND tenant_id = get_tenant_id(auth.uid()))
  );

-- 2. empresas: any authenticated user can read their own tenant
DROP POLICY IF EXISTS "Tenant isolation" ON empresas;
DROP POLICY IF EXISTS "Own tenant read" ON empresas;
DROP POLICY IF EXISTS "Admin all empresas" ON empresas;

-- Any user can read their own company (PERMISSIVE)
CREATE POLICY "Own tenant read" ON empresas FOR SELECT TO authenticated
  USING (id = get_tenant_id(auth.uid()));

-- Admin global can do everything
CREATE POLICY "Admin all empresas" ON empresas AS RESTRICTIVE FOR ALL TO authenticated
  USING (id = get_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin_global'))
  WITH CHECK (id = get_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin_global'));