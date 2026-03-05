
CREATE OR REPLACE FUNCTION public.process_outbound_document(_doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc record;
  line record;
  v_custo_medio numeric;
  v_item_tipo text;
  v_doc_ref text;
  v_cond record;
  v_num_parcelas integer;
  v_intervalo integer;
  v_valor_parcela numeric;
  v_valor_restante numeric;
  i integer;
BEGIN
  SELECT * INTO doc FROM outbound_documents WHERE id = _doc_id AND deleted_at IS NULL;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'PROCESSADO' THEN RAISE EXCEPTION 'Documento já processado'; END IF;

  -- Build readable document reference
  IF doc.numero_nf IS NOT NULL THEN
    v_doc_ref := doc.numero_nf::text || ' - Série ' || COALESCE(doc.serie, '1');
  ELSE
    v_doc_ref := 'NS-' || doc.id::text;
  END IF;

  -- Process stock movements
  FOR line IN SELECT * FROM outbound_document_items WHERE outbound_document_id = _doc_id AND deleted_at IS NULL LOOP
    SELECT COALESCE(i.custo_medio, 0), i.tipo_item
    INTO v_custo_medio, v_item_tipo
    FROM items i WHERE i.id = line.item_id AND i.deleted_at IS NULL;

    IF v_item_tipo IS NULL OR v_item_tipo != 'SERVICO' THEN
      INSERT INTO stock_movements (item_id, tenant_id, tipo, quantidade, documento_origem, custo_unitario)
      VALUES (line.item_id, doc.tenant_id, 'SAIDA', line.quantidade, v_doc_ref, v_custo_medio);

      UPDATE items SET saldo_estoque = COALESCE(saldo_estoque, 0) - line.quantidade
      WHERE id = line.item_id AND deleted_at IS NULL;
    END IF;
  END LOOP;

  -- Determine payment conditions from linked service order
  v_num_parcelas := 1;
  v_intervalo := 30;

  IF doc.service_order_id IS NOT NULL THEN
    SELECT pc.numero_parcelas, pc.dias_entre_parcelas
    INTO v_cond
    FROM service_orders so
    JOIN payment_conditions pc ON pc.id = so.condicao_pagamento_id AND pc.deleted_at IS NULL
    WHERE so.id = doc.service_order_id AND so.deleted_at IS NULL;

    IF v_cond IS NOT NULL THEN
      v_num_parcelas := GREATEST(COALESCE(v_cond.numero_parcelas, 1), 1);
      v_intervalo := GREATEST(COALESCE(v_cond.dias_entre_parcelas, 30), 1);
    END IF;
  END IF;

  -- Generate accounts receivable (single or installments)
  v_valor_parcela := ROUND(COALESCE(doc.valor_total, 0) / v_num_parcelas, 2);
  v_valor_restante := COALESCE(doc.valor_total, 0);

  FOR i IN 1..v_num_parcelas LOOP
    IF i = v_num_parcelas THEN
      -- Last installment gets the remainder to avoid rounding issues
      v_valor_parcela := v_valor_restante;
    END IF;

    INSERT INTO accounts_receivable (tenant_id, cliente_id, documento_origem, valor, data_vencimento, status)
    VALUES (
      doc.tenant_id,
      doc.cliente_id,
      CASE WHEN v_num_parcelas > 1 THEN v_doc_ref || ' P' || i || '/' || v_num_parcelas
           ELSE v_doc_ref END,
      v_valor_parcela,
      COALESCE(doc.data_emissao, CURRENT_DATE) + (i * v_intervalo * INTERVAL '1 day'),
      'ABERTO'
    );

    v_valor_restante := v_valor_restante - v_valor_parcela;
  END LOOP;

  UPDATE outbound_documents SET status = 'PROCESSADO' WHERE id = _doc_id;
END;
$function$;
