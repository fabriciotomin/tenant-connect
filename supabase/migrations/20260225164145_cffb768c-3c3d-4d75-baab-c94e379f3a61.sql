
-- =====================================================
-- FIX: Convert ALL RLS policies from RESTRICTIVE to PERMISSIVE
-- The previous migration created them as RESTRICTIVE (Permissive: No),
-- which means ALL policies must pass simultaneously - breaking access.
-- =====================================================

-- ============ EMPRESAS ============
DROP POLICY IF EXISTS "admin_global_all_empresas" ON public.empresas;
DROP POLICY IF EXISTS "admin_empresa_select_empresas" ON public.empresas;
DROP POLICY IF EXISTS "user_select_empresas" ON public.empresas;

CREATE POLICY "admin_global_all_empresas" ON public.empresas FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_select_empresas" ON public.empresas FOR SELECT TO authenticated
  USING (is_admin_empresa(auth.uid(), id));
CREATE POLICY "user_select_empresas" ON public.empresas FOR SELECT TO authenticated
  USING (id = get_user_tenant_id(auth.uid()));

-- ============ PROFILES ============
DROP POLICY IF EXISTS "admin_global_all_profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin_empresa_select_profiles" ON public.profiles;
DROP POLICY IF EXISTS "user_select_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "user_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "user_update_own_profile" ON public.profiles;

CREATE POLICY "admin_global_all_profiles" ON public.profiles FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_select_profiles" ON public.profiles FOR SELECT TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_own_profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth_id = auth.uid());
CREATE POLICY "user_insert_own_profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth_id = auth.uid());
CREATE POLICY "user_update_own_profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid());

-- ============ USER_ROLES ============
DROP POLICY IF EXISTS "admin_global_all_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin_empresa_all_user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_select_own_roles" ON public.user_roles;

CREATE POLICY "admin_global_all_user_roles" ON public.user_roles FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_manage_user_roles" ON public.user_roles FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id) AND role != 'admin_global')
  WITH CHECK (is_admin_empresa(auth.uid(), tenant_id) AND role != 'admin_global');
CREATE POLICY "user_select_own_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============ USER_PERMISSIONS ============
DROP POLICY IF EXISTS "admin_global_all_user_permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "admin_empresa_all_user_permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "user_select_own_permissions" ON public.user_permissions;

CREATE POLICY "admin_global_all_user_permissions" ON public.user_permissions FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_manage_user_permissions" ON public.user_permissions FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id))
  WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_own_permissions" ON public.user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============ PERMISSIONS (reference table) ============
DROP POLICY IF EXISTS "admin_global_all_permissions" ON public.permissions;
DROP POLICY IF EXISTS "authenticated_select_permissions" ON public.permissions;

CREATE POLICY "admin_global_all_permissions" ON public.permissions FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "authenticated_select_permissions" ON public.permissions FOR SELECT TO authenticated
  USING (true);

-- ============ CUSTOMERS ============
DROP POLICY IF EXISTS "admin_global_all_customers" ON public.customers;
DROP POLICY IF EXISTS "admin_empresa_all_customers" ON public.customers;
DROP POLICY IF EXISTS "user_select_customers" ON public.customers;

CREATE POLICY "admin_global_all_customers" ON public.customers FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_customers" ON public.customers FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_select_customers" ON public.customers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_customers" ON public.customers FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ SUPPLIERS ============
DROP POLICY IF EXISTS "admin_global_all_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "admin_empresa_all_suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "user_select_suppliers" ON public.suppliers;

CREATE POLICY "admin_global_all_suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_suppliers" ON public.suppliers FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_select_suppliers" ON public.suppliers FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_suppliers" ON public.suppliers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_suppliers" ON public.suppliers FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ ITEMS ============
DROP POLICY IF EXISTS "admin_global_all_items" ON public.items;
DROP POLICY IF EXISTS "admin_empresa_all_items" ON public.items;
DROP POLICY IF EXISTS "user_select_items" ON public.items;

CREATE POLICY "admin_global_all_items" ON public.items FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_items" ON public.items FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_select_items" ON public.items FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_items" ON public.items FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_items" ON public.items FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ ITEM_GROUPS ============
DROP POLICY IF EXISTS "admin_global_all_item_groups" ON public.item_groups;
DROP POLICY IF EXISTS "admin_empresa_all_item_groups" ON public.item_groups;
DROP POLICY IF EXISTS "user_select_item_groups" ON public.item_groups;

