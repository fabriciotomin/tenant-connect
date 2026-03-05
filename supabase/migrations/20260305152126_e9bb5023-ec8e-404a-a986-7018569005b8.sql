
-- Add financial classification columns to inbound_document_items
ALTER TABLE public.inbound_document_items
  ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id),
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id);

-- Update process_inbound_document to propagate financial classification to stock_movements
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
  v_nat_id uuid;
  v_cc_id uuid;
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

    -- Resolve financial classification: document item -> item registration (purchase) fallback
    v_nat_id := line.natureza_financeira_id;
    v_cc_id := line.centro_custo_id;
    IF v_nat_id IS NULL THEN
      SELECT natureza_financeira_id INTO v_nat_id FROM items WHERE id = line.item_id AND deleted_at IS NULL;
    END IF;
    IF v_cc_id IS NULL THEN
      SELECT centro_custo_id INTO v_cc_id FROM items WHERE id = line.item_id AND deleted_at IS NULL;
    END IF;

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

    INSERT INTO stock_movements (item_id, tenant_id, tipo, quantidade, documento_origem, custo_unitario, natureza_financeira_id, centro_custo_id)
    VALUES (line.item_id, doc.tenant_id, 'ENTRADA', line.quantidade, 'NE-' || doc.numero, v_custo_unitario, v_nat_id, v_cc_id);

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

  -- Generate accounts payable
  INSERT INTO accounts_payable (tenant_id, supplier_id, descricao, valor, data_vencimento, status)
  VALUES (
    doc.tenant_id,
    doc.fornecedor_id,
    'NE-' || COALESCE(doc.numero, doc.id::text),
    COALESCE(doc.valor_total, v_total_valor + v_frete_total),
    COALESCE(doc.data_emissao, CURRENT_DATE) + INTERVAL '30 days',
    'pendente'
  );

  UPDATE inbound_documents SET status = 'PROCESSADO' WHERE id = _doc_id;

  IF doc.purchase_order_id IS NOT NULL THEN
    UPDATE purchase_orders 
    SET status = 'ATENDIDO', updated_at = now()
    WHERE id = doc.purchase_order_id 
      AND deleted_at IS NULL
      AND status != 'CANCELADO';
  END IF;
END;
$function$;
