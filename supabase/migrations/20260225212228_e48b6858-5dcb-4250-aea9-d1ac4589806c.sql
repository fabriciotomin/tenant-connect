-- 1) Tabela de vínculo usuário x tenant
CREATE TABLE IF NOT EXISTS public.user_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON public.user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON public.user_tenants(tenant_id);

ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_global_all_user_tenants ON public.user_tenants;
CREATE POLICY admin_global_all_user_tenants
ON public.user_tenants
FOR ALL
USING (is_admin_global(auth.uid()))
WITH CHECK (is_admin_global(auth.uid()));

DROP POLICY IF EXISTS admin_empresa_all_user_tenants ON public.user_tenants;
CREATE POLICY admin_empresa_all_user_tenants
ON public.user_tenants
FOR ALL
USING (is_admin_empresa(auth.uid(), tenant_id))
WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));

DROP POLICY IF EXISTS user_select_own_user_tenants ON public.user_tenants;
CREATE POLICY user_select_own_user_tenants
ON public.user_tenants
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_insert_own_user_tenants ON public.user_tenants;
CREATE POLICY user_insert_own_user_tenants
ON public.user_tenants
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_update_own_user_tenants ON public.user_tenants;
CREATE POLICY user_update_own_user_tenants
ON public.user_tenants
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_user_tenants_updated_at'
  ) THEN
    CREATE TRIGGER update_user_tenants_updated_at
    BEFORE UPDATE ON public.user_tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

-- 2) Helper para validação de vínculo no login
CREATE OR REPLACE FUNCTION public.has_user_tenant_link(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_tenants
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND ativo = true
  );
$function$;

-- 3) Helper para vincular usuário autenticado ao tenant (cadastro em /t/:slug/auth)
CREATE OR REPLACE FUNCTION public.link_current_user_to_tenant(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_global boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id inválido';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.empresas e
    WHERE e.id = _tenant_id
      AND e.status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'Empresa inválida ou inativa';
  END IF;

  INSERT INTO public.user_tenants (user_id, tenant_id, ativo)
  VALUES (v_user_id, _tenant_id, true)
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET ativo = true, updated_at = now();

  SELECT public.is_admin_global(v_user_id) INTO v_is_global;

  IF NOT v_is_global THEN
    UPDATE public.profiles
    SET tenant_id = _tenant_id,
        updated_at = now()
    WHERE auth_id = v_user_id;

    INSERT INTO public.user_roles (user_id, role, tenant_id)
    SELECT v_user_id, 'usuario'::app_role, _tenant_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = v_user_id
        AND ur.tenant_id = _tenant_id
    );
  END IF;
END;
$function$;

-- 4) Trigger de novo usuário: criar profile + vínculo em user_tenants quando vier tenant_slug
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tenant_slug text;
  v_tenant_id uuid;
BEGIN
  v_tenant_slug := nullif(trim(NEW.raw_user_meta_data->>'tenant_slug'), '');

  IF v_tenant_slug IS NOT NULL THEN
    SELECT e.id
      INTO v_tenant_id
    FROM public.empresas e
    WHERE e.slug = v_tenant_slug
      AND e.status = 'ativo'
    LIMIT 1;
  END IF;

  INSERT INTO public.profiles (auth_id, nome, email, tenant_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    NEW.email,
    v_tenant_id
  );

  IF v_tenant_id IS NOT NULL THEN
    INSERT INTO public.user_tenants (user_id, tenant_id, ativo)
    VALUES (NEW.id, v_tenant_id, true)
    ON CONFLICT (user_id, tenant_id)
    DO UPDATE SET ativo = true, updated_at = now();

    INSERT INTO public.user_roles (user_id, role, tenant_id)
    SELECT NEW.id, 'usuario'::app_role, v_tenant_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = NEW.id
        AND ur.tenant_id = v_tenant_id
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 5) Exclusão segura completa (com validação de user_id inválido e remoção em auth.users)
CREATE OR REPLACE FUNCTION public.delete_user_safe(p_auth_id text, p_tenant_id uuid, p_admin_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_has_records BOOLEAN;
  v_auth_id uuid;
BEGIN
  IF p_auth_id IS NULL OR btrim(p_auth_id) = '' THEN
    RAISE EXCEPTION 'user_id inválido';
  END IF;

  BEGIN
    v_auth_id := p_auth_id::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'user_id inválido';
  END;

  -- 1) Validate admin permission
  IF NOT is_admin_global(p_admin_user_id) AND NOT is_admin_empresa(p_admin_user_id, p_tenant_id) THEN
    RAISE EXCEPTION 'Sem permissão para excluir usuários';
  END IF;

  -- 2) Get profile and validate tenant
  SELECT * INTO v_profile FROM public.profiles WHERE auth_id = v_auth_id;
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado para auth_id %', v_auth_id;
  END IF;

  IF NOT is_admin_global(p_admin_user_id) AND v_profile.tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'Não é permitido excluir usuários de outro tenant';
  END IF;

  IF is_admin_global(v_auth_id) THEN
    RAISE EXCEPTION 'Não é permitido excluir um Admin Global';
  END IF;

  -- 3) Check for linked records
  SELECT EXISTS (
    SELECT 1 FROM public.inbound_documents WHERE created_by = v_auth_id
    UNION ALL
    SELECT 1 FROM public.outbound_documents WHERE created_by = v_auth_id
    UNION ALL
    SELECT 1 FROM public.stock_movements WHERE created_by = v_auth_id
    UNION ALL
    SELECT 1 FROM public.accounts_payable WHERE created_by = v_auth_id
    UNION ALL
    SELECT 1 FROM public.accounts_receivable WHERE created_by = v_auth_id
    UNION ALL
    SELECT 1 FROM public.service_orders WHERE created_by = v_auth_id
    UNION ALL
    SELECT 1 FROM public.audit_logs WHERE user_id = v_auth_id
  ) INTO v_has_records;

  IF v_has_records THEN
    RAISE EXCEPTION 'Usuário possui registros vinculados e não pode ser excluído.';
  END IF;

  -- 4) Delete in order
  DELETE FROM public.user_permissions WHERE user_id = v_auth_id;
  DELETE FROM public.user_roles WHERE user_id = v_auth_id;
  DELETE FROM public.user_tenants WHERE user_id = v_auth_id;
  DELETE FROM public.profiles WHERE auth_id = v_auth_id;

  -- 5) Remove from auth users
  DELETE FROM auth.users WHERE id = v_auth_id;

  -- 6) Audit log
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_anteriores)
  VALUES (
    v_profile.tenant_id,
    p_admin_user_id,
    'EXCLUIR_USUARIO',
    'profiles',
    v_profile.id::text,
    jsonb_build_object('nome', v_profile.nome, 'email', v_profile.email, 'auth_id', v_auth_id)
  );
END;
$function$;