CREATE POLICY "admin_global_all_item_groups" ON public.item_groups FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_item_groups" ON public.item_groups FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_select_item_groups" ON public.item_groups FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_insert_item_groups" ON public.item_groups FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
CREATE POLICY "tenant_update_item_groups" ON public.item_groups FOR UPDATE TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ QUOTATIONS ============
DROP POLICY IF EXISTS "admin_global_all_quotations" ON public.quotations;
DROP POLICY IF EXISTS "admin_empresa_all_quotations" ON public.quotations;
DROP POLICY IF EXISTS "user_select_quotations" ON public.quotations;

CREATE POLICY "admin_global_all_quotations" ON public.quotations FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_quotations" ON public.quotations FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_all_quotations" ON public.quotations FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ QUOTATION_ITEMS ============
DROP POLICY IF EXISTS "admin_global_all_quotation_items" ON public.quotation_items;
DROP POLICY IF EXISTS "admin_empresa_all_quotation_items" ON public.quotation_items;
DROP POLICY IF EXISTS "user_select_quotation_items" ON public.quotation_items;

CREATE POLICY "admin_global_all_quotation_items" ON public.quotation_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND is_admin_global(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND is_admin_global(auth.uid())));
CREATE POLICY "tenant_all_quotation_items" ON public.quotation_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND q.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM quotations q WHERE q.id = quotation_items.quotation_id AND q.tenant_id = get_user_tenant_id(auth.uid())));

-- ============ SALES_ORDERS ============
DROP POLICY IF EXISTS "admin_global_all_sales_orders" ON public.sales_orders;
DROP POLICY IF EXISTS "admin_empresa_all_sales_orders" ON public.sales_orders;
DROP POLICY IF EXISTS "user_select_sales_orders" ON public.sales_orders;

CREATE POLICY "admin_global_all_sales_orders" ON public.sales_orders FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_sales_orders" ON public.sales_orders FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_all_sales_orders" ON public.sales_orders FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ SALES_ORDER_ITEMS ============
DROP POLICY IF EXISTS "admin_global_all_so_items" ON public.sales_order_items;
DROP POLICY IF EXISTS "admin_empresa_all_so_items" ON public.sales_order_items;
DROP POLICY IF EXISTS "user_select_so_items" ON public.sales_order_items;

CREATE POLICY "admin_global_all_so_items" ON public.sales_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sales_orders s WHERE s.id = sales_order_items.sales_order_id AND is_admin_global(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM sales_orders s WHERE s.id = sales_order_items.sales_order_id AND is_admin_global(auth.uid())));
CREATE POLICY "tenant_all_so_items" ON public.sales_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM sales_orders s WHERE s.id = sales_order_items.sales_order_id AND s.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM sales_orders s WHERE s.id = sales_order_items.sales_order_id AND s.tenant_id = get_user_tenant_id(auth.uid())));

-- ============ OUTBOUND_DOCUMENTS ============
DROP POLICY IF EXISTS "admin_global_all_outbound_docs" ON public.outbound_documents;
DROP POLICY IF EXISTS "admin_empresa_all_outbound_docs" ON public.outbound_documents;
DROP POLICY IF EXISTS "user_select_outbound_docs" ON public.outbound_documents;

CREATE POLICY "admin_global_all_outbound_docs" ON public.outbound_documents FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_outbound_docs" ON public.outbound_documents FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_all_outbound_docs" ON public.outbound_documents FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ OUTBOUND_DOCUMENT_ITEMS ============
DROP POLICY IF EXISTS "admin_global_all_outbound_doc_items" ON public.outbound_document_items;
DROP POLICY IF EXISTS "admin_empresa_all_outbound_doc_items" ON public.outbound_document_items;
DROP POLICY IF EXISTS "user_select_outbound_doc_items" ON public.outbound_document_items;

CREATE POLICY "admin_global_all_outbound_doc_items" ON public.outbound_document_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM outbound_documents d WHERE d.id = outbound_document_items.outbound_document_id AND is_admin_global(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM outbound_documents d WHERE d.id = outbound_document_items.outbound_document_id AND is_admin_global(auth.uid())));
CREATE POLICY "tenant_all_outbound_doc_items" ON public.outbound_document_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM outbound_documents d WHERE d.id = outbound_document_items.outbound_document_id AND d.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM outbound_documents d WHERE d.id = outbound_document_items.outbound_document_id AND d.tenant_id = get_user_tenant_id(auth.uid())));

-- ============ INBOUND_DOCUMENTS ============
DROP POLICY IF EXISTS "admin_global_all_inbound_docs" ON public.inbound_documents;
DROP POLICY IF EXISTS "admin_empresa_all_inbound_docs" ON public.inbound_documents;
DROP POLICY IF EXISTS "user_select_inbound_docs" ON public.inbound_documents;

