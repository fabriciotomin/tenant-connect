
-- =============================================
-- FASE 1: FUNDAÇÃO MULTI-TENANT ERP
-- =============================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('admin_global', 'admin_empresa', 'usuario');
CREATE TYPE public.plano_tipo AS ENUM ('basico', 'profissional', 'enterprise');
CREATE TYPE public.status_geral AS ENUM ('ativo', 'inativo', 'suspenso');

-- 2. EMPRESAS (Tenants)
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT UNIQUE,
  plano plano_tipo NOT NULL DEFAULT 'basico',
  status status_geral NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- 3. PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. USER_ROLES (separate table, never on profiles)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.empresas(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role, tenant_id)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 5. PERMISSIONS (module/action definitions)
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  UNIQUE(module, action)
);
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- 6. USER_PERMISSIONS (links users to permissions per tenant)
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id, permission_id)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- 7. AUDIT_LOGS
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  acao TEXT NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id TEXT,
  ip TEXT,
  dados_anteriores JSONB,
  dados_novos JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- HELPER FUNCTIONS (SECURITY DEFINER)
-- =============================================

-- Check if user has a specific role (optionally within a tenant)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role, _tenant_id UUID DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND ((_tenant_id IS NULL AND _role = 'admin_global') OR tenant_id = _tenant_id)
  )
$$;

-- Check if user is admin_global
CREATE OR REPLACE FUNCTION public.is_admin_global(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin_global'
  )
$$;

-- Get user's tenant_id
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE auth_id = _user_id LIMIT 1
$$;

-- Check if user is admin_empresa for a given tenant
CREATE OR REPLACE FUNCTION public.is_admin_empresa(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin_empresa' AND tenant_id = _tenant_id
  )
$$;

-- Check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _module TEXT, _action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON p.id = up.permission_id
    WHERE up.user_id = _user_id
      AND p.module = _module
      AND p.action = _action
  )
$$;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (auth_id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email), NEW.email);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- RLS POLICIES
-- =============================================

-- EMPRESAS
CREATE POLICY "Admin global can do everything on empresas"
  ON public.empresas FOR ALL TO authenticated
  USING (public.is_admin_global(auth.uid()))
  WITH CHECK (public.is_admin_global(auth.uid()));

CREATE POLICY "Admin empresa can view own empresa"
  ON public.empresas FOR SELECT TO authenticated
  USING (public.is_admin_empresa(auth.uid(), id));

CREATE POLICY "Users can view own empresa"
  ON public.empresas FOR SELECT TO authenticated
  USING (id = public.get_user_tenant_id(auth.uid()));

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "Admin global can manage all profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin_global(auth.uid()))
  WITH CHECK (public.is_admin_global(auth.uid()));

CREATE POLICY "Admin empresa can manage tenant profiles"
  ON public.profiles FOR ALL TO authenticated
  USING (public.is_admin_empresa(auth.uid(), tenant_id))
  WITH CHECK (public.is_admin_empresa(auth.uid(), tenant_id));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- Allow trigger to insert profiles
CREATE POLICY "Service can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth_id = auth.uid());

-- USER_ROLES
CREATE POLICY "Admin global can manage all roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin_global(auth.uid()))
  WITH CHECK (public.is_admin_global(auth.uid()));

CREATE POLICY "Admin empresa can manage tenant roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.is_admin_empresa(auth.uid(), tenant_id))
  WITH CHECK (public.is_admin_empresa(auth.uid(), tenant_id));

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- PERMISSIONS (read-only for all authenticated)
CREATE POLICY "Authenticated can view permissions"
  ON public.permissions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admin global can manage permissions"
  ON public.permissions FOR ALL TO authenticated
  USING (public.is_admin_global(auth.uid()))
  WITH CHECK (public.is_admin_global(auth.uid()));

-- USER_PERMISSIONS
CREATE POLICY "Admin global can manage all user_permissions"
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.is_admin_global(auth.uid()))
  WITH CHECK (public.is_admin_global(auth.uid()));

CREATE POLICY "Admin empresa can manage tenant user_permissions"
  ON public.user_permissions FOR ALL TO authenticated
  USING (public.is_admin_empresa(auth.uid(), tenant_id))
  WITH CHECK (public.is_admin_empresa(auth.uid(), tenant_id));

CREATE POLICY "Users can view own permissions"
  ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- AUDIT_LOGS
CREATE POLICY "Admin global can view all audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin_global(auth.uid()));

CREATE POLICY "Admin empresa can view tenant audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_admin_empresa(auth.uid(), tenant_id));

CREATE POLICY "Authenticated can insert audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- =============================================
-- SEED PERMISSIONS
-- =============================================
INSERT INTO public.permissions (module, action, description) VALUES
  ('compras', 'VISUALIZAR', 'Visualizar módulo de compras'),
  ('compras', 'CRIAR', 'Criar pedidos de compra'),
  ('compras', 'EDITAR', 'Editar pedidos de compra'),
  ('compras', 'EXCLUIR', 'Excluir pedidos de compra'),
  ('estoque', 'VISUALIZAR', 'Visualizar módulo de estoque'),
  ('estoque', 'CRIAR', 'Criar movimentações de estoque'),
  ('estoque', 'EDITAR', 'Editar movimentações de estoque'),
  ('estoque', 'EXCLUIR', 'Excluir movimentações de estoque'),
  ('comercial', 'VISUALIZAR', 'Visualizar módulo comercial'),
  ('comercial', 'CRIAR', 'Criar pedidos de venda'),
  ('comercial', 'EDITAR', 'Editar pedidos de venda'),
  ('comercial', 'EXCLUIR', 'Excluir pedidos de venda'),
  ('comercial', 'TRANSMITIR_NFE', 'Transmitir NF-e'),
  ('financeiro', 'VISUALIZAR', 'Visualizar módulo financeiro'),
  ('financeiro', 'CRIAR', 'Criar títulos financeiros'),
  ('financeiro', 'EDITAR', 'Editar títulos financeiros'),
  ('financeiro', 'EXCLUIR', 'Excluir títulos financeiros'),
  ('financeiro', 'BAIXAR_TITULO', 'Baixar títulos financeiros'),
  ('servicos', 'VISUALIZAR', 'Visualizar módulo de serviços'),
  ('servicos', 'CRIAR', 'Criar ordens de serviço'),
  ('servicos', 'EDITAR', 'Editar ordens de serviço'),
  ('servicos', 'EXCLUIR', 'Excluir ordens de serviço'),
  ('controladoria', 'VISUALIZAR', 'Visualizar módulo de controladoria'),
  ('cadastros', 'VISUALIZAR', 'Visualizar cadastros'),
  ('cadastros', 'CRIAR', 'Criar cadastros'),
  ('cadastros', 'EDITAR', 'Editar cadastros'),
  ('cadastros', 'EXCLUIR', 'Excluir cadastros'),
  ('usuarios', 'VISUALIZAR', 'Visualizar usuários'),
  ('usuarios', 'CRIAR', 'Criar usuários'),
  ('usuarios', 'EDITAR', 'Editar usuários'),
  ('usuarios', 'EXCLUIR', 'Excluir usuários');
