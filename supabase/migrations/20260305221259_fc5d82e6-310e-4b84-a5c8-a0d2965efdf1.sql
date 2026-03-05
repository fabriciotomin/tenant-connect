
-- 1. Create check_permission function (SECURITY DEFINER to avoid recursion)
CREATE OR REPLACE FUNCTION public.check_permission(_module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    has_role(auth.uid(), 'admin_global')
    OR
    has_role(auth.uid(), 'admin_empresa')
    OR
    EXISTS (
      SELECT 1
      FROM user_permissions up
      JOIN permissions p ON p.id = up.permission_id
      WHERE up.user_id = auth.uid()
        AND up.tenant_id = get_tenant_id(auth.uid())
        AND up.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND p.module = _module
        AND p.action = _action
    )
$$;

-- ==================== ITEMS ====================
CREATE POLICY "perm_select" ON public.items FOR SELECT TO authenticated
  USING (check_permission('Estoque - Itens', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.items FOR INSERT TO authenticated
  WITH CHECK (check_permission('Estoque - Itens', 'Criar'));
CREATE POLICY "perm_update" ON public.items FOR UPDATE TO authenticated
  USING (check_permission('Estoque - Itens', 'Editar'));

-- ==================== ITEM_GROUPS ====================
CREATE POLICY "perm_select" ON public.item_groups FOR SELECT TO authenticated
  USING (check_permission('Estoque - Grupos', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.item_groups FOR INSERT TO authenticated
  WITH CHECK (check_permission('Estoque - Grupos', 'Criar'));
CREATE POLICY "perm_update" ON public.item_groups FOR UPDATE TO authenticated
  USING (check_permission('Estoque - Grupos', 'Editar'));

-- ==================== ITEM_CATEGORIES ====================
CREATE POLICY "perm_select" ON public.item_categories FOR SELECT TO authenticated
  USING (check_permission('Estoque - Itens', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.item_categories FOR INSERT TO authenticated
  WITH CHECK (check_permission('Estoque - Itens', 'Criar'));
CREATE POLICY "perm_update" ON public.item_categories FOR UPDATE TO authenticated
  USING (check_permission('Estoque - Itens', 'Editar'));

-- ==================== STOCK_MOVEMENTS ====================
CREATE POLICY "perm_select" ON public.stock_movements FOR SELECT TO authenticated
  USING (check_permission('Estoque - Movimentações', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.stock_movements FOR INSERT TO authenticated
  WITH CHECK (check_permission('Estoque - Movimentações', 'Criar'));

-- ==================== CUSTOMERS ====================
CREATE POLICY "perm_select" ON public.customers FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Clientes', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Clientes', 'Criar'));
CREATE POLICY "perm_update" ON public.customers FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Clientes', 'Editar'));

-- ==================== SUPPLIERS ====================
CREATE POLICY "perm_select" ON public.suppliers FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Fornecedores', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Fornecedores', 'Criar'));
CREATE POLICY "perm_update" ON public.suppliers FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Fornecedores', 'Editar'));

-- ==================== BANKS ====================
CREATE POLICY "perm_select" ON public.banks FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Bancos', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.banks FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Bancos', 'Criar'));
CREATE POLICY "perm_update" ON public.banks FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Bancos', 'Editar'));

-- ==================== BANK_MOVEMENTS ====================
CREATE POLICY "perm_select" ON public.bank_movements FOR SELECT TO authenticated
  USING (check_permission('Financeiro - Extrato Bancário', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.bank_movements FOR INSERT TO authenticated
  WITH CHECK (check_permission('Financeiro - Extrato Bancário', 'Criar'));
CREATE POLICY "perm_update" ON public.bank_movements FOR UPDATE TO authenticated
  USING (check_permission('Financeiro - Extrato Bancário', 'Editar'));

-- ==================== COST_CENTERS ====================
CREATE POLICY "perm_select" ON public.cost_centers FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Centros de Custo', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.cost_centers FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Centros de Custo', 'Criar'));
CREATE POLICY "perm_update" ON public.cost_centers FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Centros de Custo', 'Editar'));

-- ==================== FINANCIAL_NATURES ====================
CREATE POLICY "perm_select" ON public.financial_natures FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Nat. Financeiras', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.financial_natures FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Nat. Financeiras', 'Criar'));
CREATE POLICY "perm_update" ON public.financial_natures FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Nat. Financeiras', 'Editar'));

-- ==================== FORMAS_PAGAMENTO ====================
CREATE POLICY "perm_select" ON public.formas_pagamento FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Formas de Pagamento', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.formas_pagamento FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Formas de Pagamento', 'Criar'));
CREATE POLICY "perm_update" ON public.formas_pagamento FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Formas de Pagamento', 'Editar'));

