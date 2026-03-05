
-- 1. Add custo_unitario column to stock_movements for historical cost tracking
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS custo_unitario numeric DEFAULT 0;

-- 2. Replace process_inbound_document with freight proration and custo_medio update
CREATE OR REPLACE FUNCTION public.process_inbound_document(_doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
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
  SELECT * INTO doc FROM inbound_documents WHERE id = _doc_id;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'PROCESSADO' THEN RAISE EXCEPTION 'Documento já processado'; END IF;

  -- Calculate total value of all items for freight proration base
  SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
  INTO v_total_valor
  FROM inbound_document_items WHERE inbound_document_id = _doc_id;

  -- Get freight from linked purchase order if exists
  v_frete_total := 0;
  IF doc.purchase_order_id IS NOT NULL THEN
    SELECT COALESCE(valor_frete, 0) INTO v_frete_total
    FROM purchase_orders WHERE id = doc.purchase_order_id;
  END IF;

  FOR line IN SELECT * FROM inbound_document_items WHERE inbound_document_id = _doc_id LOOP
    -- Get item type
    SELECT tipo_item INTO v_item_tipo FROM items WHERE id = line.item_id;

    -- Prorate freight proportionally by item value
    IF v_total_valor > 0 THEN
      v_frete_rateado := v_frete_total * (line.quantidade * line.valor_unitario) / v_total_valor;
    ELSE
      v_frete_rateado := 0;
    END IF;

    -- Cost = (valor_unitario * quantidade + impostos + frete_rateado) / quantidade
    IF line.quantidade > 0 THEN
      v_custo_unitario := (line.valor_unitario * line.quantidade + COALESCE(line.impostos, 0) + v_frete_rateado) / line.quantidade;
    ELSE
      v_custo_unitario := line.valor_unitario;
    END IF;

    -- Create stock movement with cost
    INSERT INTO stock_movements (item_id, tenant_id, tipo, quantidade, documento_origem, custo_unitario)
    VALUES (line.item_id, doc.tenant_id, 'ENTRADA', line.quantidade, 'NE-' || doc.numero, v_custo_unitario);

    -- Update stock and custo_medio only for non-service items
    IF v_item_tipo IS NULL OR v_item_tipo != 'SERVICO' THEN
      SELECT COALESCE(saldo_estoque, 0), COALESCE(custo_medio, 0)
      INTO v_old_saldo, v_old_custo
      FROM items WHERE id = line.item_id;

      v_new_saldo := v_old_saldo + line.quantidade;

      -- Weighted average cost
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
$$;

-- 3. Function to recalculate costs for already-processed inbound documents for a tenant
CREATE OR REPLACE FUNCTION public.recalc_inbound_costs(_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  doc record;
  line record;
  v_total_valor numeric;
  v_frete_total numeric;
  v_frete_rateado numeric;
  v_custo_unitario numeric;
  v_item_tipo text;
BEGIN
  -- Loop through all processed inbound documents for this tenant
  FOR doc IN
    SELECT d.*, COALESCE(po.valor_frete, 0) as frete
    FROM inbound_documents d
    LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id
    WHERE d.tenant_id = _tenant_id AND d.status = 'PROCESSADO'
    ORDER BY d.created_at
  LOOP
    -- Total value for proration
    SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
    INTO v_total_valor
    FROM inbound_document_items WHERE inbound_document_id = doc.id;

    v_frete_total := doc.frete;

    FOR line IN SELECT * FROM inbound_document_items WHERE inbound_document_id = doc.id LOOP
      SELECT tipo_item INTO v_item_tipo FROM items WHERE id = line.item_id;

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

      -- Update existing stock movements for this document/item
      UPDATE stock_movements
      SET custo_unitario = v_custo_unitario
      WHERE item_id = line.item_id
        AND tenant_id = _tenant_id
        AND documento_origem = 'NE-' || doc.numero
        AND tipo = 'ENTRADA';
    END LOOP;
  END LOOP;

  -- Recalculate custo_medio for all non-service items based on all ENTRADA movements
  UPDATE items i
  SET custo_medio = sub.avg_cost
  FROM (
    SELECT sm.item_id,
           CASE WHEN SUM(sm.quantidade) > 0
                THEN SUM(sm.custo_unitario * sm.quantidade) / SUM(sm.quantidade)
                ELSE 0
           END as avg_cost
    FROM stock_movements sm
    WHERE sm.tenant_id = _tenant_id AND sm.tipo = 'ENTRADA'
    GROUP BY sm.item_id
  ) sub
  WHERE i.id = sub.item_id
    AND i.tenant_id = _tenant_id
    AND (i.tipo_item IS NULL OR i.tipo_item != 'SERVICO');
END;
$$;
