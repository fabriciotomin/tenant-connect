-- Fix: RESTRICTIVE-only tables deny all access in PostgreSQL.
-- We need at least one PERMISSIVE policy per table to grant base access,
-- which the RESTRICTIVE policies then narrow down.
-- This PERMISSIVE policy simply allows all authenticated users to attempt access;
-- the existing RESTRICTIVE "Tenant isolation" + "perm_*" policies enforce the real rules.

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'accounting_periods','accounts_payable','accounts_receivable','audit_logs',
    'bank_movements','banks','comissoes','cost_centers','customers',
    'document_series','financial_natures','formas_pagamento',
    'inbound_document_items','inbound_documents','item_categories','item_groups',
    'items','outbound_document_items','outbound_documents','payment_conditions',
    'purchase_order_items','purchase_orders','quotation_items','quotations',
    'representantes','sale_items','sales_orders',
    'service_order_items','service_orders','stock_movements','suppliers'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Drop if exists to be idempotent
    EXECUTE format('DROP POLICY IF EXISTS "Base authenticated access" ON %I', tbl);
    
    -- Create PERMISSIVE policy for ALL commands (SELECT, INSERT, UPDATE, DELETE)
    -- This grants base access that RESTRICTIVE policies will then narrow
    EXECUTE format(
      'CREATE POLICY "Base authenticated access" ON %I AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl
    );
  END LOOP;
END $$;

-- Also ensure profiles and empresas have permissive base access
DROP POLICY IF EXISTS "Base authenticated access" ON profiles;
CREATE POLICY "Base authenticated access" ON profiles AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Base authenticated access" ON empresas;
CREATE POLICY "Base authenticated access" ON empresas AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permissions and user_permissions also need base access for admin operations
DROP POLICY IF EXISTS "Base authenticated access" ON permissions;
CREATE POLICY "Base authenticated access" ON permissions AS PERMISSIVE FOR ALL TO authenticated USING (true) WITH CHECK (true);
