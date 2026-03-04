
-- =============================================================
-- FASE 5: FIX RLS POLICIES (RESTRICTIVE -> PERMISSIVE) + NEW TABLES
-- =============================================================

-- ======== 1) FIX ALL RLS POLICIES ========
-- All policies were created as RESTRICTIVE which requires ALL to pass.
-- They must be PERMISSIVE so that ANY matching policy grants access.

-- Helper: Drop and recreate all policies as PERMISSIVE for standard tenant tables
-- Pattern: admin_global ALL, admin_empresa ALL, user SELECT

-- ---- accounting_periods ----
DROP POLICY IF EXISTS "admin_global_all_accounting_periods" ON public.accounting_periods;
DROP POLICY IF EXISTS "admin_empresa_all_accounting_periods" ON public.accounting_periods;
DROP POLICY IF EXISTS "user_select_accounting_periods" ON public.accounting_periods;
CREATE POLICY "admin_global_all_accounting_periods" ON public.accounting_periods FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_accounting_periods" ON public.accounting_periods FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_accounting_periods" ON public.accounting_periods FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- accounts_payable ----
DROP POLICY IF EXISTS "admin_global_all_accounts_payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "admin_empresa_all_accounts_payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "user_select_accounts_payable" ON public.accounts_payable;
CREATE POLICY "admin_global_all_accounts_payable" ON public.accounts_payable FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_accounts_payable" ON public.accounts_payable FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_accounts_payable" ON public.accounts_payable FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- accounts_receivable ----
DROP POLICY IF EXISTS "admin_global_all_accounts_receivable" ON public.accounts_receivable;
DROP POLICY IF EXISTS "admin_empresa_all_accounts_receivable" ON public.accounts_receivable;
DROP POLICY IF EXISTS "user_select_accounts_receivable" ON public.accounts_receivable;
CREATE POLICY "admin_global_all_accounts_receivable" ON public.accounts_receivable FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_accounts_receivable" ON public.accounts_receivable FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_accounts_receivable" ON public.accounts_receivable FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- audit_logs ----
DROP POLICY IF EXISTS "Admin global can view all audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admin empresa can view tenant audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert own audit_logs" ON public.audit_logs;
CREATE POLICY "admin_global_select_audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_select_audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_insert_audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ---- bank_movements ----
DROP POLICY IF EXISTS "admin_global_all_bank_movements" ON public.bank_movements;
DROP POLICY IF EXISTS "admin_empresa_all_bank_movements" ON public.bank_movements;
DROP POLICY IF EXISTS "user_select_bank_movements" ON public.bank_movements;
CREATE POLICY "admin_global_all_bank_movements" ON public.bank_movements FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_bank_movements" ON public.bank_movements FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_bank_movements" ON public.bank_movements FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- banks ----
DROP POLICY IF EXISTS "admin_global_all_banks" ON public.banks;
DROP POLICY IF EXISTS "admin_empresa_all_banks" ON public.banks;
DROP POLICY IF EXISTS "user_select_banks" ON public.banks;
CREATE POLICY "admin_global_all_banks" ON public.banks FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_banks" ON public.banks FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_banks" ON public.banks FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- comissoes ----
DROP POLICY IF EXISTS "admin_global_all_comissoes" ON public.comissoes;
DROP POLICY IF EXISTS "admin_empresa_all_comissoes" ON public.comissoes;
DROP POLICY IF EXISTS "user_select_comissoes" ON public.comissoes;
CREATE POLICY "admin_global_all_comissoes" ON public.comissoes FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_comissoes" ON public.comissoes FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_comissoes" ON public.comissoes FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- cost_centers ----
DROP POLICY IF EXISTS "admin_global_all_cost_centers" ON public.cost_centers;
DROP POLICY IF EXISTS "admin_empresa_all_cost_centers" ON public.cost_centers;
DROP POLICY IF EXISTS "user_select_cost_centers" ON public.cost_centers;
CREATE POLICY "admin_global_all_cost_centers" ON public.cost_centers FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_cost_centers" ON public.cost_centers FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_cost_centers" ON public.cost_centers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- customers ----
DROP POLICY IF EXISTS "admin_global_all_customers" ON public.customers;
DROP POLICY IF EXISTS "admin_empresa_all_customers" ON public.customers;
DROP POLICY IF EXISTS "user_select_customers" ON public.customers;
CREATE POLICY "admin_global_all_customers" ON public.customers FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_customers" ON public.customers FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_customers" ON public.customers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- empresas ----
DROP POLICY IF EXISTS "Admin global can do everything on empresas" ON public.empresas;
DROP POLICY IF EXISTS "Admin empresa can view own empresa" ON public.empresas;
DROP POLICY IF EXISTS "Users can view own empresa" ON public.empresas;
CREATE POLICY "admin_global_all_empresas" ON public.empresas FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_select_empresas" ON public.empresas FOR SELECT TO authenticated USING (is_admin_empresa(auth.uid(), id));
CREATE POLICY "user_select_empresas" ON public.empresas FOR SELECT TO authenticated USING (id = get_user_tenant_id(auth.uid()));

