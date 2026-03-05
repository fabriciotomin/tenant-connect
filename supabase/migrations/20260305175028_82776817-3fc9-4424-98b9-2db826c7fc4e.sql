-- Allow anon and authenticated users to SELECT active empresas for tenant resolution
-- This is needed so unauthenticated users can resolve the slug on the login page
CREATE POLICY "Anyone can view active empresas by slug"
ON public.empresas
FOR SELECT
TO anon, authenticated
USING (status = 'ativo' AND deleted_at IS NULL);