
-- Add financial classification columns to stock_movements
ALTER TABLE public.stock_movements 
  ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id),
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id);

-- Add financial classification columns to accounts_receivable
ALTER TABLE public.accounts_receivable
  ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id),
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id);

-- Add financial classification columns to outbound_document_items
ALTER TABLE public.outbound_document_items
  ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id),
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id);

-- Update confirm_service_order to copy financial classification and load from item if missing
CREATE OR REPLACE FUNCTION public.confirm_service_order(_os_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_os record;
  v_doc_id uuid;
  v_line record;
  v_serie_rec record;
  v_numero_nf integer;
  v_serie text;
  v_nat_id uuid;
  v_cc_id uuid;
BEGIN
  SELECT * INTO v_os FROM service_orders WHERE id = _os_id AND deleted_at IS NULL;
  IF v_os IS NULL THEN RAISE EXCEPTION 'OS não encontrada'; END IF;
  IF v_os.status != 'RASCUNHO' THEN RAISE EXCEPTION 'OS não está em RASCUNHO'; END IF;

  SELECT ds.serie, ds.proximo_numero INTO v_serie_rec
  FROM document_series ds
  WHERE ds.tenant_id = v_os.tenant_id AND ds.padrao = true AND ds.ativo = true AND ds.deleted_at IS NULL
  LIMIT 1;

  IF v_serie_rec IS NOT NULL THEN
    v_serie := v_serie_rec.serie;
    v_numero_nf := v_serie_rec.proximo_numero;
    UPDATE document_series SET proximo_numero = proximo_numero + 1
    WHERE tenant_id = v_os.tenant_id AND padrao = true AND ativo = true AND deleted_at IS NULL;
  ELSE
    SELECT COALESCE(MAX(numero_nf), 0) + 1 INTO v_numero_nf
    FROM outbound_documents WHERE tenant_id = v_os.tenant_id AND deleted_at IS NULL;
    v_serie := '1';
  END IF;

  INSERT INTO outbound_documents (tenant_id, cliente_id, data_emissao, valor_total, status, service_order_id, numero_nf, serie, condicao_pagamento_id)
  VALUES (v_os.tenant_id, v_os.customer_id, CURRENT_DATE, COALESCE(v_os.valor_total, 0), 'PENDENTE', _os_id, v_numero_nf, v_serie, v_os.condicao_pagamento_id)
  RETURNING id INTO v_doc_id;

  FOR v_line IN SELECT * FROM service_order_items WHERE service_order_id = _os_id AND deleted_at IS NULL LOOP
    -- Use OS item classification, fallback to item registration (sale classification)
    v_nat_id := v_line.natureza_financeira_id;
    v_cc_id := v_line.centro_custo_id;
    
    IF v_nat_id IS NULL THEN
      SELECT natureza_venda_id INTO v_nat_id FROM items WHERE id = v_line.item_id AND deleted_at IS NULL;
    END IF;
    IF v_cc_id IS NULL THEN
      SELECT centro_custo_venda_id INTO v_cc_id FROM items WHERE id = v_line.item_id AND deleted_at IS NULL;
    END IF;

    INSERT INTO outbound_document_items (outbound_document_id, item_id, quantidade, valor_unitario, tenant_id, natureza_financeira_id, centro_custo_id)
    VALUES (v_doc_id, v_line.item_id, COALESCE(v_line.quantidade, 0), COALESCE(v_line.valor_unitario, 0), v_os.tenant_id, v_nat_id, v_cc_id);
  END LOOP;

  UPDATE service_orders SET status = 'CONFIRMADO', updated_at = now() WHERE id = _os_id;

  RETURN v_doc_id;
END;
$function$;

-- Update process_outbound_document to pass classification to stock_movements and accounts_receivable
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
  v_first_nat_id uuid;
  v_first_cc_id uuid;
  v_nat_id uuid;
  v_cc_id uuid;
  i integer;
BEGIN
  SELECT * INTO doc FROM outbound_documents WHERE id = _doc_id AND deleted_at IS NULL;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'PROCESSADO' THEN RAISE EXCEPTION 'Documento já processado'; END IF;

  -- STEP 1: Ensure numero_nf and serie are populated
  IF doc.numero_nf IS NULL OR doc.serie IS NULL THEN
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
      SELECT ds.proximo_numero INTO v_serie_rec
      FROM document_series ds
      WHERE ds.tenant_id = doc.tenant_id AND ds.serie = v_serie AND ds.ativo = true AND ds.deleted_at IS NULL
      LIMIT 1;

      IF v_serie_rec IS NOT NULL AND v_serie_rec.proximo_numero IS NOT NULL THEN
        v_numero_nf := v_serie_rec.proximo_numero;
        UPDATE document_series SET proximo_numero = proximo_numero + 1
        WHERE tenant_id = doc.tenant_id AND serie = v_serie AND ativo = true AND deleted_at IS NULL;
      ELSE
        SELECT COALESCE(MAX(od.numero_nf), 0) + 1 INTO v_numero_nf
        FROM outbound_documents od
        WHERE od.tenant_id = doc.tenant_id AND od.serie = v_serie AND od.deleted_at IS NULL;
      END IF;
    ELSE
      UPDATE document_series SET proximo_numero = GREATEST(proximo_numero, v_numero_nf + 1)
      WHERE tenant_id = doc.tenant_id AND serie = v_serie AND ativo = true AND deleted_at IS NULL;
    END IF;

    UPDATE outbound_documents SET numero_nf = v_numero_nf, serie = v_serie WHERE id = _doc_id;
    doc.numero_nf := v_numero_nf;
    doc.serie := v_serie;
  ELSE
    UPDATE document_series SET proximo_numero = GREATEST(proximo_numero, doc.numero_nf + 1)
    WHERE tenant_id = doc.tenant_id AND serie = doc.serie AND ativo = true AND deleted_at IS NULL;
  END IF;

  v_doc_ref := doc.numero_nf::text || ' - Série ' || COALESCE(doc.serie, '1');

  -- Capture first item's financial classification for accounts receivable
  SELECT odi.natureza_financeira_id, odi.centro_custo_id
  INTO v_first_nat_id, v_first_cc_id
  FROM outbound_document_items odi
  WHERE odi.outbound_document_id = _doc_id AND odi.deleted_at IS NULL
    AND (odi.natureza_financeira_id IS NOT NULL OR odi.centro_custo_id IS NOT NULL)
  LIMIT 1;

  -- Process stock movements with financial classification
  FOR line IN SELECT * FROM outbound_document_items WHERE outbound_document_id = _doc_id AND deleted_at IS NULL LOOP
    SELECT COALESCE(i.custo_medio, 0), i.tipo_item
    INTO v_custo_medio, v_item_tipo
    FROM items i WHERE i.id = line.item_id AND i.deleted_at IS NULL;

    -- Resolve financial classification: item line -> item registration fallback
    v_nat_id := line.natureza_financeira_id;
    v_cc_id := line.centro_custo_id;
    IF v_nat_id IS NULL THEN
      SELECT natureza_venda_id INTO v_nat_id FROM items WHERE id = line.item_id AND deleted_at IS NULL;
    END IF;
    IF v_cc_id IS NULL THEN
      SELECT centro_custo_venda_id INTO v_cc_id FROM items WHERE id = line.item_id AND deleted_at IS NULL;
    END IF;

    IF v_item_tipo IS NULL OR v_item_tipo != 'SERVICO' THEN
      INSERT INTO stock_movements (item_id, tenant_id, tipo, quantidade, documento_origem, custo_unitario, natureza_financeira_id, centro_custo_id)
      VALUES (line.item_id, doc.tenant_id, 'SAIDA', line.quantidade, v_doc_ref, v_custo_medio, v_nat_id, v_cc_id);

      UPDATE items SET saldo_estoque = COALESCE(saldo_estoque, 0) - line.quantidade
      WHERE id = line.item_id AND deleted_at IS NULL;
    END IF;
  END LOOP;

  -- Use first item classification as fallback for receivables
  IF v_first_nat_id IS NULL THEN
    SELECT natureza_venda_id INTO v_first_nat_id FROM items i
    JOIN outbound_document_items odi ON odi.item_id = i.id
    WHERE odi.outbound_document_id = _doc_id AND odi.deleted_at IS NULL AND i.natureza_venda_id IS NOT NULL
    LIMIT 1;
  END IF;
  IF v_first_cc_id IS NULL THEN
    SELECT centro_custo_venda_id INTO v_first_cc_id FROM items i
    JOIN outbound_document_items odi ON odi.item_id = i.id
    WHERE odi.outbound_document_id = _doc_id AND odi.deleted_at IS NULL AND i.centro_custo_venda_id IS NOT NULL
    LIMIT 1;
  END IF;

  -- Determine payment conditions
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

  -- Generate accounts receivable with financial classification
  v_valor_parcela := ROUND(COALESCE(doc.valor_total, 0) / v_num_parcelas, 2);
  v_valor_restante := COALESCE(doc.valor_total, 0);

  FOR i IN 1..v_num_parcelas LOOP
    IF i = v_num_parcelas THEN
      v_valor_parcela := v_valor_restante;
    END IF;

    INSERT INTO accounts_receivable (tenant_id, cliente_id, documento_origem, valor, data_vencimento, status, forma_pagamento_id, natureza_financeira_id, centro_custo_id)
    VALUES (
      doc.tenant_id,
      doc.cliente_id,
      CASE WHEN v_num_parcelas > 1 THEN v_doc_ref || ' P' || i || '/' || v_num_parcelas
           ELSE v_doc_ref END,
      v_valor_parcela,
      COALESCE(doc.data_emissao, CURRENT_DATE) + (i * v_intervalo * INTERVAL '1 day'),
      'ABERTO',
      doc.forma_pagamento_id,
      v_first_nat_id,
      v_first_cc_id
    );

    v_valor_restante := v_valor_restante - v_valor_parcela;
  END LOOP;

  UPDATE outbound_documents SET status = 'PROCESSADO' WHERE id = _doc_id;
END;
$function$;