CREATE POLICY "admin_global_all_inbound_docs" ON public.inbound_documents FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_inbound_docs" ON public.inbound_documents FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_all_inbound_docs" ON public.inbound_documents FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ INBOUND_DOCUMENT_ITEMS ============
DROP POLICY IF EXISTS "admin_global_all_inbound_doc_items" ON public.inbound_document_items;
DROP POLICY IF EXISTS "admin_empresa_all_inbound_doc_items" ON public.inbound_document_items;
DROP POLICY IF EXISTS "user_select_inbound_doc_items" ON public.inbound_document_items;

CREATE POLICY "admin_global_all_inbound_doc_items" ON public.inbound_document_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM inbound_documents d WHERE d.id = inbound_document_items.inbound_document_id AND is_admin_global(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM inbound_documents d WHERE d.id = inbound_document_items.inbound_document_id AND is_admin_global(auth.uid())));
CREATE POLICY "tenant_all_inbound_doc_items" ON public.inbound_document_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM inbound_documents d WHERE d.id = inbound_document_items.inbound_document_id AND d.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM inbound_documents d WHERE d.id = inbound_document_items.inbound_document_id AND d.tenant_id = get_user_tenant_id(auth.uid())));

-- ============ PURCHASE_ORDERS ============
DROP POLICY IF EXISTS "admin_global_all_purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "admin_empresa_all_purchase_orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "user_select_purchase_orders" ON public.purchase_orders;

CREATE POLICY "admin_global_all_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_all_purchase_orders" ON public.purchase_orders FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ PURCHASE_ORDER_ITEMS ============
DROP POLICY IF EXISTS "admin_global_all_po_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "admin_empresa_all_po_items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "user_select_po_items" ON public.purchase_order_items;

CREATE POLICY "admin_global_all_po_items" ON public.purchase_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND is_admin_global(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND is_admin_global(auth.uid())));
CREATE POLICY "tenant_all_po_items" ON public.purchase_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND po.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM purchase_orders po WHERE po.id = purchase_order_items.purchase_order_id AND po.tenant_id = get_user_tenant_id(auth.uid())));

-- ============ ACCOUNTS_PAYABLE ============
DROP POLICY IF EXISTS "admin_global_all_accounts_payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "admin_empresa_all_accounts_payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "user_select_accounts_payable" ON public.accounts_payable;

CREATE POLICY "admin_global_all_accounts_payable" ON public.accounts_payable FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_accounts_payable" ON public.accounts_payable FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_select_accounts_payable" ON public.accounts_payable FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ ACCOUNTS_RECEIVABLE ============
DROP POLICY IF EXISTS "admin_global_all_accounts_receivable" ON public.accounts_receivable;
DROP POLICY IF EXISTS "admin_empresa_all_accounts_receivable" ON public.accounts_receivable;
DROP POLICY IF EXISTS "user_select_accounts_receivable" ON public.accounts_receivable;

CREATE POLICY "admin_global_all_accounts_receivable" ON public.accounts_receivable FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_accounts_receivable" ON public.accounts_receivable FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_select_accounts_receivable" ON public.accounts_receivable FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ BANKS ============
DROP POLICY IF EXISTS "admin_global_all_banks" ON public.banks;
DROP POLICY IF EXISTS "admin_empresa_all_banks" ON public.banks;
DROP POLICY IF EXISTS "user_select_banks" ON public.banks;

CREATE POLICY "admin_global_all_banks" ON public.banks FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_banks" ON public.banks FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_select_banks" ON public.banks FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ BANK_MOVEMENTS ============
DROP POLICY IF EXISTS "admin_global_all_bank_movements" ON public.bank_movements;
DROP POLICY IF EXISTS "admin_empresa_all_bank_movements" ON public.bank_movements;
DROP POLICY IF EXISTS "user_select_bank_movements" ON public.bank_movements;

CREATE POLICY "admin_global_all_bank_movements" ON public.bank_movements FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_bank_movements" ON public.bank_movements FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_select_bank_movements" ON public.bank_movements FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ STOCK_MOVEMENTS ============
DROP POLICY IF EXISTS "admin_global_all_stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "admin_empresa_all_stock_movements" ON public.stock_movements;
DROP POLICY IF EXISTS "user_select_stock_movements" ON public.stock_movements;

CREATE POLICY "admin_global_all_stock_movements" ON public.stock_movements FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_stock_movements" ON public.stock_movements FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_select_stock_movements" ON public.stock_movements FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ REPRESENTANTES ============
DROP POLICY IF EXISTS "admin_global_all_representantes" ON public.representantes;
DROP POLICY IF EXISTS "admin_empresa_all_representantes" ON public.representantes;
DROP POLICY IF EXISTS "user_select_representantes" ON public.representantes;

