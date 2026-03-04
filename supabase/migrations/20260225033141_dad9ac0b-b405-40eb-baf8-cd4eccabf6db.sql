
-- ============================================================
-- FASE 2: MÓDULOS CORE - ESTOQUE, COMPRAS, FINANCEIRO
-- ============================================================

-- ENUMS
CREATE TYPE public.tipo_grupo AS ENUM ('SINTETICO', 'ANALITICO');
CREATE TYPE public.tipo_item AS ENUM ('REVENDA', 'MATERIA_PRIMA', 'EMBALAGEM', 'PRODUTO_ACABADO', 'USO_CONSUMO', 'SERVICO');
CREATE TYPE public.tipo_movimento AS ENUM ('ENTRADA', 'SAIDA', 'AJUSTE');
CREATE TYPE public.status_pedido_compra AS ENUM ('ABERTO', 'PARCIAL', 'ATENDIDO', 'CANCELADO');
CREATE TYPE public.frete_tipo AS ENUM ('GLOBAL', 'POR_ITEM');
CREATE TYPE public.status_documento AS ENUM ('PENDENTE', 'PROCESSADO', 'CANCELADO');
CREATE TYPE public.status_financeiro AS ENUM ('ABERTO', 'PAGO', 'CANCELADO');

-- ============================================================
-- CADASTROS BASE: naturezas financeiras, centros de custo, bancos, cond. pagamento
-- ============================================================

CREATE TABLE public.financial_natures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  codigo TEXT NOT NULL,
  codigo_pai UUID REFERENCES public.financial_natures(id),
  descricao TEXT NOT NULL,
  tipo tipo_grupo NOT NULL DEFAULT 'ANALITICO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  codigo TEXT NOT NULL,
  codigo_pai UUID REFERENCES public.cost_centers(id),
  descricao TEXT NOT NULL,
  tipo tipo_grupo NOT NULL DEFAULT 'ANALITICO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.payment_conditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  descricao TEXT NOT NULL,
  numero_parcelas INTEGER NOT NULL DEFAULT 1,
  dias_entre_parcelas INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- MÓDULO ESTOQUE
-- ============================================================

