-- 1) Resolve active tenant robustly (profile first, fallback to latest active user_tenants link)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT p.tenant_id
     FROM public.profiles p
     WHERE p.auth_id = _user_id
       AND p.tenant_id IS NOT NULL
     LIMIT 1),
    (SELECT ut.tenant_id
     FROM public.user_tenants ut
     WHERE ut.user_id = _user_id
       AND ut.ativo = true
     ORDER BY ut.updated_at DESC, ut.created_at DESC
     LIMIT 1)
  )
$$;

-- 2) Helper: admin_global can only act inside current selected tenant
CREATE OR REPLACE FUNCTION public.is_admin_global_in_tenant(_user_id uuid, _tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (
    _tenant_id IS NOT NULL
    AND public.is_admin_global(_user_id)
    AND _tenant_id = public.get_user_tenant_id(_user_id)
    AND EXISTS (
      SELECT 1
      FROM public.user_tenants ut
      WHERE ut.user_id = _user_id
        AND ut.tenant_id = _tenant_id
        AND ut.ativo = true
    )
  )
$$;

-- 3) Keep tenant context synced for all users (including admin_global)
CREATE OR REPLACE FUNCTION public.link_current_user_to_tenant(_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_global boolean;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF _tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id inválido';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.empresas e
    WHERE e.id = _tenant_id
      AND e.status = 'ativo'
  ) THEN
    RAISE EXCEPTION 'Empresa inválida ou inativa';
  END IF;

  INSERT INTO public.user_tenants (user_id, tenant_id, ativo)
  VALUES (v_user_id, _tenant_id, true)
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET ativo = true, updated_at = now();

  -- Always sync active tenant on profile (Model A)
  UPDATE public.profiles
  SET tenant_id = _tenant_id,
      updated_at = now()
  WHERE auth_id = v_user_id;

  SELECT public.is_admin_global(v_user_id) INTO v_is_global;

  IF NOT v_is_global THEN
    INSERT INTO public.user_roles (user_id, role, tenant_id)
    SELECT v_user_id, 'usuario'::app_role, _tenant_id
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = v_user_id
        AND ur.tenant_id = _tenant_id
    );
  END IF;
END;
$$;

-- 4) Replace overly broad admin_global policies in tenant-owned operational tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname ILIKE 'admin_global_all%'
      AND tablename IN (
        'accounting_periods', 'accounts_payable', 'accounts_receivable', 'bank_movements', 'banks',
        'comissoes', 'cost_centers', 'customers', 'financial_natures', 'formas_pagamento',
        'inbound_documents', 'item_groups', 'items', 'outbound_documents', 'payment_conditions',
        'purchase_orders', 'quotations', 'representantes', 'sales_orders', 'service_orders',
        'stock_movements', 'suppliers', 'user_permissions', 'user_tenants'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

CREATE POLICY admin_global_all_accounting_periods
ON public.accounting_periods
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_accounts_payable
ON public.accounts_payable
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_accounts_receivable
ON public.accounts_receivable
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_bank_movements
ON public.bank_movements
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_banks
ON public.banks
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_comissoes
ON public.comissoes
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_cost_centers
ON public.cost_centers
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_customers
ON public.customers
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_financial_natures
ON public.financial_natures
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_formas_pagamento
ON public.formas_pagamento
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_inbound_docs
ON public.inbound_documents
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_item_groups
ON public.item_groups
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_items
ON public.items
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_outbound_docs
ON public.outbound_documents
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_payment_conditions
ON public.payment_conditions
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_purchase_orders
ON public.purchase_orders
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_quotations
ON public.quotations
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_representantes
ON public.representantes
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_sales_orders
ON public.sales_orders
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_service_orders
ON public.service_orders
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_stock_movements
ON public.stock_movements
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_suppliers
ON public.suppliers
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_user_permissions
ON public.user_permissions
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY admin_global_all_user_tenants
ON public.user_tenants
FOR ALL
USING (public.is_admin_global_in_tenant(auth.uid(), tenant_id))
WITH CHECK (public.is_admin_global_in_tenant(auth.uid(), tenant_id));

-- child tables (tenant inferred from parent)
DROP POLICY IF EXISTS admin_global_all_inbound_doc_items ON public.inbound_document_items;
CREATE POLICY admin_global_all_inbound_doc_items
ON public.inbound_document_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.inbound_documents d
    WHERE d.id = inbound_document_items.inbound_document_id
      AND public.is_admin_global_in_tenant(auth.uid(), d.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.inbound_documents d
    WHERE d.id = inbound_document_items.inbound_document_id
      AND public.is_admin_global_in_tenant(auth.uid(), d.tenant_id)
  )
);

