-- ============================================================
-- FIX: Recreate ALL RLS policies as RESTRICTIVE
-- The previous migration created them as PERMISSIVE (bug),
-- which means Tenant isolation alone grants full access.
-- With RESTRICTIVE, ALL policies must pass simultaneously.
-- ============================================================

-- Helper: list of all operational tables that need dual-layer RLS
-- We must DROP existing policies and recreate as RESTRICTIVE

-- ==================== accounting_periods ====================
DROP POLICY IF EXISTS "Tenant isolation" ON accounting_periods;
DROP POLICY IF EXISTS "perm_select" ON accounting_periods;
DROP POLICY IF EXISTS "perm_update" ON accounting_periods;

CREATE POLICY "Tenant isolation" ON accounting_periods AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON accounting_periods AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Controladoria - DRE', 'Visualizar'));
CREATE POLICY "perm_update" ON accounting_periods AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Controladoria - DRE', 'Visualizar'));

-- ==================== accounts_payable ====================
DROP POLICY IF EXISTS "Tenant isolation" ON accounts_payable;
DROP POLICY IF EXISTS "perm_select" ON accounts_payable;
DROP POLICY IF EXISTS "perm_insert" ON accounts_payable;
DROP POLICY IF EXISTS "perm_update" ON accounts_payable;

CREATE POLICY "Tenant isolation" ON accounts_payable AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON accounts_payable AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Financeiro - Contas a Pagar', 'Visualizar'));
CREATE POLICY "perm_insert" ON accounts_payable AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Financeiro - Contas a Pagar', 'Criar'));
CREATE POLICY "perm_update" ON accounts_payable AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Financeiro - Contas a Pagar', 'Editar'));

-- ==================== accounts_receivable ====================
DROP POLICY IF EXISTS "Tenant isolation" ON accounts_receivable;
DROP POLICY IF EXISTS "perm_select" ON accounts_receivable;
DROP POLICY IF EXISTS "perm_insert" ON accounts_receivable;
DROP POLICY IF EXISTS "perm_update" ON accounts_receivable;

CREATE POLICY "Tenant isolation" ON accounts_receivable AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON accounts_receivable AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Financeiro - Contas a Receber', 'Visualizar'));
CREATE POLICY "perm_insert" ON accounts_receivable AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Financeiro - Contas a Receber', 'Criar'));
CREATE POLICY "perm_update" ON accounts_receivable AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Financeiro - Contas a Receber', 'Editar'));

-- ==================== audit_logs ====================
DROP POLICY IF EXISTS "Tenant isolation" ON audit_logs;
DROP POLICY IF EXISTS "perm_select" ON audit_logs;

CREATE POLICY "Tenant isolation" ON audit_logs AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON audit_logs AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Administração - Usuários', 'Visualizar'));

-- ==================== bank_movements ====================
DROP POLICY IF EXISTS "Tenant isolation" ON bank_movements;
DROP POLICY IF EXISTS "perm_select" ON bank_movements;
DROP POLICY IF EXISTS "perm_insert" ON bank_movements;
DROP POLICY IF EXISTS "perm_update" ON bank_movements;

CREATE POLICY "Tenant isolation" ON bank_movements AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON bank_movements AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Financeiro - Extrato Bancário', 'Visualizar'));
CREATE POLICY "perm_insert" ON bank_movements AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Financeiro - Extrato Bancário', 'Criar'));
CREATE POLICY "perm_update" ON bank_movements AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Financeiro - Extrato Bancário', 'Editar'));

-- ==================== banks ====================
DROP POLICY IF EXISTS "Tenant isolation" ON banks;
DROP POLICY IF EXISTS "perm_select" ON banks;
DROP POLICY IF EXISTS "perm_insert" ON banks;
DROP POLICY IF EXISTS "perm_update" ON banks;

