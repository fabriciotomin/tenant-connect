
-- 1. Add status column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'PENDENTE_APROVACAO';

-- 2. Set all existing profiles to ATIVO (don't lock out current users)
UPDATE public.profiles SET status = 'ATIVO' WHERE deleted_at IS NULL;

-- 3. Update handle_new_user trigger: tenant_id is now OPTIONAL, status is PENDENTE_APROVACAO
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_tenant_id uuid;
  raw_meta jsonb;
  user_nome text;
BEGIN
  raw_meta := NEW.raw_user_meta_data;
  user_nome := COALESCE(raw_meta->>'nome', raw_meta->>'full_name', split_part(NEW.email, '@', 1));

  -- tenant_id is now optional - admin will assign later
  new_tenant_id := NULL;
  IF raw_meta->>'tenant_id' IS NOT NULL AND raw_meta->>'tenant_id' != '' THEN
    new_tenant_id := (raw_meta->>'tenant_id')::uuid;
    -- Verify empresa exists if provided
    IF NOT EXISTS (
      SELECT 1 FROM public.empresas 
      WHERE id = new_tenant_id AND deleted_at IS NULL AND status = 'ativo'
    ) THEN
      new_tenant_id := NULL; -- Invalid tenant, leave null for admin assignment
    END IF;
  END IF;

  -- Create profile with PENDENTE_APROVACAO status
  INSERT INTO public.profiles (auth_id, email, nome, tenant_id, status)
  VALUES (NEW.id, NEW.email, user_nome, new_tenant_id, 'PENDENTE_APROVACAO');

  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'usuario');

  RETURN NEW;
END;
$$;

-- 4. Update profiles RLS: allow admin_empresa to see users from same tenant
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- SELECT: own profile OR admin_global (all) OR admin_empresa (same tenant)
CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth_id = auth.uid()
    OR has_role(auth.uid(), 'admin_global')
    OR (
      has_role(auth.uid(), 'admin_empresa')
      AND tenant_id = get_tenant_id(auth.uid())
    )
  );

-- UPDATE: own profile OR admin_global OR admin_empresa (same tenant)
CREATE POLICY "Users can update profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    auth_id = auth.uid()
    OR has_role(auth.uid(), 'admin_global')
    OR (
      has_role(auth.uid(), 'admin_empresa')
      AND tenant_id = get_tenant_id(auth.uid())
    )
  );

-- 5. Allow admin roles to manage user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "View user roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin_global')
    OR has_role(auth.uid(), 'admin_empresa')
  );

CREATE POLICY "Admin manage user roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin_global')
    OR has_role(auth.uid(), 'admin_empresa')
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_global')
    OR has_role(auth.uid(), 'admin_empresa')
  );

-- 6. Allow admin_empresa to read permissions table
DROP POLICY IF EXISTS "Admin global can manage" ON public.permissions;

CREATE POLICY "Admin can read permissions"
  ON public.permissions FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin_global')
    OR has_role(auth.uid(), 'admin_empresa')
  );

CREATE POLICY "Admin global can manage permissions"
  ON public.permissions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin_global'))
  WITH CHECK (has_role(auth.uid(), 'admin_global'));

-- 7. Update user_permissions RLS to allow admin_empresa for their tenant
DROP POLICY IF EXISTS "Tenant isolation" ON public.user_permissions;

CREATE POLICY "Admin manage user permissions"
  ON public.user_permissions FOR ALL
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin_global')
    OR (
      has_role(auth.uid(), 'admin_empresa')
      AND tenant_id = get_tenant_id(auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin_global')
    OR (
      has_role(auth.uid(), 'admin_empresa')
      AND tenant_id = get_tenant_id(auth.uid())
    )
  );

-- Also allow users with specific permission to manage (checked in app layer)
CREATE POLICY "View own permissions"
  ON public.user_permissions FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin_global')
    OR (
      has_role(auth.uid(), 'admin_empresa')
      AND tenant_id = get_tenant_id(auth.uid())
    )
  );
