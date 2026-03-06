-- The "Admin global can manage permissions" is RESTRICTIVE ALL.
-- For SELECT, regular users fail this restrictive check, blocking the JOIN.
-- Solution: make it PERMISSIVE so it grants extra access to admins
-- without blocking regular users (who pass via "View own" on user_permissions
-- and "Authenticated can read" on permissions).

DROP POLICY IF EXISTS "Admin global can manage permissions" ON public.permissions;

-- Re-create as PERMISSIVE for admin write operations only (INSERT/UPDATE/DELETE)
CREATE POLICY "Admin global can manage permissions"
ON public.permissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin_global'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin_global'::app_role));

-- Also need at least one PERMISSIVE policy for SELECT so regular users can read
-- "Base authenticated access" is currently RESTRICTIVE, not PERMISSIVE!
-- Let's check and fix: we need a PERMISSIVE SELECT for authenticated users.
-- Drop the restrictive base and re-create as permissive:
DROP POLICY IF EXISTS "Base authenticated access" ON public.permissions;

CREATE POLICY "Authenticated can select permissions"
ON public.permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admin global full access permissions"
ON public.permissions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin_global'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin_global'::app_role));

-- Drop the duplicate we just created above
DROP POLICY IF EXISTS "Admin global can manage permissions" ON public.permissions;

-- Clean up old restrictive select
DROP POLICY IF EXISTS "Authenticated can read permissions" ON public.permissions;