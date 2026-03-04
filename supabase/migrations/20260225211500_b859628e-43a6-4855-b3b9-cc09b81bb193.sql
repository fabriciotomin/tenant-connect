
CREATE OR REPLACE FUNCTION public.delete_user_safe(p_auth_id uuid, p_tenant_id uuid, p_admin_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_has_records BOOLEAN;
BEGIN
  -- 1) Validate admin permission
  IF NOT is_admin_global(p_admin_user_id) AND NOT is_admin_empresa(p_admin_user_id, p_tenant_id) THEN
    RAISE EXCEPTION 'Sem permissão para excluir usuários';
  END IF;

  -- 2) Get profile and validate tenant
  SELECT * INTO v_profile FROM public.profiles WHERE auth_id = p_auth_id;
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado para auth_id %', p_auth_id;
  END IF;

  IF NOT is_admin_global(p_admin_user_id) AND v_profile.tenant_id != p_tenant_id THEN
    RAISE EXCEPTION 'Não é permitido excluir usuários de outro tenant';
  END IF;

  IF is_admin_global(p_auth_id) THEN
    RAISE EXCEPTION 'Não é permitido excluir um Admin Global';
  END IF;

  -- 3) Check for linked records
  SELECT EXISTS (
    SELECT 1 FROM public.inbound_documents WHERE created_by = p_auth_id
    UNION ALL
    SELECT 1 FROM public.outbound_documents WHERE created_by = p_auth_id
    UNION ALL
    SELECT 1 FROM public.stock_movements WHERE created_by = p_auth_id
    UNION ALL
    SELECT 1 FROM public.accounts_payable WHERE created_by = p_auth_id
    UNION ALL
    SELECT 1 FROM public.accounts_receivable WHERE created_by = p_auth_id
    UNION ALL
    SELECT 1 FROM public.service_orders WHERE created_by = p_auth_id
    UNION ALL
    SELECT 1 FROM public.audit_logs WHERE user_id = p_auth_id
  ) INTO v_has_records;

  IF v_has_records THEN
    RAISE EXCEPTION 'Usuário possui registros vinculados e não pode ser excluído.';
  END IF;

  -- 4) Delete in order: permissions, roles, profile
  DELETE FROM public.user_permissions WHERE user_id = p_auth_id;
  DELETE FROM public.user_roles WHERE user_id = p_auth_id;
  DELETE FROM public.profiles WHERE auth_id = p_auth_id;

  -- 5) Remove from auth.users (SECURITY DEFINER allows this)
  DELETE FROM auth.users WHERE id = p_auth_id;

  -- 6) Audit log
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_anteriores)
  VALUES (
    v_profile.tenant_id, p_admin_user_id, 'EXCLUIR_USUARIO', 'profiles', v_profile.id::text,
    jsonb_build_object('nome', v_profile.nome, 'email', v_profile.email, 'auth_id', p_auth_id)
  );
END;
$function$;