CREATE TABLE public.item_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  codigo TEXT NOT NULL,
  codigo_pai UUID REFERENCES public.item_groups(id),
  descricao TEXT NOT NULL,
  tipo tipo_grupo NOT NULL DEFAULT 'ANALITICO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  codigo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  grupo_id UUID REFERENCES public.item_groups(id),
  tipo_item tipo_item NOT NULL DEFAULT 'REVENDA',
  saldo_estoque NUMERIC NOT NULL DEFAULT 0,
  custo_medio NUMERIC NOT NULL DEFAULT 0,
  endereco_padrao TEXT,
  natureza_financeira_id UUID REFERENCES public.financial_natures(id),
  centro_custo_id UUID REFERENCES public.cost_centers(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  item_id UUID NOT NULL REFERENCES public.items(id),
  tipo tipo_movimento NOT NULL,
  quantidade NUMERIC NOT NULL,
  custo_unitario NUMERIC NOT NULL DEFAULT 0,
  documento_origem TEXT,
  saldo_resultante NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- MÓDULO COMERCIAL BASE: Clientes
-- ============================================================

CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  endereco TEXT,
  cidade TEXT,
  estado TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- MÓDULO COMPRAS
-- ============================================================

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT,
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  fornecedor_id UUID NOT NULL REFERENCES public.suppliers(id),
  comprador_id UUID REFERENCES auth.users(id),
  data_entrega DATE,
  valor_frete NUMERIC NOT NULL DEFAULT 0,
  frete_tipo frete_tipo NOT NULL DEFAULT 'GLOBAL',
  condicao_pagamento_id UUID REFERENCES public.payment_conditions(id),
  status status_pedido_compra NOT NULL DEFAULT 'ABERTO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  impostos NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.inbound_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  fornecedor_id UUID NOT NULL REFERENCES public.suppliers(id),
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  numero TEXT,
  serie TEXT,
  chave_acesso TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  status status_documento NOT NULL DEFAULT 'PENDENTE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- MÓDULO FINANCEIRO
-- ============================================================

CREATE TABLE public.accounts_payable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  fornecedor_id UUID NOT NULL REFERENCES public.suppliers(id),
  documento_origem TEXT,
  competencia DATE NOT NULL DEFAULT CURRENT_DATE,
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  data_baixa DATE,
  valor NUMERIC NOT NULL,
  status status_financeiro NOT NULL DEFAULT 'ABERTO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.accounts_receivable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  cliente_id UUID NOT NULL REFERENCES public.customers(id),
  documento_origem TEXT,
  competencia DATE NOT NULL DEFAULT CURRENT_DATE,
  data_lancamento DATE NOT NULL DEFAULT CURRENT_DATE,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  data_baixa DATE,
  valor NUMERIC NOT NULL,
  status status_financeiro NOT NULL DEFAULT 'ABERTO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.bank_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  banco_id UUID NOT NULL REFERENCES public.banks(id),
  tipo tipo_movimento NOT NULL,
  valor NUMERIC NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  referencia TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_item_groups_tenant ON public.item_groups(tenant_id);
CREATE INDEX idx_items_tenant ON public.items(tenant_id);
CREATE INDEX idx_items_grupo ON public.items(grupo_id);
CREATE INDEX idx_stock_movements_tenant ON public.stock_movements(tenant_id);
CREATE INDEX idx_stock_movements_item ON public.stock_movements(item_id);
CREATE INDEX idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX idx_purchase_orders_tenant ON public.purchase_orders(tenant_id);
CREATE INDEX idx_inbound_documents_tenant ON public.inbound_documents(tenant_id);
CREATE INDEX idx_accounts_payable_tenant ON public.accounts_payable(tenant_id);
CREATE INDEX idx_accounts_receivable_tenant ON public.accounts_receivable(tenant_id);
CREATE INDEX idx_bank_movements_tenant ON public.bank_movements(tenant_id);
CREATE INDEX idx_financial_natures_tenant ON public.financial_natures(tenant_id);
CREATE INDEX idx_cost_centers_tenant ON public.cost_centers(tenant_id);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.financial_natures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_movements ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES (using existing helper functions)
-- Pattern: admin_global full, admin_empresa tenant, user tenant read
-- ============================================================

-- Helper macro: for each table with tenant_id
-- financial_natures
CREATE POLICY "admin_global_all_financial_natures" ON public.financial_natures FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_financial_natures" ON public.financial_natures FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_financial_natures" ON public.financial_natures FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- cost_centers
CREATE POLICY "admin_global_all_cost_centers" ON public.cost_centers FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_cost_centers" ON public.cost_centers FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_cost_centers" ON public.cost_centers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- banks
CREATE POLICY "admin_global_all_banks" ON public.banks FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_banks" ON public.banks FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_banks" ON public.banks FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- payment_conditions
CREATE POLICY "admin_global_all_payment_conditions" ON public.payment_conditions FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_payment_conditions" ON public.payment_conditions FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_payment_conditions" ON public.payment_conditions FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- item_groups
CREATE POLICY "admin_global_all_item_groups" ON public.item_groups FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_item_groups" ON public.item_groups FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_item_groups" ON public.item_groups FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- items
CREATE POLICY "admin_global_all_items" ON public.items FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_items" ON public.items FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_items" ON public.items FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- stock_movements
CREATE POLICY "admin_global_all_stock_movements" ON public.stock_movements FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_stock_movements" ON public.stock_movements FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_stock_movements" ON public.stock_movements FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- customers
CREATE POLICY "admin_global_all_customers" ON public.customers FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_customers" ON public.customers FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_customers" ON public.customers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- suppliers
CREATE POLICY "admin_global_all_suppliers" ON public.suppliers FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_suppliers" ON public.suppliers FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_suppliers" ON public.suppliers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- purchase_orders
CREATE POLICY "admin_global_all_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_purchase_orders" ON public.purchase_orders FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- purchase_order_items (via join to purchase_orders)
CREATE POLICY "admin_global_all_po_items" ON public.purchase_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND is_admin_global(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND is_admin_global(auth.uid())));
CREATE POLICY "admin_empresa_all_po_items" ON public.purchase_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND is_admin_empresa(auth.uid(), po.tenant_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND is_admin_empresa(auth.uid(), po.tenant_id)));
CREATE POLICY "user_select_po_items" ON public.purchase_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.purchase_orders po WHERE po.id = purchase_order_id AND po.tenant_id = get_user_tenant_id(auth.uid())));