-- ---- financial_natures ----
DROP POLICY IF EXISTS "admin_global_all_financial_natures" ON public.financial_natures;
DROP POLICY IF EXISTS "admin_empresa_all_financial_natures" ON public.financial_natures;
DROP POLICY IF EXISTS "user_select_financial_natures" ON public.financial_natures;
CREATE POLICY "admin_global_all_financial_natures" ON public.financial_natures FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_financial_natures" ON public.financial_natures FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_financial_natures" ON public.financial_natures FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- inbound_document_items ----
DROP POLICY IF EXISTS "admin_global_all_inbound_doc_items" ON public.inbound_document_items;
DROP POLICY IF EXISTS "admin_empresa_all_inbound_doc_items" ON public.inbound_document_items;
DROP POLICY IF EXISTS "user_select_inbound_doc_items" ON public.inbound_document_items;
CREATE POLICY "admin_global_all_inbound_doc_items" ON public.inbound_document_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM inbound_documents d WHERE d.id = inbound_document_items.inbound_document_id AND is_admin_global(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM inbound_documents d WHERE d.id = inbound_document_items.inbound_document_id AND is_admin_global(auth.uid())));
CREATE POLICY "admin_empresa_all_inbound_doc_items" ON public.inbound_document_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM inbound_documents d WHERE d.id = inbound_document_items.inbound_document_id AND is_admin_empresa(auth.uid(), d.tenant_id))) WITH CHECK (EXISTS (SELECT 1 FROM inbound_documents d WHERE d.id = inbound_document_items.inbound_document_id AND is_admin_empresa(auth.uid(), d.tenant_id)));
CREATE POLICY "user_select_inbound_doc_items" ON public.inbound_document_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM inbound_documents d WHERE d.id = inbound_document_items.inbound_document_id AND d.tenant_id = get_user_tenant_id(auth.uid())));

-- ---- inbound_documents ----
DROP POLICY IF EXISTS "admin_global_all_inbound_docs" ON public.inbound_documents;
DROP POLICY IF EXISTS "admin_empresa_all_inbound_docs" ON public.inbound_documents;
DROP POLICY IF EXISTS "user_select_inbound_docs" ON public.inbound_documents;
CREATE POLICY "admin_global_all_inbound_docs" ON public.inbound_documents FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_inbound_docs" ON public.inbound_documents FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_inbound_docs" ON public.inbound_documents FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- item_groups ----
DROP POLICY IF EXISTS "admin_global_all_item_groups" ON public.item_groups;
DROP POLICY IF EXISTS "admin_empresa_all_item_groups" ON public.item_groups;
DROP POLICY IF EXISTS "user_select_item_groups" ON public.item_groups;
CREATE POLICY "admin_global_all_item_groups" ON public.item_groups FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_item_groups" ON public.item_groups FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_item_groups" ON public.item_groups FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- items ----
DROP POLICY IF EXISTS "admin_global_all_items" ON public.items;
DROP POLICY IF EXISTS "admin_empresa_all_items" ON public.items;
DROP POLICY IF EXISTS "user_select_items" ON public.items;
CREATE POLICY "admin_global_all_items" ON public.items FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_items" ON public.items FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_items" ON public.items FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- outbound_document_items ----
DROP POLICY IF EXISTS "admin_global_all_outbound_doc_items" ON public.outbound_document_items;
DROP POLICY IF EXISTS "admin_empresa_all_outbound_doc_items" ON public.outbound_document_items;
DROP POLICY IF EXISTS "user_select_outbound_doc_items" ON public.outbound_document_items;
CREATE POLICY "admin_global_all_outbound_doc_items" ON public.outbound_document_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM outbound_documents d WHERE d.id = outbound_document_items.outbound_document_id AND is_admin_global(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM outbound_documents d WHERE d.id = outbound_document_items.outbound_document_id AND is_admin_global(auth.uid())));
CREATE POLICY "admin_empresa_all_outbound_doc_items" ON public.outbound_document_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM outbound_documents d WHERE d.id = outbound_document_items.outbound_document_id AND is_admin_empresa(auth.uid(), d.tenant_id))) WITH CHECK (EXISTS (SELECT 1 FROM outbound_documents d WHERE d.id = outbound_document_items.outbound_document_id AND is_admin_empresa(auth.uid(), d.tenant_id)));
CREATE POLICY "user_select_outbound_doc_items" ON public.outbound_document_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM outbound_documents d WHERE d.id = outbound_document_items.outbound_document_id AND d.tenant_id = get_user_tenant_id(auth.uid())));