CREATE POLICY "Tenant isolation" ON banks AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON banks AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Bancos', 'Visualizar'));
CREATE POLICY "perm_insert" ON banks AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Bancos', 'Criar'));
CREATE POLICY "perm_update" ON banks AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Bancos', 'Editar'));

-- ==================== comissoes ====================
DROP POLICY IF EXISTS "Tenant isolation" ON comissoes;
DROP POLICY IF EXISTS "perm_select" ON comissoes;
DROP POLICY IF EXISTS "perm_insert" ON comissoes;
DROP POLICY IF EXISTS "perm_update" ON comissoes;

CREATE POLICY "Tenant isolation" ON comissoes AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON comissoes AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Visualizar'));
CREATE POLICY "perm_insert" ON comissoes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Pedidos de Venda', 'Criar'));
CREATE POLICY "perm_update" ON comissoes AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Editar'));

-- ==================== cost_centers ====================
DROP POLICY IF EXISTS "Tenant isolation" ON cost_centers;
DROP POLICY IF EXISTS "perm_select" ON cost_centers;
DROP POLICY IF EXISTS "perm_insert" ON cost_centers;
DROP POLICY IF EXISTS "perm_update" ON cost_centers;

CREATE POLICY "Tenant isolation" ON cost_centers AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON cost_centers AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Centros de Custo', 'Visualizar'));
CREATE POLICY "perm_insert" ON cost_centers AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Centros de Custo', 'Criar'));
CREATE POLICY "perm_update" ON cost_centers AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Centros de Custo', 'Editar'));

-- ==================== customers ====================
DROP POLICY IF EXISTS "Tenant isolation" ON customers;
DROP POLICY IF EXISTS "perm_select" ON customers;
DROP POLICY IF EXISTS "perm_insert" ON customers;
DROP POLICY IF EXISTS "perm_update" ON customers;

CREATE POLICY "Tenant isolation" ON customers AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON customers AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Clientes', 'Visualizar'));
CREATE POLICY "perm_insert" ON customers AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Clientes', 'Criar'));
CREATE POLICY "perm_update" ON customers AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Clientes', 'Editar'));

-- ==================== document_series ====================
DROP POLICY IF EXISTS "Tenant isolation" ON document_series;
DROP POLICY IF EXISTS "perm_select" ON document_series;
DROP POLICY IF EXISTS "perm_insert" ON document_series;
DROP POLICY IF EXISTS "perm_update" ON document_series;

CREATE POLICY "Tenant isolation" ON document_series AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON document_series AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Séries de Documento', 'Visualizar'));
CREATE POLICY "perm_insert" ON document_series AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Séries de Documento', 'Criar'));
CREATE POLICY "perm_update" ON document_series AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Séries de Documento', 'Editar'));

-- ==================== financial_natures ====================
DROP POLICY IF EXISTS "Tenant isolation" ON financial_natures;
DROP POLICY IF EXISTS "perm_select" ON financial_natures;
DROP POLICY IF EXISTS "perm_insert" ON financial_natures;
DROP POLICY IF EXISTS "perm_update" ON financial_natures;

CREATE POLICY "Tenant isolation" ON financial_natures AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON financial_natures AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Nat. Financeiras', 'Visualizar'));
CREATE POLICY "perm_insert" ON financial_natures AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Nat. Financeiras', 'Criar'));
CREATE POLICY "perm_update" ON financial_natures AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Nat. Financeiras', 'Editar'));

-- ==================== formas_pagamento ====================
DROP POLICY IF EXISTS "Tenant isolation" ON formas_pagamento;
DROP POLICY IF EXISTS "perm_select" ON formas_pagamento;
DROP POLICY IF EXISTS "perm_insert" ON formas_pagamento;
DROP POLICY IF EXISTS "perm_update" ON formas_pagamento;