-- inbound_documents
CREATE POLICY "admin_global_all_inbound_docs" ON public.inbound_documents FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_inbound_docs" ON public.inbound_documents FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_inbound_docs" ON public.inbound_documents FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- accounts_payable
CREATE POLICY "admin_global_all_accounts_payable" ON public.accounts_payable FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_accounts_payable" ON public.accounts_payable FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_accounts_payable" ON public.accounts_payable FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- accounts_receivable
CREATE POLICY "admin_global_all_accounts_receivable" ON public.accounts_receivable FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_accounts_receivable" ON public.accounts_receivable FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_accounts_receivable" ON public.accounts_receivable FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- bank_movements
CREATE POLICY "admin_global_all_bank_movements" ON public.bank_movements FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_bank_movements" ON public.bank_movements FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_bank_movements" ON public.bank_movements FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER update_financial_natures_updated_at BEFORE UPDATE ON public.financial_natures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON public.cost_centers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_banks_updated_at BEFORE UPDATE ON public.banks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_conditions_updated_at BEFORE UPDATE ON public.payment_conditions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_item_groups_updated_at BEFORE UPDATE ON public.item_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inbound_documents_updated_at BEFORE UPDATE ON public.inbound_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_payable_updated_at BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VALIDATION: item_groups - only ANALITICO can have items
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_item_group_tipo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.item_groups WHERE id = NEW.grupo_id AND tipo = 'ANALITICO'
  ) THEN
    RAISE EXCEPTION 'Item só pode ser vinculado a grupo ANALÍTICO';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_item_group_before_insert
BEFORE INSERT OR UPDATE ON public.items
FOR EACH ROW
WHEN (NEW.grupo_id IS NOT NULL)
EXECUTE FUNCTION validate_item_group_tipo();

-- ============================================================
-- BUSINESS LOGIC: process_stock_movement
-- Updates saldo_estoque and custo_medio on items after insert
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_new_saldo NUMERIC;
  v_new_custo NUMERIC;
BEGIN
  -- Lock the item row for update (optimistic concurrency)
  SELECT saldo_estoque, custo_medio INTO v_item
  FROM public.items WHERE id = NEW.item_id FOR UPDATE;

  IF NEW.tipo = 'ENTRADA' THEN
    v_new_saldo := v_item.saldo_estoque + NEW.quantidade;
    -- Weighted average cost
    IF v_new_saldo > 0 THEN
      v_new_custo := ((v_item.saldo_estoque * v_item.custo_medio) + (NEW.quantidade * NEW.custo_unitario)) / v_new_saldo;
    ELSE
      v_new_custo := NEW.custo_unitario;
    END IF;
  ELSIF NEW.tipo = 'SAIDA' THEN
    v_new_saldo := v_item.saldo_estoque - NEW.quantidade;
    IF v_new_saldo < 0 THEN
      RAISE EXCEPTION 'Saldo insuficiente para item %. Saldo atual: %, Saída: %', NEW.item_id, v_item.saldo_estoque, NEW.quantidade;
    END IF;
    v_new_custo := v_item.custo_medio; -- cost doesn't change on exit
  ELSIF NEW.tipo = 'AJUSTE' THEN
    v_new_saldo := NEW.quantidade; -- absolute value
    IF NEW.custo_unitario > 0 THEN
      v_new_custo := NEW.custo_unitario;
    ELSE
      v_new_custo := v_item.custo_medio;
    END IF;
  END IF;

  -- Update item
  UPDATE public.items SET saldo_estoque = v_new_saldo, custo_medio = v_new_custo, updated_at = now() WHERE id = NEW.item_id;

  -- Set saldo_resultante on the movement
  NEW.saldo_resultante := v_new_saldo;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_process_stock_movement
BEFORE INSERT ON public.stock_movements
FOR EACH ROW
EXECUTE FUNCTION process_stock_movement();

