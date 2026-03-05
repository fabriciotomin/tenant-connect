
-- Fix process_outbound_document to ALWAYS assign numero_nf and serie before processing
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
  v_serie_rec record;
  v_numero_nf integer;
  v_serie text;
  i integer;
BEGIN
  SELECT * INTO doc FROM outbound_documents WHERE id = _doc_id AND deleted_at IS NULL;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'PROCESSADO' THEN RAISE EXCEPTION 'Documento já processado'; END IF;

  -- STEP 1: Ensure numero_nf and serie are populated
  IF doc.numero_nf IS NULL OR doc.serie IS NULL THEN
    -- Try to use the serie already on the doc, or fetch default
    v_serie := doc.serie;
    v_numero_nf := doc.numero_nf;

    IF v_serie IS NULL THEN
      SELECT ds.serie, ds.proximo_numero INTO v_serie_rec
      FROM document_series ds
      WHERE ds.tenant_id = doc.tenant_id AND ds.padrao = true AND ds.ativo = true AND ds.deleted_at IS NULL
      LIMIT 1;

      IF v_serie_rec IS NOT NULL THEN
        v_serie := v_serie_rec.serie;
      ELSE
        v_serie := '1';
      END IF;
    END IF;

    IF v_numero_nf IS NULL THEN
      -- Try document_series for this specific serie
      SELECT ds.proximo_numero INTO v_serie_rec
      FROM document_series ds
      WHERE ds.tenant_id = doc.tenant_id AND ds.serie = v_serie AND ds.ativo = true AND ds.deleted_at IS NULL
      LIMIT 1;

      IF v_serie_rec IS NOT NULL AND v_serie_rec.proximo_numero IS NOT NULL THEN
        v_numero_nf := v_serie_rec.proximo_numero;
        -- Increment
        UPDATE document_series SET proximo_numero = proximo_numero + 1
        WHERE tenant_id = doc.tenant_id AND serie = v_serie AND ativo = true AND deleted_at IS NULL;
      ELSE
        -- Fallback: MAX from existing docs for this tenant + serie
        SELECT COALESCE(MAX(od.numero_nf), 0) + 1 INTO v_numero_nf
        FROM outbound_documents od
        WHERE od.tenant_id = doc.tenant_id AND od.serie = v_serie AND od.deleted_at IS NULL;
      END IF;
    ELSE
      -- numero_nf was provided but we still need to advance the series counter past it
      UPDATE document_series SET proximo_numero = GREATEST(proximo_numero, v_numero_nf + 1)
      WHERE tenant_id = doc.tenant_id AND serie = v_serie AND ativo = true AND deleted_at IS NULL;
    END IF;

    -- Persist the numbering on the document
    UPDATE outbound_documents SET numero_nf = v_numero_nf, serie = v_serie WHERE id = _doc_id;
    -- Refresh doc record
    doc.numero_nf := v_numero_nf;
    doc.serie := v_serie;
  ELSE
    -- Both are set; ensure document_series counter is up to date
    UPDATE document_series SET proximo_numero = GREATEST(proximo_numero, doc.numero_nf + 1)
    WHERE tenant_id = doc.tenant_id AND serie = doc.serie AND ativo = true AND deleted_at IS NULL;
  END IF;

  -- Build readable document reference
  v_doc_ref := doc.numero_nf::text || ' - Série ' || COALESCE(doc.serie, '1');

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

  -- Determine payment conditions from outbound document itself
  v_num_parcelas := 1;
  v_intervalo := 30;

  IF doc.condicao_pagamento_id IS NOT NULL THEN
    SELECT pc.numero_parcelas, pc.dias_entre_parcelas
    INTO v_cond
    FROM payment_conditions pc
    WHERE pc.id = doc.condicao_pagamento_id AND pc.deleted_at IS NULL;

    IF v_cond IS NOT NULL THEN
      v_num_parcelas := GREATEST(COALESCE(v_cond.numero_parcelas, 1), 1);
      v_intervalo := GREATEST(COALESCE(v_cond.dias_entre_parcelas, 30), 0);
    END IF;
  ELSIF doc.service_order_id IS NOT NULL THEN
    SELECT pc.numero_parcelas, pc.dias_entre_parcelas
    INTO v_cond
    FROM service_orders so
    JOIN payment_conditions pc ON pc.id = so.condicao_pagamento_id AND pc.deleted_at IS NULL
    WHERE so.id = doc.service_order_id AND so.deleted_at IS NULL;

    IF v_cond IS NOT NULL THEN
      v_num_parcelas := GREATEST(COALESCE(v_cond.numero_parcelas, 1), 1);
      v_intervalo := GREATEST(COALESCE(v_cond.dias_entre_parcelas, 30), 0);
    END IF;
  END IF;

  -- Generate accounts receivable
  v_valor_parcela := ROUND(COALESCE(doc.valor_total, 0) / v_num_parcelas, 2);
  v_valor_restante := COALESCE(doc.valor_total, 0);

  FOR i IN 1..v_num_parcelas LOOP
    IF i = v_num_parcelas THEN
      v_valor_parcela := v_valor_restante;
    END IF;

    INSERT INTO accounts_receivable (tenant_id, cliente_id, documento_origem, valor, data_vencimento, status, forma_pagamento_id)
    VALUES (
      doc.tenant_id,
      doc.cliente_id,
      CASE WHEN v_num_parcelas > 1 THEN v_doc_ref || ' P' || i || '/' || v_num_parcelas
           ELSE v_doc_ref END,
      v_valor_parcela,
      COALESCE(doc.data_emissao, CURRENT_DATE) + (i * v_intervalo * INTERVAL '1 day'),
      'ABERTO',
      doc.forma_pagamento_id
    );

    v_valor_restante := v_valor_restante - v_valor_parcela;
  END LOOP;

  UPDATE outbound_documents SET status = 'PROCESSADO' WHERE id = _doc_id;
END;
$function$;