CREATE POLICY "Tenant isolation" ON formas_pagamento AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON formas_pagamento AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Formas de Pagamento', 'Visualizar'));
CREATE POLICY "perm_insert" ON formas_pagamento AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Formas de Pagamento', 'Criar'));
CREATE POLICY "perm_update" ON formas_pagamento AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Formas de Pagamento', 'Editar'));

-- ==================== inbound_document_items ====================
DROP POLICY IF EXISTS "Tenant isolation" ON inbound_document_items;
DROP POLICY IF EXISTS "perm_select" ON inbound_document_items;
DROP POLICY IF EXISTS "perm_insert" ON inbound_document_items;
DROP POLICY IF EXISTS "perm_update" ON inbound_document_items;

CREATE POLICY "Tenant isolation" ON inbound_document_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON inbound_document_items AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Compras - Entradas (NF-e)', 'Visualizar'));
CREATE POLICY "perm_insert" ON inbound_document_items AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Compras - Entradas (NF-e)', 'Criar'));
CREATE POLICY "perm_update" ON inbound_document_items AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Compras - Entradas (NF-e)', 'Editar'));

-- ==================== inbound_documents ====================
DROP POLICY IF EXISTS "Tenant isolation" ON inbound_documents;
DROP POLICY IF EXISTS "perm_select" ON inbound_documents;
DROP POLICY IF EXISTS "perm_insert" ON inbound_documents;
DROP POLICY IF EXISTS "perm_update" ON inbound_documents;

CREATE POLICY "Tenant isolation" ON inbound_documents AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON inbound_documents AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Compras - Entradas (NF-e)', 'Visualizar'));
CREATE POLICY "perm_insert" ON inbound_documents AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Compras - Entradas (NF-e)', 'Criar'));
CREATE POLICY "perm_update" ON inbound_documents AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Compras - Entradas (NF-e)', 'Editar'));

-- ==================== item_categories ====================
DROP POLICY IF EXISTS "Tenant isolation" ON item_categories;
DROP POLICY IF EXISTS "perm_select" ON item_categories;
DROP POLICY IF EXISTS "perm_insert" ON item_categories;
DROP POLICY IF EXISTS "perm_update" ON item_categories;

CREATE POLICY "Tenant isolation" ON item_categories AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON item_categories AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Estoque - Itens', 'Visualizar'));
CREATE POLICY "perm_insert" ON item_categories AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Estoque - Itens', 'Criar'));
CREATE POLICY "perm_update" ON item_categories AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Estoque - Itens', 'Editar'));

-- ==================== item_groups ====================
DROP POLICY IF EXISTS "Tenant isolation" ON item_groups;
DROP POLICY IF EXISTS "perm_select" ON item_groups;
DROP POLICY IF EXISTS "perm_insert" ON item_groups;
DROP POLICY IF EXISTS "perm_update" ON item_groups;

CREATE POLICY "Tenant isolation" ON item_groups AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON item_groups AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Estoque - Grupos', 'Visualizar'));
CREATE POLICY "perm_insert" ON item_groups AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Estoque - Grupos', 'Criar'));
CREATE POLICY "perm_update" ON item_groups AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Estoque - Grupos', 'Editar'));

-- ==================== items ====================
DROP POLICY IF EXISTS "Tenant isolation" ON items;
DROP POLICY IF EXISTS "perm_select" ON items;
DROP POLICY IF EXISTS "perm_insert" ON items;
DROP POLICY IF EXISTS "perm_update" ON items;

CREATE POLICY "Tenant isolation" ON items AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON items AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Estoque - Itens', 'Visualizar'));
CREATE POLICY "perm_insert" ON items AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Estoque - Itens', 'Criar'));
CREATE POLICY "perm_update" ON items AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Estoque - Itens', 'Editar'));

-- ==================== outbound_document_items ====================
DROP POLICY IF EXISTS "Tenant isolation" ON outbound_document_items;
DROP POLICY IF EXISTS "perm_select" ON outbound_document_items;
DROP POLICY IF EXISTS "perm_insert" ON outbound_document_items;
DROP POLICY IF EXISTS "perm_update" ON outbound_document_items;

