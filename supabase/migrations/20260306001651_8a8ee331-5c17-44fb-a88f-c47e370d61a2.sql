-- Fix: permissions table has ONLY restrictive policies, which means
-- the default-deny (no permissive) blocks ALL reads.
-- Add a PERMISSIVE base policy so the RESTRICTIVE ones can work as filters.

CREATE POLICY "Permissive base for authenticated"
ON public.permissions
FOR SELECT
TO authenticated
USING (true);
