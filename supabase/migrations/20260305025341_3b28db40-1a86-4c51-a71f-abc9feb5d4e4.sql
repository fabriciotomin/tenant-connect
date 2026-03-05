
-- Update process_inbound_document to also generate accounts_payable
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

  -- Generate accounts payable: one record for the full document value
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
END;
$$;

-- Create cancel_inbound_document function with full reversal via soft delete
CREATE OR REPLACE FUNCTION public.cancel_inbound_document(_doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  doc record;
  line record;
  v_old_saldo numeric;
  v_item_tipo text;
BEGIN
  SELECT * INTO doc FROM inbound_documents WHERE id = _doc_id AND deleted_at IS NULL;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'CANCELADO' THEN RAISE EXCEPTION 'Documento já cancelado'; END IF;

  -- If document was PROCESSADO, reverse stock and financials
  IF doc.status = 'PROCESSADO' THEN
    -- Reverse stock: soft-delete movements and subtract quantities
    FOR line IN
      SELECT sm.id as mov_id, sm.item_id, sm.quantidade
      FROM stock_movements sm
      WHERE sm.documento_origem = 'NE-' || doc.numero
        AND sm.tenant_id = doc.tenant_id
        AND sm.tipo = 'ENTRADA'
        AND sm.deleted_at IS NULL
    LOOP
      -- Soft-delete the movement
      UPDATE stock_movements SET deleted_at = now() WHERE id = line.mov_id;

      -- Reverse stock balance for non-service items
      SELECT tipo_item INTO v_item_tipo FROM items WHERE id = line.item_id AND deleted_at IS NULL;
      IF v_item_tipo IS NULL OR v_item_tipo != 'SERVICO' THEN
        UPDATE items
        SET saldo_estoque = COALESCE(saldo_estoque, 0) - line.quantidade
        WHERE id = line.item_id AND deleted_at IS NULL;
      END IF;
    END LOOP;

    -- Soft-delete linked accounts payable
    UPDATE accounts_payable
    SET deleted_at = now()
    WHERE supplier_id = doc.fornecedor_id
      AND tenant_id = doc.tenant_id
      AND descricao = 'NE-' || COALESCE(doc.numero, doc.id::text)
      AND deleted_at IS NULL;
  ELSE
    -- PENDENTE: soft-delete items
    UPDATE inbound_document_items
    SET deleted_at = now()
    WHERE inbound_document_id = _doc_id AND deleted_at IS NULL;
  END IF;

  -- Mark document as cancelled
  UPDATE inbound_documents SET status = 'CANCELADO' WHERE id = _doc_id;
END;
$$;
