-- Allow all authenticated users to READ the permissions catalog
-- This is needed so the usePermissions hook can join user_permissions -> permissions
DROP POLICY IF EXISTS "Authenticated can read permissions" ON permissions;
CREATE POLICY "Authenticated can read permissions" ON permissions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
