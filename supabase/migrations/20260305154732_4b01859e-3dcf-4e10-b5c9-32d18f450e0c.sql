
-- =============================================================
-- CRITICAL SECURITY FIX: Remove admin_global bypass from ALL data tables
-- Admin_global users will now be scoped by their profile.tenant_id
-- (which is synced by the frontend when switching companies)
-- =============================================================

-- 1. accounting_periods
DROP POLICY IF EXISTS "Tenant isolation" ON public.accounting_periods;
CREATE POLICY "Tenant isolation" ON public.accounting_periods
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 2. accounts_payable
DROP POLICY IF EXISTS "Tenant isolation" ON public.accounts_payable;
CREATE POLICY "Tenant isolation" ON public.accounts_payable
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 3. accounts_receivable
DROP POLICY IF EXISTS "Tenant isolation" ON public.accounts_receivable;
CREATE POLICY "Tenant isolation" ON public.accounts_receivable
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 4. audit_logs
DROP POLICY IF EXISTS "Tenant isolation" ON public.audit_logs;
CREATE POLICY "Tenant isolation" ON public.audit_logs
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 5. bank_movements
DROP POLICY IF EXISTS "Tenant isolation" ON public.bank_movements;
CREATE POLICY "Tenant isolation" ON public.bank_movements
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 6. banks
DROP POLICY IF EXISTS "Tenant isolation" ON public.banks;
CREATE POLICY "Tenant isolation" ON public.banks
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 7. comissoes
DROP POLICY IF EXISTS "Tenant isolation" ON public.comissoes;
CREATE POLICY "Tenant isolation" ON public.comissoes
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 8. cost_centers
DROP POLICY IF EXISTS "Tenant isolation" ON public.cost_centers;
CREATE POLICY "Tenant isolation" ON public.cost_centers
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 9. customers
DROP POLICY IF EXISTS "Tenant isolation" ON public.customers;
CREATE POLICY "Tenant isolation" ON public.customers
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 10. document_series
DROP POLICY IF EXISTS "Tenant isolation" ON public.document_series;
CREATE POLICY "Tenant isolation" ON public.document_series
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 11. financial_natures
DROP POLICY IF EXISTS "Tenant isolation" ON public.financial_natures;
CREATE POLICY "Tenant isolation" ON public.financial_natures
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 12. formas_pagamento
DROP POLICY IF EXISTS "Tenant isolation" ON public.formas_pagamento;
CREATE POLICY "Tenant isolation" ON public.formas_pagamento
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 13. inbound_document_items
DROP POLICY IF EXISTS "Tenant isolation" ON public.inbound_document_items;
CREATE POLICY "Tenant isolation" ON public.inbound_document_items
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 14. inbound_documents
DROP POLICY IF EXISTS "Tenant isolation" ON public.inbound_documents;
CREATE POLICY "Tenant isolation" ON public.inbound_documents
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 15. item_categories
DROP POLICY IF EXISTS "Tenant isolation" ON public.item_categories;
CREATE POLICY "Tenant isolation" ON public.item_categories
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 16. item_groups
DROP POLICY IF EXISTS "Tenant isolation" ON public.item_groups;
CREATE POLICY "Tenant isolation" ON public.item_groups
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 17. items
DROP POLICY IF EXISTS "Tenant isolation" ON public.items;
CREATE POLICY "Tenant isolation" ON public.items
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 18. outbound_document_items
DROP POLICY IF EXISTS "Tenant isolation" ON public.outbound_document_items;
CREATE POLICY "Tenant isolation" ON public.outbound_document_items
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 19. outbound_documents
DROP POLICY IF EXISTS "Tenant isolation" ON public.outbound_documents;
CREATE POLICY "Tenant isolation" ON public.outbound_documents
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 20. payment_conditions
DROP POLICY IF EXISTS "Tenant isolation" ON public.payment_conditions;
CREATE POLICY "Tenant isolation" ON public.payment_conditions
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 21. purchase_order_items
DROP POLICY IF EXISTS "Tenant isolation" ON public.purchase_order_items;
CREATE POLICY "Tenant isolation" ON public.purchase_order_items
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 22. purchase_orders
DROP POLICY IF EXISTS "Tenant isolation" ON public.purchase_orders;
CREATE POLICY "Tenant isolation" ON public.purchase_orders
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 23. quotation_items
DROP POLICY IF EXISTS "Tenant isolation" ON public.quotation_items;
CREATE POLICY "Tenant isolation" ON public.quotation_items
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 24. quotations
DROP POLICY IF EXISTS "Tenant isolation" ON public.quotations;
CREATE POLICY "Tenant isolation" ON public.quotations
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 25. representantes
DROP POLICY IF EXISTS "Tenant isolation" ON public.representantes;
CREATE POLICY "Tenant isolation" ON public.representantes
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 26. sale_items
DROP POLICY IF EXISTS "Tenant isolation" ON public.sale_items;
CREATE POLICY "Tenant isolation" ON public.sale_items
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 27. sales_orders
DROP POLICY IF EXISTS "Tenant isolation" ON public.sales_orders;
CREATE POLICY "Tenant isolation" ON public.sales_orders
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 28. service_order_items
DROP POLICY IF EXISTS "Tenant isolation" ON public.service_order_items;
CREATE POLICY "Tenant isolation" ON public.service_order_items
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 29. service_orders
DROP POLICY IF EXISTS "Tenant isolation" ON public.service_orders;
CREATE POLICY "Tenant isolation" ON public.service_orders
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 30. stock_movements
DROP POLICY IF EXISTS "Tenant isolation" ON public.stock_movements;
CREATE POLICY "Tenant isolation" ON public.stock_movements
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 31. suppliers
DROP POLICY IF EXISTS "Tenant isolation" ON public.suppliers;
CREATE POLICY "Tenant isolation" ON public.suppliers
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 32. unidades_medida
DROP POLICY IF EXISTS "Tenant isolation" ON public.unidades_medida;
CREATE POLICY "Tenant isolation" ON public.unidades_medida
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- 33. user_permissions
DROP POLICY IF EXISTS "Tenant isolation" ON public.user_permissions;
CREATE POLICY "Tenant isolation" ON public.user_permissions
  FOR ALL TO authenticated
  USING (tenant_id = get_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_tenant_id(auth.uid()));

-- Keep admin_global bypass ONLY on empresas (needed for company switching)
-- empresas already has correct policies (view own + admin_global)

-- Keep admin_global bypass on profiles (needed for admin user management)
-- profiles already has correct policies

-- Keep admin_global bypass on permissions (admin-only management table)
-- permissions already has correct policy

-- Update empresas to also allow admin_global to INSERT (for company creation)
-- Already correct - empresas has separate SELECT/UPDATE policies with admin_global