CREATE POLICY "Tenant isolation" ON outbound_document_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON outbound_document_items AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Comercial - Doc. Saída (NF-e)', 'Visualizar'));
CREATE POLICY "perm_insert" ON outbound_document_items AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Doc. Saída (NF-e)', 'Criar'));
CREATE POLICY "perm_update" ON outbound_document_items AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Doc. Saída (NF-e)', 'Editar'));

-- ==================== outbound_documents ====================
DROP POLICY IF EXISTS "Tenant isolation" ON outbound_documents;
DROP POLICY IF EXISTS "perm_select" ON outbound_documents;
DROP POLICY IF EXISTS "perm_insert" ON outbound_documents;
DROP POLICY IF EXISTS "perm_update" ON outbound_documents;

CREATE POLICY "Tenant isolation" ON outbound_documents AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON outbound_documents AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Comercial - Doc. Saída (NF-e)', 'Visualizar'));
CREATE POLICY "perm_insert" ON outbound_documents AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Doc. Saída (NF-e)', 'Criar'));
CREATE POLICY "perm_update" ON outbound_documents AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Doc. Saída (NF-e)', 'Editar'));

-- ==================== payment_conditions ====================
DROP POLICY IF EXISTS "Tenant isolation" ON payment_conditions;
DROP POLICY IF EXISTS "perm_select" ON payment_conditions;
DROP POLICY IF EXISTS "perm_insert" ON payment_conditions;
DROP POLICY IF EXISTS "perm_update" ON payment_conditions;

CREATE POLICY "Tenant isolation" ON payment_conditions AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON payment_conditions AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Cond. Pagamento', 'Visualizar'));
CREATE POLICY "perm_insert" ON payment_conditions AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Cond. Pagamento', 'Criar'));
CREATE POLICY "perm_update" ON payment_conditions AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Cond. Pagamento', 'Editar'));

-- ==================== purchase_order_items ====================
DROP POLICY IF EXISTS "Tenant isolation" ON purchase_order_items;
DROP POLICY IF EXISTS "perm_select" ON purchase_order_items;
DROP POLICY IF EXISTS "perm_insert" ON purchase_order_items;
DROP POLICY IF EXISTS "perm_update" ON purchase_order_items;

CREATE POLICY "Tenant isolation" ON purchase_order_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON purchase_order_items AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Compras - Pedidos', 'Visualizar'));
CREATE POLICY "perm_insert" ON purchase_order_items AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Compras - Pedidos', 'Criar'));
CREATE POLICY "perm_update" ON purchase_order_items AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Compras - Pedidos', 'Editar'));

-- ==================== purchase_orders ====================
DROP POLICY IF EXISTS "Tenant isolation" ON purchase_orders;
DROP POLICY IF EXISTS "perm_select" ON purchase_orders;
DROP POLICY IF EXISTS "perm_insert" ON purchase_orders;
DROP POLICY IF EXISTS "perm_update" ON purchase_orders;

CREATE POLICY "Tenant isolation" ON purchase_orders AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON purchase_orders AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Compras - Pedidos', 'Visualizar'));
CREATE POLICY "perm_insert" ON purchase_orders AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Compras - Pedidos', 'Criar'));
CREATE POLICY "perm_update" ON purchase_orders AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Compras - Pedidos', 'Editar'));

-- ==================== quotation_items ====================
DROP POLICY IF EXISTS "Tenant isolation" ON quotation_items;
DROP POLICY IF EXISTS "perm_select" ON quotation_items;
DROP POLICY IF EXISTS "perm_insert" ON quotation_items;
DROP POLICY IF EXISTS "perm_update" ON quotation_items;

