
-- Add deleted_at column to all 35 tables for soft delete
-- Tables that need deleted_at added:

ALTER TABLE public.accounting_periods ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.accounts_payable ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.accounts_receivable ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.bank_movements ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.comissoes ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.cost_centers ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.document_series ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.financial_natures ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.formas_pagamento ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.inbound_document_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.inbound_documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.item_categories ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.item_groups ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.outbound_document_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.outbound_documents ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.payment_conditions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.permissions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.quotation_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.representantes ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.service_order_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.service_orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.unidades_medida ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.user_permissions ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Create indexes for performance on soft delete queries
CREATE INDEX IF NOT EXISTS idx_accounts_payable_deleted ON public.accounts_payable(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_receivable_deleted ON public.accounts_receivable(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_banks_deleted ON public.banks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_deleted ON public.customers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted ON public.suppliers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_items_deleted ON public.items(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_item_groups_deleted ON public.item_groups(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_deleted ON public.purchase_orders(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_inbound_documents_deleted ON public.inbound_documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outbound_documents_deleted ON public.outbound_documents(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_deleted ON public.quotations(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_orders_deleted ON public.sales_orders(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_service_orders_deleted ON public.service_orders(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stock_movements_deleted ON public.stock_movements(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_financial_natures_deleted ON public.financial_natures(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_cost_centers_deleted ON public.cost_centers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_deleted ON public.formas_pagamento(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payment_conditions_deleted ON public.payment_conditions(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_document_series_deleted ON public.document_series(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_unidades_medida_deleted ON public.unidades_medida(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bank_movements_deleted ON public.bank_movements(deleted_at) WHERE deleted_at IS NULL;

-- Update process_inbound_document to respect soft delete
CREATE OR REPLACE FUNCTION public.process_inbound_document(_doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc record;
  line record;
  v_total_valor numeric;
  v_frete_total numeric;
  v_frete_rateado numeric;
  v_custo_unitario numeric;
  v_item_tipo text;
  v_old_saldo numeric;
  v_old_custo numeric;
  v_new_saldo numeric;
  v_new_custo numeric;
BEGIN
  SELECT * INTO doc FROM inbound_documents WHERE id = _doc_id AND deleted_at IS NULL;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'PROCESSADO' THEN RAISE EXCEPTION 'Documento já processado'; END IF;

  SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
  INTO v_total_valor
  FROM inbound_document_items WHERE inbound_document_id = _doc_id AND deleted_at IS NULL;

  v_frete_total := 0;
  IF doc.purchase_order_id IS NOT NULL THEN
    SELECT COALESCE(valor_frete, 0) INTO v_frete_total
    FROM purchase_orders WHERE id = doc.purchase_order_id AND deleted_at IS NULL;
  END IF;

  FOR line IN SELECT * FROM inbound_document_items WHERE inbound_document_id = _doc_id AND deleted_at IS NULL LOOP
    SELECT tipo_item INTO v_item_tipo FROM items WHERE id = line.item_id AND deleted_at IS NULL;

    IF v_total_valor > 0 THEN
      v_frete_rateado := v_frete_total * (line.quantidade * line.valor_unitario) / v_total_valor;
    ELSE
      v_frete_rateado := 0;
    END IF;

    IF line.quantidade > 0 THEN
      v_custo_unitario := (line.valor_unitario * line.quantidade + COALESCE(line.impostos, 0) + v_frete_rateado) / line.quantidade;
    ELSE
      v_custo_unitario := line.valor_unitario;
    END IF;

    INSERT INTO stock_movements (item_id, tenant_id, tipo, quantidade, documento_origem, custo_unitario)
    VALUES (line.item_id, doc.tenant_id, 'ENTRADA', line.quantidade, 'NE-' || doc.numero, v_custo_unitario);

    IF v_item_tipo IS NULL OR v_item_tipo != 'SERVICO' THEN
      SELECT COALESCE(saldo_estoque, 0), COALESCE(custo_medio, 0)
      INTO v_old_saldo, v_old_custo
      FROM items WHERE id = line.item_id;

      v_new_saldo := v_old_saldo + line.quantidade;

      IF v_new_saldo > 0 THEN
        v_new_custo := (v_old_custo * v_old_saldo + v_custo_unitario * line.quantidade) / v_new_saldo;
      ELSE
        v_new_custo := v_custo_unitario;
      END IF;

      UPDATE items
      SET saldo_estoque = v_new_saldo,
          custo_medio = v_new_custo
      WHERE id = line.item_id;
    END IF;
  END LOOP;

  UPDATE inbound_documents SET status = 'PROCESSADO' WHERE id = _doc_id;
END;
$function$;

-- Update process_outbound_document to respect soft delete
CREATE OR REPLACE FUNCTION public.process_outbound_document(_doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc record;
  line record;
BEGIN
  SELECT * INTO doc FROM outbound_documents WHERE id = _doc_id AND deleted_at IS NULL;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'PROCESSADO' THEN RAISE EXCEPTION 'Documento já processado'; END IF;

  FOR line IN SELECT * FROM outbound_document_items WHERE outbound_document_id = _doc_id AND deleted_at IS NULL LOOP
    INSERT INTO stock_movements (item_id, tenant_id, tipo, quantidade, documento_origem)
    VALUES (line.item_id, doc.tenant_id, 'SAIDA', line.quantidade, 'NS-' || COALESCE(doc.numero_nf::text, doc.id::text));

    UPDATE items SET saldo_estoque = COALESCE(saldo_estoque, 0) - line.quantidade
    WHERE id = line.item_id;
  END LOOP;

  UPDATE outbound_documents SET status = 'PROCESSADO' WHERE id = _doc_id;
END;
$function$;

-- Update recalc_inbound_costs to respect soft delete
CREATE OR REPLACE FUNCTION public.recalc_inbound_costs(_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc record;
  line record;
  v_total_valor numeric;
  v_frete_total numeric;
  v_frete_rateado numeric;
  v_custo_unitario numeric;
  v_item_tipo text;
BEGIN
  FOR doc IN
    SELECT d.*, COALESCE(po.valor_frete, 0) as frete
    FROM inbound_documents d
    LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id AND po.deleted_at IS NULL
    WHERE d.tenant_id = _tenant_id AND d.status = 'PROCESSADO' AND d.deleted_at IS NULL
    ORDER BY d.created_at
  LOOP
    SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
    INTO v_total_valor
    FROM inbound_document_items WHERE inbound_document_id = doc.id AND deleted_at IS NULL;

    v_frete_total := doc.frete;

    FOR line IN SELECT * FROM inbound_document_items WHERE inbound_document_id = doc.id AND deleted_at IS NULL LOOP
      SELECT tipo_item INTO v_item_tipo FROM items WHERE id = line.item_id AND deleted_at IS NULL;

      IF v_total_valor > 0 THEN
        v_frete_rateado := v_frete_total * (line.quantidade * line.valor_unitario) / v_total_valor;
      ELSE
        v_frete_rateado := 0;
      END IF;

      IF line.quantidade > 0 THEN
        v_custo_unitario := (line.valor_unitario * line.quantidade + COALESCE(line.impostos, 0) + v_frete_rateado) / line.quantidade;
      ELSE
        v_custo_unitario := line.valor_unitario;
      END IF;

      UPDATE stock_movements
      SET custo_unitario = v_custo_unitario
      WHERE item_id = line.item_id
        AND tenant_id = _tenant_id
        AND documento_origem = 'NE-' || doc.numero
        AND tipo = 'ENTRADA'
        AND deleted_at IS NULL;
    END LOOP;
  END LOOP;

  UPDATE items i
  SET custo_medio = sub.avg_cost
  FROM (
    SELECT sm.item_id,
           CASE WHEN SUM(sm.quantidade) > 0
                THEN SUM(sm.custo_unitario * sm.quantidade) / SUM(sm.quantidade)
                ELSE 0
           END as avg_cost
    FROM stock_movements sm
    WHERE sm.tenant_id = _tenant_id AND sm.tipo = 'ENTRADA' AND sm.deleted_at IS NULL
    GROUP BY sm.item_id
  ) sub
  WHERE i.id = sub.item_id
    AND i.tenant_id = _tenant_id
    AND i.deleted_at IS NULL
    AND (i.tipo_item IS NULL OR i.tipo_item != 'SERVICO');
END;
$function$;
