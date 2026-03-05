DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies WHERE tablename = 'empresas' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.empresas', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Anon can view active empresas"
  ON public.empresas AS PERMISSIVE FOR SELECT
  TO anon, authenticated
  USING (status = 'ativo' AND deleted_at IS NULL);

CREATE POLICY "Admin global can view all empresas"
  ON public.empresas AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin_global') AND deleted_at IS NULL);

CREATE POLICY "Users can view own empresa"
  ON public.empresas AS PERMISSIVE FOR SELECT
  TO authenticated
  USING (id = get_tenant_id(auth.uid()));

CREATE POLICY "Admin global can update empresas"
  ON public.empresas AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin_global') AND deleted_at IS NULL)
  WITH CHECK (has_role(auth.uid(), 'admin_global') AND deleted_at IS NULL);

CREATE POLICY "Users can update own empresa"
  ON public.empresas AS PERMISSIVE FOR UPDATE
  TO authenticated
  USING (id = get_tenant_id(auth.uid()))
  WITH CHECK (id = get_tenant_id(auth.uid()));