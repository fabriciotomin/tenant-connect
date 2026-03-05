
-- Fix: Change empresas RLS policies to PERMISSIVE so they OR together
-- instead of AND (RESTRICTIVE), allowing admin_global to see all empresas

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view active empresas by slug" ON public.empresas;
DROP POLICY IF EXISTS "Users can view own empresa" ON public.empresas;
DROP POLICY IF EXISTS "Users can update own empresa" ON public.empresas;

-- Recreate as PERMISSIVE (default) so any matching policy grants access

-- 1. Anon users can see active empresas for slug resolution (login page)
CREATE POLICY "Anon can view active empresas"
ON public.empresas FOR SELECT TO anon
USING (status = 'ativo' AND deleted_at IS NULL);

-- 2. Authenticated users can see their own empresa
CREATE POLICY "Users can view own empresa"
ON public.empresas FOR SELECT TO authenticated
USING (id = get_tenant_id(auth.uid()));

-- 3. Admin global can see ALL empresas (including inactive)
CREATE POLICY "Admin global can view all empresas"
ON public.empresas FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin_global'::app_role));

-- 4. Admin global can update any empresa
CREATE POLICY "Admin global can update empresas"
ON public.empresas FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin_global'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin_global'::app_role));

-- 5. Users can update own empresa
CREATE POLICY "Users can update own empresa"
ON public.empresas FOR UPDATE TO authenticated
USING (id = get_tenant_id(auth.uid()))
WITH CHECK (id = get_tenant_id(auth.uid()));
