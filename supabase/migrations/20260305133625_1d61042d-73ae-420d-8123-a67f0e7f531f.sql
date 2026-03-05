
-- Add payment fields to quotations, sales_orders, outbound_documents
ALTER TABLE public.quotations 
  ADD COLUMN IF NOT EXISTS condicao_pagamento_id uuid REFERENCES public.payment_conditions(id),
  ADD COLUMN IF NOT EXISTS forma_pagamento_id uuid REFERENCES public.formas_pagamento(id);

ALTER TABLE public.sales_orders 
  ADD COLUMN IF NOT EXISTS condicao_pagamento_id uuid REFERENCES public.payment_conditions(id),
  ADD COLUMN IF NOT EXISTS forma_pagamento_id uuid REFERENCES public.formas_pagamento(id);

ALTER TABLE public.outbound_documents 
  ADD COLUMN IF NOT EXISTS condicao_pagamento_id uuid REFERENCES public.payment_conditions(id),
  ADD COLUMN IF NOT EXISTS forma_pagamento_id uuid REFERENCES public.formas_pagamento(id);

-- Add forma_pagamento_id to accounts_receivable for traceability
ALTER TABLE public.accounts_receivable 
  ADD COLUMN IF NOT EXISTS forma_pagamento_id uuid REFERENCES public.formas_pagamento(id);

-- Update process_outbound_document to use outbound doc's own payment fields
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
    -- Fallback: try from linked service order
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

  -- Generate accounts receivable (single or installments)
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

-- Update cancel function to also match by documento_origem LIKE pattern for installments
CREATE OR REPLACE FUNCTION public.cancel_outbound_document(_doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc record;
  line record;
  v_item_tipo text;
  v_doc_ref text;
BEGIN
  SELECT * INTO doc FROM outbound_documents WHERE id = _doc_id AND deleted_at IS NULL;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'CANCELADO' THEN RAISE EXCEPTION 'Documento já cancelado'; END IF;

  IF doc.numero_nf IS NOT NULL THEN
    v_doc_ref := doc.numero_nf::text || ' - Série ' || COALESCE(doc.serie, '1');
  ELSE
    v_doc_ref := 'NS-' || doc.id::text;
  END IF;

  IF doc.status = 'PROCESSADO' THEN
    FOR line IN
      SELECT sm.id as mov_id, sm.item_id, sm.quantidade
      FROM stock_movements sm
      WHERE sm.documento_origem = v_doc_ref
        AND sm.tenant_id = doc.tenant_id
        AND sm.tipo = 'SAIDA'
        AND sm.deleted_at IS NULL
    LOOP
      UPDATE stock_movements SET deleted_at = now() WHERE id = line.mov_id;

      SELECT tipo_item INTO v_item_tipo FROM items WHERE id = line.item_id AND deleted_at IS NULL;
      IF v_item_tipo IS NULL OR v_item_tipo != 'SERVICO' THEN
        UPDATE items SET saldo_estoque = COALESCE(saldo_estoque, 0) + line.quantidade
        WHERE id = line.item_id AND deleted_at IS NULL;
      END IF;
    END LOOP;

    -- Soft-delete linked accounts receivable (match exact ref or installment pattern)
    UPDATE accounts_receivable
    SET deleted_at = now()
    WHERE tenant_id = doc.tenant_id
      AND (documento_origem = v_doc_ref OR documento_origem LIKE v_doc_ref || ' P%')
      AND deleted_at IS NULL;
  ELSE
    UPDATE outbound_document_items SET deleted_at = now()
    WHERE outbound_document_id = _doc_id AND deleted_at IS NULL;
  END IF;

  UPDATE outbound_documents SET status = 'CANCELADO' WHERE id = _doc_id;
END;
$function$;