CREATE POLICY "Tenant isolation" ON quotation_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON quotation_items AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Comercial - Orçamentos', 'Visualizar'));
CREATE POLICY "perm_insert" ON quotation_items AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Orçamentos', 'Criar'));
CREATE POLICY "perm_update" ON quotation_items AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Orçamentos', 'Editar'));

-- ==================== quotations ====================
DROP POLICY IF EXISTS "Tenant isolation" ON quotations;
DROP POLICY IF EXISTS "perm_select" ON quotations;
DROP POLICY IF EXISTS "perm_insert" ON quotations;
DROP POLICY IF EXISTS "perm_update" ON quotations;

CREATE POLICY "Tenant isolation" ON quotations AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON quotations AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Comercial - Orçamentos', 'Visualizar'));
CREATE POLICY "perm_insert" ON quotations AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Orçamentos', 'Criar'));
CREATE POLICY "perm_update" ON quotations AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Orçamentos', 'Editar'));

-- ==================== representantes ====================
DROP POLICY IF EXISTS "Tenant isolation" ON representantes;
DROP POLICY IF EXISTS "perm_select" ON representantes;
DROP POLICY IF EXISTS "perm_insert" ON representantes;
DROP POLICY IF EXISTS "perm_update" ON representantes;

CREATE POLICY "Tenant isolation" ON representantes AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON representantes AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Visualizar'));
CREATE POLICY "perm_insert" ON representantes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Pedidos de Venda', 'Criar'));
CREATE POLICY "perm_update" ON representantes AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Editar'));

-- ==================== sale_items ====================
DROP POLICY IF EXISTS "Tenant isolation" ON sale_items;
DROP POLICY IF EXISTS "perm_select" ON sale_items;
DROP POLICY IF EXISTS "perm_insert" ON sale_items;
DROP POLICY IF EXISTS "perm_update" ON sale_items;

CREATE POLICY "Tenant isolation" ON sale_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON sale_items AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Visualizar'));
CREATE POLICY "perm_insert" ON sale_items AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Pedidos de Venda', 'Criar'));
CREATE POLICY "perm_update" ON sale_items AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Editar'));

-- ==================== sales_orders ====================
DROP POLICY IF EXISTS "Tenant isolation" ON sales_orders;
DROP POLICY IF EXISTS "perm_select" ON sales_orders;
DROP POLICY IF EXISTS "perm_insert" ON sales_orders;
DROP POLICY IF EXISTS "perm_update" ON sales_orders;

CREATE POLICY "Tenant isolation" ON sales_orders AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON sales_orders AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Visualizar'));
CREATE POLICY "perm_insert" ON sales_orders AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Pedidos de Venda', 'Criar'));
CREATE POLICY "perm_update" ON sales_orders AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Editar'));

-- ==================== service_order_items ====================
DROP POLICY IF EXISTS "Tenant isolation" ON service_order_items;
DROP POLICY IF EXISTS "perm_select" ON service_order_items;
DROP POLICY IF EXISTS "perm_insert" ON service_order_items;
DROP POLICY IF EXISTS "perm_update" ON service_order_items;

CREATE POLICY "Tenant isolation" ON service_order_items AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON service_order_items AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Serviços - Ordens de Serviço', 'Visualizar'));
CREATE POLICY "perm_insert" ON service_order_items AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Serviços - Ordens de Serviço', 'Criar'));
CREATE POLICY "perm_update" ON service_order_items AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Serviços - Ordens de Serviço', 'Editar'));

-- ==================== service_orders ====================
DROP POLICY IF EXISTS "Tenant isolation" ON service_orders;
DROP POLICY IF EXISTS "perm_select" ON service_orders;
DROP POLICY IF EXISTS "perm_insert" ON service_orders;
DROP POLICY IF EXISTS "perm_update" ON service_orders;

CREATE POLICY "Tenant isolation" ON service_orders AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON service_orders AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Serviços - Ordens de Serviço', 'Visualizar'));
CREATE POLICY "perm_insert" ON service_orders AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Serviços - Ordens de Serviço', 'Criar'));
CREATE POLICY "perm_update" ON service_orders AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Serviços - Ordens de Serviço', 'Editar'));