-- ---- outbound_documents ----
DROP POLICY IF EXISTS "admin_global_all_outbound_docs" ON public.outbound_documents;
DROP POLICY IF EXISTS "admin_empresa_all_outbound_docs" ON public.outbound_documents;
DROP POLICY IF EXISTS "user_select_outbound_docs" ON public.outbound_documents;
CREATE POLICY "admin_global_all_outbound_docs" ON public.outbound_documents FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_outbound_docs" ON public.outbound_documents FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_outbound_docs" ON public.outbound_documents FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- payment_conditions ----
DROP POLICY IF EXISTS "admin_global_all_payment_conditions" ON public.payment_conditions;
DROP POLICY IF EXISTS "admin_empresa_all_payment_conditions" ON public.payment_conditions;
DROP POLICY IF EXISTS "user_select_payment_conditions" ON public.payment_conditions;
CREATE POLICY "admin_global_all_payment_conditions" ON public.payment_conditions FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_payment_conditions" ON public.payment_conditions FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_payment_conditions" ON public.payment_conditions FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- permissions ----
DROP POLICY IF EXISTS "Admin global can manage permissions" ON public.permissions;
DROP POLICY IF EXISTS "Authenticated can view permissions" ON public.permissions;
CREATE POLICY "admin_global_all_permissions" ON public.permissions FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "authenticated_select_permissions" ON public.permissions FOR SELECT TO authenticated USING (true);

-- ---- profiles ----
DROP POLICY IF EXISTS "Admin global can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin empresa can manage tenant profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service can insert profiles" ON public.profiles;
CREATE POLICY "admin_global_all_profiles" ON public.profiles FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_select_profiles" ON public.profiles FOR SELECT TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_own_profile" ON public.profiles FOR SELECT TO authenticated USING (auth_id = auth.uid());
CREATE POLICY "user_update_own_profile" ON public.profiles FOR UPDATE TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());
CREATE POLICY "user_insert_own_profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth_id = auth.uid());

-- ---- purchase_order_items ----
DROP POLICY IF EXISTS "admin_global_all_po_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "admin_empresa_all_po_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "user_select_po_items" ON public.purchase_order_items;
CREATE POLICY "admin_global_all_po_items" ON public.purchase_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND is_admin_global(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND is_admin_global(auth.uid())));
CREATE POLICY "admin_empresa_all_po_items" ON public.purchase_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND is_admin_empresa(auth.uid(), po.tenant_id))) WITH CHECK (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND is_admin_empresa(auth.uid(), po.tenant_id)));
CREATE POLICY "user_select_po_items" ON public.purchase_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND po.tenant_id = get_user_tenant_id(auth.uid())));

-- ---- purchase_orders ----
DROP POLICY IF EXISTS "admin_global_all_purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "admin_empresa_all_purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "user_select_purchase_orders" ON public.purchase_orders;
CREATE POLICY "admin_global_all_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_purchase_orders" ON public.purchase_orders FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- representantes ----
DROP POLICY IF EXISTS "admin_global_all_representantes" ON public.representantes;
DROP POLICY IF EXISTS "admin_empresa_all_representantes" ON public.representantes;
DROP POLICY IF EXISTS "user_select_representantes" ON public.representantes;
CREATE POLICY "admin_global_all_representantes" ON public.representantes FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_representantes" ON public.representantes FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_representantes" ON public.representantes FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- stock_movements ----
DROP POLICY IF EXISTS "admin_global_all_stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "admin_empresa_all_stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "user_select_stock_movements" ON public.stock_movements;
CREATE POLICY "admin_global_all_stock_movements" ON public.stock_movements FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_stock_movements" ON public.stock_movements FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_stock_movements" ON public.stock_movements FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- suppliers ----
DROP POLICY IF EXISTS "admin_global_all_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "admin_empresa_all_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "user_select_suppliers" ON public.suppliers;
CREATE POLICY "admin_global_all_suppliers" ON public.suppliers FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_suppliers" ON public.suppliers FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_suppliers" ON public.suppliers FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ---- user_permissions ----
DROP POLICY IF EXISTS "Admin global can manage all user_permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admin empresa can manage tenant user_permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;
CREATE POLICY "admin_global_all_user_permissions" ON public.user_permissions FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_user_permissions" ON public.user_permissions FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_own_permissions" ON public.user_permissions FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ---- user_roles ----
DROP POLICY IF EXISTS "Admin global can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin empresa can manage tenant roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "admin_global_all_user_roles" ON public.user_roles FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_user_roles" ON public.user_roles FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_own_roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());


