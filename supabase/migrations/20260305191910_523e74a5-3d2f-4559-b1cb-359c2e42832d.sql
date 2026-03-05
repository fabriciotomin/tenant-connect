
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_tenant_id uuid;
  raw_meta jsonb;
  user_nome text;
BEGIN
  raw_meta := NEW.raw_user_meta_data;
  user_nome := COALESCE(raw_meta->>'nome', raw_meta->>'full_name', split_part(NEW.email, '@', 1));

  -- Require tenant_id from metadata (set by frontend from URL context)
  IF raw_meta->>'tenant_id' IS NULL THEN
    RAISE EXCEPTION 'Cadastro requer vínculo com uma empresa. Acesse pela URL da empresa.';
  END IF;

  new_tenant_id := (raw_meta->>'tenant_id')::uuid;

  -- Verify the empresa exists and is not soft-deleted
  IF NOT EXISTS (
    SELECT 1 FROM public.empresas 
    WHERE id = new_tenant_id AND deleted_at IS NULL AND status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'Empresa não encontrada ou inativa.';
  END IF;

  -- Create profile linked to the tenant
  INSERT INTO public.profiles (auth_id, email, nome, tenant_id)
  VALUES (NEW.id, NEW.email, user_nome, new_tenant_id);

  -- Assign default role (regular user, not admin)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'usuario');

  RETURN NEW;
END;
$function$;