-- ==================== stock_movements ====================
DROP POLICY IF EXISTS "Tenant isolation" ON stock_movements;
DROP POLICY IF EXISTS "perm_select" ON stock_movements;
DROP POLICY IF EXISTS "perm_insert" ON stock_movements;
DROP POLICY IF EXISTS "perm_update" ON stock_movements;

CREATE POLICY "Tenant isolation" ON stock_movements AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON stock_movements AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Estoque - Movimentações', 'Visualizar'));
CREATE POLICY "perm_insert" ON stock_movements AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Estoque - Movimentações', 'Criar'));
CREATE POLICY "perm_update" ON stock_movements AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Estoque - Movimentações', 'Editar'));

-- ==================== suppliers ====================
DROP POLICY IF EXISTS "Tenant isolation" ON suppliers;
DROP POLICY IF EXISTS "perm_select" ON suppliers;
DROP POLICY IF EXISTS "perm_insert" ON suppliers;
DROP POLICY IF EXISTS "perm_update" ON suppliers;

CREATE POLICY "Tenant isolation" ON suppliers AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON suppliers AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Fornecedores', 'Visualizar'));
CREATE POLICY "perm_insert" ON suppliers AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Fornecedores', 'Criar'));
CREATE POLICY "perm_update" ON suppliers AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Fornecedores', 'Editar'));

-- ==================== unidades_medida ====================
DROP POLICY IF EXISTS "Tenant isolation" ON unidades_medida;
DROP POLICY IF EXISTS "perm_select" ON unidades_medida;
DROP POLICY IF EXISTS "perm_insert" ON unidades_medida;
DROP POLICY IF EXISTS "perm_update" ON unidades_medida;

CREATE POLICY "Tenant isolation" ON unidades_medida AS RESTRICTIVE FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));
CREATE POLICY "perm_select" ON unidades_medida AS RESTRICTIVE FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Unid. Medida', 'Visualizar'));
CREATE POLICY "perm_insert" ON unidades_medida AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Unid. Medida', 'Criar'));
CREATE POLICY "perm_update" ON unidades_medida AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Unid. Medida', 'Editar'));

-- ==================== permissions (admin tables) ====================
DROP POLICY IF EXISTS "Admin can read permissions" ON permissions;
DROP POLICY IF EXISTS "Admin global can manage permissions" ON permissions;

CREATE POLICY "Admin can read permissions" ON permissions AS RESTRICTIVE FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin_global') OR has_role(auth.uid(), 'admin_empresa'));
CREATE POLICY "Admin global can manage permissions" ON permissions AS RESTRICTIVE FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin_global'))
  WITH CHECK (has_role(auth.uid(), 'admin_global'));

-- ==================== profiles ====================
DROP POLICY IF EXISTS "Users can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON profiles;

CREATE POLICY "Users can view profiles" ON profiles AS RESTRICTIVE FOR SELECT TO authenticated
  USING (auth_id = auth.uid() OR has_role(auth.uid(), 'admin_global') OR (has_role(auth.uid(), 'admin_empresa') AND tenant_id = get_tenant_id(auth.uid())));
CREATE POLICY "Users can update profiles" ON profiles AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (auth_id = auth.uid() OR has_role(auth.uid(), 'admin_global') OR (has_role(auth.uid(), 'admin_empresa') AND tenant_id = get_tenant_id(auth.uid())));

-- ==================== empresas ====================
DROP POLICY IF EXISTS "Tenant isolation" ON empresas;

CREATE POLICY "Tenant isolation" ON empresas AS RESTRICTIVE FOR ALL TO authenticated
  USING (id = get_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin_global'))
  WITH CHECK (id = get_tenant_id(auth.uid()) OR has_role(auth.uid(), 'admin_global'));