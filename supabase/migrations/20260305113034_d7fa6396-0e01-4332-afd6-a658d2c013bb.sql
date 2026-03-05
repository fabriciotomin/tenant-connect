
-- 1) Create function to confirm OS by generating an outbound document
CREATE OR REPLACE FUNCTION public.confirm_service_order(_os_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_os record;
  v_doc_id uuid;
  v_line record;
BEGIN
  SELECT * INTO v_os FROM service_orders WHERE id = _os_id AND deleted_at IS NULL;
  IF v_os IS NULL THEN RAISE EXCEPTION 'OS não encontrada'; END IF;
  IF v_os.status != 'RASCUNHO' THEN RAISE EXCEPTION 'OS não está em RASCUNHO'; END IF;

  -- Create outbound document linked to the OS customer
  INSERT INTO outbound_documents (tenant_id, cliente_id, data_emissao, valor_total, status)
  VALUES (v_os.tenant_id, v_os.customer_id, CURRENT_DATE, COALESCE(v_os.valor_total, 0), 'PENDENTE')
  RETURNING id INTO v_doc_id;

  -- Copy OS items to outbound document items
  FOR v_line IN SELECT * FROM service_order_items WHERE service_order_id = _os_id AND deleted_at IS NULL LOOP
    INSERT INTO outbound_document_items (outbound_document_id, item_id, quantidade, valor_unitario, tenant_id)
    VALUES (v_doc_id, v_line.item_id, COALESCE(v_line.quantidade, 0), COALESCE(v_line.valor_unitario, 0), v_os.tenant_id);
  END LOOP;

  -- Update OS status to CONFIRMADO
  UPDATE service_orders SET status = 'CONFIRMADO', updated_at = now() WHERE id = _os_id;

  RETURN v_doc_id;
END;
$$;

-- 2) Update process_inbound_document to set linked PO status to ATENDIDO
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

  -- NEW: Update linked purchase order status to ATENDIDO
  IF doc.purchase_order_id IS NOT NULL THEN
    UPDATE purchase_orders 
    SET status = 'ATENDIDO', updated_at = now()
    WHERE id = doc.purchase_order_id 
      AND deleted_at IS NULL
      AND status != 'CANCELADO';
  END IF;
END;
$$;