-- ==================== PAYMENT_CONDITIONS ====================
CREATE POLICY "perm_select" ON public.payment_conditions FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Cond. Pagamento', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.payment_conditions FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Cond. Pagamento', 'Criar'));
CREATE POLICY "perm_update" ON public.payment_conditions FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Cond. Pagamento', 'Editar'));

-- ==================== DOCUMENT_SERIES ====================
CREATE POLICY "perm_select" ON public.document_series FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Séries de Documento', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.document_series FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Séries de Documento', 'Criar'));
CREATE POLICY "perm_update" ON public.document_series FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Séries de Documento', 'Editar'));

-- ==================== UNIDADES_MEDIDA ====================
CREATE POLICY "perm_select" ON public.unidades_medida FOR SELECT TO authenticated
  USING (check_permission('Cadastros - Unid. Medida', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.unidades_medida FOR INSERT TO authenticated
  WITH CHECK (check_permission('Cadastros - Unid. Medida', 'Criar'));
CREATE POLICY "perm_update" ON public.unidades_medida FOR UPDATE TO authenticated
  USING (check_permission('Cadastros - Unid. Medida', 'Editar'));

-- ==================== ACCOUNTS_PAYABLE ====================
CREATE POLICY "perm_select" ON public.accounts_payable FOR SELECT TO authenticated
  USING (check_permission('Financeiro - Contas a Pagar', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.accounts_payable FOR INSERT TO authenticated
  WITH CHECK (check_permission('Financeiro - Contas a Pagar', 'Criar'));
CREATE POLICY "perm_update" ON public.accounts_payable FOR UPDATE TO authenticated
  USING (check_permission('Financeiro - Contas a Pagar', 'Editar'));

-- ==================== ACCOUNTS_RECEIVABLE ====================
CREATE POLICY "perm_select" ON public.accounts_receivable FOR SELECT TO authenticated
  USING (check_permission('Financeiro - Contas a Receber', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.accounts_receivable FOR INSERT TO authenticated
  WITH CHECK (check_permission('Financeiro - Contas a Receber', 'Criar'));
CREATE POLICY "perm_update" ON public.accounts_receivable FOR UPDATE TO authenticated
  USING (check_permission('Financeiro - Contas a Receber', 'Editar'));

-- ==================== PURCHASE_ORDERS ====================
CREATE POLICY "perm_select" ON public.purchase_orders FOR SELECT TO authenticated
  USING (check_permission('Compras - Pedidos', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.purchase_orders FOR INSERT TO authenticated
  WITH CHECK (check_permission('Compras - Pedidos', 'Criar'));
CREATE POLICY "perm_update" ON public.purchase_orders FOR UPDATE TO authenticated
  USING (check_permission('Compras - Pedidos', 'Editar'));

-- ==================== PURCHASE_ORDER_ITEMS ====================
CREATE POLICY "perm_select" ON public.purchase_order_items FOR SELECT TO authenticated
  USING (check_permission('Compras - Pedidos', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.purchase_order_items FOR INSERT TO authenticated
  WITH CHECK (check_permission('Compras - Pedidos', 'Criar'));
CREATE POLICY "perm_update" ON public.purchase_order_items FOR UPDATE TO authenticated
  USING (check_permission('Compras - Pedidos', 'Editar'));

-- ==================== INBOUND_DOCUMENTS ====================
CREATE POLICY "perm_select" ON public.inbound_documents FOR SELECT TO authenticated
  USING (check_permission('Compras - Entradas (NF-e)', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.inbound_documents FOR INSERT TO authenticated
  WITH CHECK (check_permission('Compras - Entradas (NF-e)', 'Criar'));
CREATE POLICY "perm_update" ON public.inbound_documents FOR UPDATE TO authenticated
  USING (check_permission('Compras - Entradas (NF-e)', 'Editar'));

-- ==================== INBOUND_DOCUMENT_ITEMS ====================
CREATE POLICY "perm_select" ON public.inbound_document_items FOR SELECT TO authenticated
  USING (check_permission('Compras - Entradas (NF-e)', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.inbound_document_items FOR INSERT TO authenticated
  WITH CHECK (check_permission('Compras - Entradas (NF-e)', 'Criar'));
CREATE POLICY "perm_update" ON public.inbound_document_items FOR UPDATE TO authenticated
  USING (check_permission('Compras - Entradas (NF-e)', 'Editar'));

-- ==================== OUTBOUND_DOCUMENTS ====================
CREATE POLICY "perm_select" ON public.outbound_documents FOR SELECT TO authenticated
  USING (check_permission('Comercial - Doc. Saída (NF-e)', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.outbound_documents FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Doc. Saída (NF-e)', 'Criar'));
CREATE POLICY "perm_update" ON public.outbound_documents FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Doc. Saída (NF-e)', 'Editar'));

-- ==================== OUTBOUND_DOCUMENT_ITEMS ====================
CREATE POLICY "perm_select" ON public.outbound_document_items FOR SELECT TO authenticated
  USING (check_permission('Comercial - Doc. Saída (NF-e)', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.outbound_document_items FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Doc. Saída (NF-e)', 'Criar'));
CREATE POLICY "perm_update" ON public.outbound_document_items FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Doc. Saída (NF-e)', 'Editar'));

-- ==================== QUOTATIONS ====================
CREATE POLICY "perm_select" ON public.quotations FOR SELECT TO authenticated
  USING (check_permission('Comercial - Orçamentos', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.quotations FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Orçamentos', 'Criar'));
CREATE POLICY "perm_update" ON public.quotations FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Orçamentos', 'Editar'));

-- ==================== QUOTATION_ITEMS ====================
CREATE POLICY "perm_select" ON public.quotation_items FOR SELECT TO authenticated
  USING (check_permission('Comercial - Orçamentos', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.quotation_items FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Orçamentos', 'Criar'));
CREATE POLICY "perm_update" ON public.quotation_items FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Orçamentos', 'Editar'));

-- ==================== SALES_ORDERS ====================
CREATE POLICY "perm_select" ON public.sales_orders FOR SELECT TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.sales_orders FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Pedidos de Venda', 'Criar'));
CREATE POLICY "perm_update" ON public.sales_orders FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Editar'));

-- ==================== SALE_ITEMS ====================
CREATE POLICY "perm_select" ON public.sale_items FOR SELECT TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.sale_items FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Pedidos de Venda', 'Criar'));
CREATE POLICY "perm_update" ON public.sale_items FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Editar'));

-- ==================== SERVICE_ORDERS ====================
CREATE POLICY "perm_select" ON public.service_orders FOR SELECT TO authenticated
  USING (check_permission('Serviços - Ordens de Serviço', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.service_orders FOR INSERT TO authenticated
  WITH CHECK (check_permission('Serviços - Ordens de Serviço', 'Criar'));
CREATE POLICY "perm_update" ON public.service_orders FOR UPDATE TO authenticated
  USING (check_permission('Serviços - Ordens de Serviço', 'Editar'));

-- ==================== SERVICE_ORDER_ITEMS ====================
CREATE POLICY "perm_select" ON public.service_order_items FOR SELECT TO authenticated
  USING (check_permission('Serviços - Ordens de Serviço', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.service_order_items FOR INSERT TO authenticated
  WITH CHECK (check_permission('Serviços - Ordens de Serviço', 'Criar'));
CREATE POLICY "perm_update" ON public.service_order_items FOR UPDATE TO authenticated
  USING (check_permission('Serviços - Ordens de Serviço', 'Editar'));

-- ==================== COMISSOES ====================
CREATE POLICY "perm_select" ON public.comissoes FOR SELECT TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.comissoes FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Pedidos de Venda', 'Criar'));
CREATE POLICY "perm_update" ON public.comissoes FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Editar'));

-- ==================== REPRESENTANTES ====================
CREATE POLICY "perm_select" ON public.representantes FOR SELECT TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Visualizar'));
CREATE POLICY "perm_insert" ON public.representantes FOR INSERT TO authenticated
  WITH CHECK (check_permission('Comercial - Pedidos de Venda', 'Criar'));
CREATE POLICY "perm_update" ON public.representantes FOR UPDATE TO authenticated
  USING (check_permission('Comercial - Pedidos de Venda', 'Editar'));

-- ==================== ACCOUNTING_PERIODS ====================
CREATE POLICY "perm_select" ON public.accounting_periods FOR SELECT TO authenticated
  USING (check_permission('Controladoria - DRE', 'Visualizar'));
CREATE POLICY "perm_update" ON public.accounting_periods FOR UPDATE TO authenticated
  USING (check_permission('Controladoria - DRE', 'Visualizar'));

-- ==================== AUDIT_LOGS ====================
CREATE POLICY "perm_select" ON public.audit_logs FOR SELECT TO authenticated
  USING (check_permission('Administração - Usuários', 'Visualizar'));