-- ============================================================
-- BUSINESS LOGIC: generate_stock_movement (callable)
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_stock_movement(
  p_tenant_id UUID,
  p_item_id UUID,
  p_tipo tipo_movimento,
  p_quantidade NUMERIC,
  p_custo_unitario NUMERIC,
  p_documento_origem TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
  VALUES (p_tenant_id, p_item_id, p_tipo, p_quantidade, p_custo_unitario, p_documento_origem, p_user_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================
-- BUSINESS LOGIC: generate_accounts_payable (callable)
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_accounts_payable(
  p_tenant_id UUID,
  p_fornecedor_id UUID,
  p_valor NUMERIC,
  p_data_vencimento DATE,
  p_documento_origem TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.accounts_payable (tenant_id, fornecedor_id, valor, data_vencimento, documento_origem, created_by)
  VALUES (p_tenant_id, p_fornecedor_id, p_valor, p_data_vencimento, p_documento_origem, p_user_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================================
-- BUSINESS LOGIC: baixar_titulo (pay/receive)
-- ============================================================

CREATE OR REPLACE FUNCTION public.baixar_titulo_pagar(
  p_titulo_id UUID,
  p_banco_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo RECORD;
BEGIN
  SELECT * INTO v_titulo FROM public.accounts_payable WHERE id = p_titulo_id FOR UPDATE;
  
  IF v_titulo.status != 'ABERTO' THEN
    RAISE EXCEPTION 'Título não está aberto para baixa';
  END IF;

  -- Update titulo
  UPDATE public.accounts_payable 
  SET status = 'PAGO', data_baixa = CURRENT_DATE, updated_at = now(), updated_by = p_user_id
  WHERE id = p_titulo_id;

  -- Generate bank movement
  INSERT INTO public.bank_movements (tenant_id, banco_id, tipo, valor, data, referencia, created_by)
  VALUES (v_titulo.tenant_id, p_banco_id, 'SAIDA', v_titulo.valor, CURRENT_DATE, 'CP-' || p_titulo_id::text, p_user_id);

  -- Audit log
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_novos)
  VALUES (v_titulo.tenant_id, p_user_id, 'BAIXA', 'accounts_payable', p_titulo_id::text, jsonb_build_object('valor', v_titulo.valor, 'banco_id', p_banco_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.baixar_titulo_receber(
  p_titulo_id UUID,
  p_banco_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo RECORD;
BEGIN
  SELECT * INTO v_titulo FROM public.accounts_receivable WHERE id = p_titulo_id FOR UPDATE;
  
  IF v_titulo.status != 'ABERTO' THEN
    RAISE EXCEPTION 'Título não está aberto para baixa';
  END IF;

  UPDATE public.accounts_receivable 
  SET status = 'PAGO', data_baixa = CURRENT_DATE, updated_at = now(), updated_by = p_user_id
  WHERE id = p_titulo_id;

  INSERT INTO public.bank_movements (tenant_id, banco_id, tipo, valor, data, referencia, created_by)
  VALUES (v_titulo.tenant_id, p_banco_id, 'ENTRADA', v_titulo.valor, CURRENT_DATE, 'CR-' || p_titulo_id::text, p_user_id);

  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_novos)
  VALUES (v_titulo.tenant_id, p_user_id, 'BAIXA', 'accounts_receivable', p_titulo_id::text, jsonb_build_object('valor', v_titulo.valor, 'banco_id', p_banco_id));
END;
$$;

-- ============================================================
-- BUSINESS LOGIC: process_inbound_document
-- Marks PO as ATENDIDO, generates stock entries + accounts payable
-- ============================================================

CREATE OR REPLACE FUNCTION public.process_inbound_document(
  p_document_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_po_item RECORD;
BEGIN
  SELECT * INTO v_doc FROM public.inbound_documents WHERE id = p_document_id FOR UPDATE;
  
  IF v_doc.status != 'PENDENTE' THEN
    RAISE EXCEPTION 'Documento já processado ou cancelado';
  END IF;

  -- If linked to a PO, process its items and mark as ATENDIDO
  IF v_doc.purchase_order_id IS NOT NULL THEN
    FOR v_po_item IN 
      SELECT poi.*, i.tenant_id 
      FROM public.purchase_order_items poi
      JOIN public.items i ON i.id = poi.item_id
      WHERE poi.purchase_order_id = v_doc.purchase_order_id
    LOOP
      -- Generate stock entry
      PERFORM generate_stock_movement(
        v_doc.tenant_id,
        v_po_item.item_id,
        'ENTRADA'::tipo_movimento,
        v_po_item.quantidade,
        v_po_item.valor_unitario,
        'NF-' || COALESCE(v_doc.numero, v_doc.id::text),
        p_user_id
      );
    END LOOP;

    UPDATE public.purchase_orders SET status = 'ATENDIDO', updated_at = now(), updated_by = p_user_id
    WHERE id = v_doc.purchase_order_id;
  END IF;

  -- Generate accounts payable
  PERFORM generate_accounts_payable(
    v_doc.tenant_id,
    v_doc.fornecedor_id,
    v_doc.valor_total,
    CURRENT_DATE + INTERVAL '30 days',
    'NF-' || COALESCE(v_doc.numero, v_doc.id::text),
    p_user_id
  );

  -- Mark document as processed
  UPDATE public.inbound_documents SET status = 'PROCESSADO', updated_at = now(), updated_by = p_user_id
  WHERE id = p_document_id;

  -- Audit log
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_novos)
  VALUES (v_doc.tenant_id, p_user_id, 'PROCESSAR_ENTRADA', 'inbound_documents', p_document_id::text, 
    jsonb_build_object('valor_total', v_doc.valor_total, 'purchase_order_id', v_doc.purchase_order_id));
END;
$$;
