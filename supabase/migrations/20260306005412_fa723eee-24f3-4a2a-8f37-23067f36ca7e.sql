-- Fix: "Admin can read permissions" is RESTRICTIVE and blocks regular users
-- from reading the permissions catalog via the JOIN in usePermissions.
-- "Authenticated can read permissions" (RESTRICTIVE USING true) is sufficient.
-- The PERMISSIVE base policies already gate access to authenticated users only.

DROP POLICY IF EXISTS "Admin can read permissions" ON public.permissions;

-- Also clean up duplicate permissive policies on permissions table
-- We have: "Base authenticated access" (ALL), "Permissive base for authenticated" (SELECT),
-- and "Authenticated can read permissions" (RESTRICTIVE SELECT USING true).
-- Keep "Base authenticated access" (PERMISSIVE ALL) + "Authenticated can read permissions" (RESTRICTIVE SELECT true)
-- Drop redundant one we added last time:
DROP POLICY IF EXISTS "Permissive base for authenticated" ON public.permissions;