-- ======== 2) NEW TABLES: QUOTATIONS ========

CREATE TABLE IF NOT EXISTS public.quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  customer_id UUID REFERENCES public.customers(id),
  validade DATE,
  status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'APROVADO', 'CANCELADO')),
  valor_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_global_all_quotations" ON public.quotations FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_quotations" ON public.quotations FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_quotations" ON public.quotations FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_global_all_quotation_items" ON public.quotation_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND is_admin_global(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND is_admin_global(auth.uid())));
CREATE POLICY "admin_empresa_all_quotation_items" ON public.quotation_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND is_admin_empresa(auth.uid(), q.tenant_id))) WITH CHECK (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND is_admin_empresa(auth.uid(), q.tenant_id)));
CREATE POLICY "user_select_quotation_items" ON public.quotation_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND q.tenant_id = get_user_tenant_id(auth.uid())));


-- ======== 3) NEW TABLES: SALES ORDERS ========

CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  quotation_id UUID REFERENCES public.quotations(id),
  representante_id UUID REFERENCES public.representantes(id),
  condicao_pagamento_id UUID REFERENCES public.payment_conditions(id),
  status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'CONFIRMADO', 'CANCELADO')),
  valor_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_global_all_sales_orders" ON public.sales_orders FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_sales_orders" ON public.sales_orders FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_sales_orders" ON public.sales_orders FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_global_all_so_items" ON public.sales_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM sales_orders s WHERE s.id = sales_order_items.sales_order_id AND is_admin_global(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM sales_orders s WHERE s.id = sales_order_items.sales_order_id AND is_admin_global(auth.uid())));
CREATE POLICY "admin_empresa_all_so_items" ON public.sales_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM sales_orders s WHERE s.id = sales_order_items.sales_order_id AND is_admin_empresa(auth.uid(), s.tenant_id))) WITH CHECK (EXISTS (SELECT 1 FROM sales_orders s WHERE s.id = sales_order_items.sales_order_id AND is_admin_empresa(auth.uid(), s.tenant_id)));
CREATE POLICY "user_select_so_items" ON public.sales_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM sales_orders s WHERE s.id = sales_order_items.sales_order_id AND s.tenant_id = get_user_tenant_id(auth.uid())));


-- ======== 4) NEW TABLES: SERVICE ORDERS ========

CREATE TABLE IF NOT EXISTS public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  condicao_pagamento_id UUID REFERENCES public.payment_conditions(id),
  data_inicio_prevista DATE,
  data_fim_prevista DATE,
  status TEXT NOT NULL DEFAULT 'RASCUNHO' CHECK (status IN ('RASCUNHO', 'CONFIRMADO', 'CANCELADO')),
  valor_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  updated_by UUID
);

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_global_all_service_orders" ON public.service_orders FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_service_orders" ON public.service_orders FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_service_orders" ON public.service_orders FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TABLE IF NOT EXISTS public.service_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_global_all_soi" ON public.service_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM service_orders s WHERE s.id = service_order_items.service_order_id AND is_admin_global(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM service_orders s WHERE s.id = service_order_items.service_order_id AND is_admin_global(auth.uid())));
CREATE POLICY "admin_empresa_all_soi" ON public.service_order_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM service_orders s WHERE s.id = service_order_items.service_order_id AND is_admin_empresa(auth.uid(), s.tenant_id))) WITH CHECK (EXISTS (SELECT 1 FROM service_orders s WHERE s.id = service_order_items.service_order_id AND is_admin_empresa(auth.uid(), s.tenant_id)));
CREATE POLICY "user_select_soi" ON public.service_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM service_orders s WHERE s.id = service_order_items.service_order_id AND s.tenant_id = get_user_tenant_id(auth.uid())));