DROP POLICY IF EXISTS admin_global_all_outbound_doc_items ON public.outbound_document_items;
CREATE POLICY admin_global_all_outbound_doc_items
ON public.outbound_document_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.outbound_documents d
    WHERE d.id = outbound_document_items.outbound_document_id
      AND public.is_admin_global_in_tenant(auth.uid(), d.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.outbound_documents d
    WHERE d.id = outbound_document_items.outbound_document_id
      AND public.is_admin_global_in_tenant(auth.uid(), d.tenant_id)
  )
);

DROP POLICY IF EXISTS admin_global_all_po_items ON public.purchase_order_items;
CREATE POLICY admin_global_all_po_items
ON public.purchase_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
      AND public.is_admin_global_in_tenant(auth.uid(), po.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.purchase_orders po
    WHERE po.id = purchase_order_items.purchase_order_id
      AND public.is_admin_global_in_tenant(auth.uid(), po.tenant_id)
  )
);

DROP POLICY IF EXISTS admin_global_all_quotation_items ON public.quotation_items;
CREATE POLICY admin_global_all_quotation_items
ON public.quotation_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.quotations q
    WHERE q.id = quotation_items.quotation_id
      AND public.is_admin_global_in_tenant(auth.uid(), q.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.quotations q
    WHERE q.id = quotation_items.quotation_id
      AND public.is_admin_global_in_tenant(auth.uid(), q.tenant_id)
  )
);

DROP POLICY IF EXISTS admin_global_all_so_items ON public.sales_order_items;
CREATE POLICY admin_global_all_so_items
ON public.sales_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.sales_orders s
    WHERE s.id = sales_order_items.sales_order_id
      AND public.is_admin_global_in_tenant(auth.uid(), s.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.sales_orders s
    WHERE s.id = sales_order_items.sales_order_id
      AND public.is_admin_global_in_tenant(auth.uid(), s.tenant_id)
  )
);

DROP POLICY IF EXISTS admin_global_all_soi ON public.service_order_items;
CREATE POLICY admin_global_all_soi
ON public.service_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.service_orders s
    WHERE s.id = service_order_items.service_order_id
      AND public.is_admin_global_in_tenant(auth.uid(), s.tenant_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.service_orders s
    WHERE s.id = service_order_items.service_order_id
      AND public.is_admin_global_in_tenant(auth.uid(), s.tenant_id)
  )
);

-- user_roles/profile require null-tenant self rows for admin_global identity
DROP POLICY IF EXISTS admin_global_all_user_roles ON public.user_roles;
CREATE POLICY admin_global_all_user_roles
ON public.user_roles
FOR ALL
USING (
  public.is_admin_global(auth.uid())
  AND (
    (user_roles.tenant_id IS NULL AND user_roles.user_id = auth.uid() AND user_roles.role = 'admin_global')
    OR public.is_admin_global_in_tenant(auth.uid(), user_roles.tenant_id)
  )
)
WITH CHECK (
  public.is_admin_global(auth.uid())
  AND (
    public.is_admin_global_in_tenant(auth.uid(), user_roles.tenant_id)
  )
);

DROP POLICY IF EXISTS admin_global_all_profiles ON public.profiles;
CREATE POLICY admin_global_all_profiles
ON public.profiles
FOR ALL
USING (
  public.is_admin_global(auth.uid())
  AND (
    profiles.auth_id = auth.uid()
    OR public.is_admin_global_in_tenant(auth.uid(), profiles.tenant_id)
  )
)
WITH CHECK (
  public.is_admin_global(auth.uid())
  AND (
    profiles.auth_id = auth.uid()
    OR public.is_admin_global_in_tenant(auth.uid(), profiles.tenant_id)
  )
);

-- keep permissions global reference table readable for admin_global maintenance
DROP POLICY IF EXISTS admin_global_all_permissions ON public.permissions;
CREATE POLICY admin_global_all_permissions
ON public.permissions
FOR ALL
USING (public.is_admin_global(auth.uid()))
WITH CHECK (public.is_admin_global(auth.uid()));