CREATE POLICY "admin_global_all_representantes" ON public.representantes FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_representantes" ON public.representantes FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_all_representantes" ON public.representantes FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ COMISSOES ============
DROP POLICY IF EXISTS "admin_global_all_comissoes" ON public.comissoes;
DROP POLICY IF EXISTS "admin_empresa_all_comissoes" ON public.comissoes;
DROP POLICY IF EXISTS "user_select_comissoes" ON public.comissoes;

CREATE POLICY "admin_global_all_comissoes" ON public.comissoes FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_comissoes" ON public.comissoes FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_select_comissoes" ON public.comissoes FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ PAYMENT_CONDITIONS ============
DROP POLICY IF EXISTS "admin_global_all_payment_conditions" ON public.payment_conditions;
DROP POLICY IF EXISTS "admin_empresa_all_payment_conditions" ON public.payment_conditions;
DROP POLICY IF EXISTS "user_select_payment_conditions" ON public.payment_conditions;

CREATE POLICY "admin_global_all_payment_conditions" ON public.payment_conditions FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_payment_conditions" ON public.payment_conditions FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_all_payment_conditions" ON public.payment_conditions FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ FINANCIAL_NATURES ============
DROP POLICY IF EXISTS "admin_global_all_financial_natures" ON public.financial_natures;
DROP POLICY IF EXISTS "admin_empresa_all_financial_natures" ON public.financial_natures;
DROP POLICY IF EXISTS "user_select_financial_natures" ON public.financial_natures;

CREATE POLICY "admin_global_all_financial_natures" ON public.financial_natures FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_financial_natures" ON public.financial_natures FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_all_financial_natures" ON public.financial_natures FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ COST_CENTERS ============
DROP POLICY IF EXISTS "admin_global_all_cost_centers" ON public.cost_centers;
DROP POLICY IF EXISTS "admin_empresa_all_cost_centers" ON public.cost_centers;
DROP POLICY IF EXISTS "user_select_cost_centers" ON public.cost_centers;

CREATE POLICY "admin_global_all_cost_centers" ON public.cost_centers FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_cost_centers" ON public.cost_centers FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_all_cost_centers" ON public.cost_centers FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ SERVICE_ORDERS ============
DROP POLICY IF EXISTS "admin_global_all_service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "admin_empresa_all_service_orders" ON public.service_orders;
DROP POLICY IF EXISTS "user_select_service_orders" ON public.service_orders;

CREATE POLICY "admin_global_all_service_orders" ON public.service_orders FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_service_orders" ON public.service_orders FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_all_service_orders" ON public.service_orders FOR ALL TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ SERVICE_ORDER_ITEMS ============
DROP POLICY IF EXISTS "admin_global_all_soi" ON public.service_order_items;
DROP POLICY IF EXISTS "admin_empresa_all_soi" ON public.service_order_items;
DROP POLICY IF EXISTS "user_select_soi" ON public.service_order_items;

CREATE POLICY "admin_global_all_soi" ON public.service_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM service_orders s WHERE s.id = service_order_items.service_order_id AND is_admin_global(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM service_orders s WHERE s.id = service_order_items.service_order_id AND is_admin_global(auth.uid())));
CREATE POLICY "tenant_all_soi" ON public.service_order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM service_orders s WHERE s.id = service_order_items.service_order_id AND s.tenant_id = get_user_tenant_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM service_orders s WHERE s.id = service_order_items.service_order_id AND s.tenant_id = get_user_tenant_id(auth.uid())));

-- ============ ACCOUNTING_PERIODS ============
DROP POLICY IF EXISTS "admin_global_all_accounting_periods" ON public.accounting_periods;
DROP POLICY IF EXISTS "admin_empresa_all_accounting_periods" ON public.accounting_periods;
DROP POLICY IF EXISTS "user_select_accounting_periods" ON public.accounting_periods;

CREATE POLICY "admin_global_all_accounting_periods" ON public.accounting_periods FOR ALL TO authenticated
  USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_accounting_periods" ON public.accounting_periods FOR ALL TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_select_accounting_periods" ON public.accounting_periods FOR SELECT TO authenticated
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============ AUDIT_LOGS ============
DROP POLICY IF EXISTS "admin_global_select_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "admin_empresa_select_audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "user_insert_audit_logs" ON public.audit_logs;

CREATE POLICY "admin_global_select_audit_logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_select_audit_logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_insert_audit_logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============ Seed missing permission: admin.usuario.gerenciar ============
INSERT INTO public.permissions (module, action, description)
VALUES ('admin', 'usuario.gerenciar', 'Gerenciar usuários e permissões')
ON CONFLICT DO NOTHING;