-- ======== 5) UPDATED_AT TRIGGERS ========
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_orders_updated_at BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ======== 6) TRANSACTIONAL FUNCTION: CONFIRM SERVICE ORDER ========
CREATE OR REPLACE FUNCTION public.confirmar_ordem_servico(p_os_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_os RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_os FROM public.service_orders WHERE id = p_os_id FOR UPDATE;
  IF v_os IS NULL THEN RAISE EXCEPTION 'OS não encontrada: %', p_os_id; END IF;
  IF v_os.status != 'RASCUNHO' THEN RAISE EXCEPTION 'OS não está em RASCUNHO (status: %)', v_os.status; END IF;

  -- For SERVICO items, no stock movement. For others, generate SAIDA.
  FOR v_item IN
    SELECT soi.item_id, soi.quantidade, soi.valor_unitario, i.tipo_item, i.custo_medio, i.saldo_estoque
    FROM public.service_order_items soi
    JOIN public.items i ON i.id = soi.item_id
    WHERE soi.service_order_id = p_os_id
  LOOP
    IF v_item.tipo_item != 'SERVICO' THEN
      IF v_item.saldo_estoque < v_item.quantidade THEN
        RAISE EXCEPTION 'Saldo insuficiente item %. Saldo: %, Qtd: %', v_item.item_id, v_item.saldo_estoque, v_item.quantidade;
      END IF;
      INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
      VALUES (v_os.tenant_id, v_item.item_id, 'SAIDA', v_item.quantidade, v_item.custo_medio, 'OS-' || p_os_id::text, p_user_id);
    END IF;
  END LOOP;

  -- Generate accounts receivable
  IF v_os.condicao_pagamento_id IS NOT NULL THEN
    PERFORM gerar_titulos_receber(v_os.tenant_id, v_os.customer_id, v_os.valor_total, v_os.condicao_pagamento_id, 'OS-' || p_os_id::text, p_user_id);
  ELSE
    INSERT INTO public.accounts_receivable (tenant_id, cliente_id, valor, data_vencimento, documento_origem, competencia, data_emissao, created_by)
    VALUES (v_os.tenant_id, v_os.customer_id, v_os.valor_total, CURRENT_DATE + INTERVAL '30 days', 'OS-' || p_os_id::text, CURRENT_DATE, CURRENT_DATE, p_user_id);
  END IF;

  UPDATE public.service_orders SET status = 'CONFIRMADO', updated_at = now(), updated_by = p_user_id WHERE id = p_os_id;

  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_novos)
  VALUES (v_os.tenant_id, p_user_id, 'CONFIRMAR_OS', 'service_orders', p_os_id::text,
    jsonb_build_object('valor_total', v_os.valor_total, 'customer_id', v_os.customer_id));
END;
$$;


-- ======== 7) SEED PERMISSIONS ========
INSERT INTO public.permissions (module, action, description) VALUES
  ('comercial', 'orcamento.criar', 'Criar orçamentos'),
  ('comercial', 'orcamento.editar', 'Editar orçamentos'),
  ('comercial', 'pedido.criar', 'Criar pedidos de venda'),
  ('comercial', 'pedido.editar', 'Editar pedidos de venda'),
  ('comercial', 'documento.criar', 'Criar documentos de saída'),
  ('comercial', 'documento.confirmar', 'Confirmar documentos de saída'),
  ('comercial', 'documento.cancelar', 'Cancelar documentos de saída'),
  ('financeiro', 'titulo.visualizar', 'Visualizar títulos'),
  ('financeiro', 'titulo.baixar', 'Baixar títulos'),
  ('financeiro', 'titulo.estornar', 'Estornar baixas'),
  ('estoque', 'item.criar', 'Criar itens'),
  ('estoque', 'item.editar', 'Editar itens'),
  ('estoque', 'grupo.criar', 'Criar grupos de itens'),
  ('estoque', 'grupo.editar', 'Editar grupos de itens'),
  ('estoque', 'movimentacao.criar', 'Criar movimentações de estoque'),
  ('servico', 'os.criar', 'Criar ordens de serviço'),
  ('servico', 'os.confirmar', 'Confirmar ordens de serviço'),
  ('servico', 'os.cancelar', 'Cancelar ordens de serviço'),
  ('controladoria', 'visualizar', 'Visualizar relatórios de controladoria'),
  ('cadastros', 'cliente.criar', 'Criar clientes'),
  ('cadastros', 'cliente.editar', 'Editar clientes'),
  ('cadastros', 'fornecedor.criar', 'Criar fornecedores'),
  ('cadastros', 'fornecedor.editar', 'Editar fornecedores'),
  ('admin', 'empresa.criar', 'Criar empresas'),
  ('admin', 'empresa.editar', 'Editar empresas'),
  ('admin', 'usuario.gerenciar', 'Gerenciar usuários'),
  ('compras', 'pedido.criar', 'Criar pedidos de compra'),
  ('compras', 'pedido.editar', 'Editar pedidos de compra'),
  ('compras', 'entrada.confirmar', 'Confirmar documentos de entrada'),
  ('compras', 'entrada.cancelar', 'Cancelar documentos de entrada')
ON CONFLICT DO NOTHING;
