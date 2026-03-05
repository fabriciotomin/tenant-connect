
CREATE OR REPLACE FUNCTION public.process_outbound_document(_doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  doc record;
  line record;
  v_custo_medio numeric;
BEGIN
  SELECT * INTO doc FROM outbound_documents WHERE id = _doc_id AND deleted_at IS NULL;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'PROCESSADO' THEN RAISE EXCEPTION 'Documento já processado'; END IF;

  FOR line IN SELECT * FROM outbound_document_items WHERE outbound_document_id = _doc_id AND deleted_at IS NULL LOOP
    -- Fetch current custo_medio from items
    SELECT COALESCE(i.custo_medio, 0) INTO v_custo_medio
    FROM items i WHERE i.id = line.item_id AND i.deleted_at IS NULL;

    INSERT INTO stock_movements (item_id, tenant_id, tipo, quantidade, documento_origem, custo_unitario)
    VALUES (line.item_id, doc.tenant_id, 'SAIDA', line.quantidade,
            'NS-' || COALESCE(doc.numero_nf::text, doc.id::text), v_custo_medio);

    UPDATE items SET saldo_estoque = COALESCE(saldo_estoque, 0) - line.quantidade
    WHERE id = line.item_id AND deleted_at IS NULL;
  END LOOP;

  -- Generate accounts receivable
  INSERT INTO accounts_receivable (tenant_id, cliente_id, documento_origem, valor, data_vencimento, status)
  VALUES (
    doc.tenant_id,
    doc.cliente_id,
    'NS-' || COALESCE(doc.numero_nf::text, doc.id::text),
    COALESCE(doc.valor_total, 0),
    COALESCE(doc.data_emissao, CURRENT_DATE) + INTERVAL '30 days',
    'ABERTO'
  );

  UPDATE outbound_documents SET status = 'PROCESSADO' WHERE id = _doc_id;
END;
$$;

-- Cancel outbound document with soft delete and stock reversal
CREATE OR REPLACE FUNCTION public.cancel_outbound_document(_doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  doc record;
  line record;
BEGIN
  SELECT * INTO doc FROM outbound_documents WHERE id = _doc_id AND deleted_at IS NULL;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'CANCELADO' THEN RAISE EXCEPTION 'Documento já cancelado'; END IF;

  IF doc.status = 'PROCESSADO' THEN
    -- Reverse stock movements (soft delete + restore balance)
    FOR line IN
      SELECT sm.id as mov_id, sm.item_id, sm.quantidade
      FROM stock_movements sm
      WHERE sm.documento_origem = 'NS-' || COALESCE(doc.numero_nf::text, doc.id::text)
        AND sm.tenant_id = doc.tenant_id
        AND sm.tipo = 'SAIDA'
        AND sm.deleted_at IS NULL
    LOOP
      UPDATE stock_movements SET deleted_at = now() WHERE id = line.mov_id;
      UPDATE items SET saldo_estoque = COALESCE(saldo_estoque, 0) + line.quantidade
      WHERE id = line.item_id AND deleted_at IS NULL;
    END LOOP;

    -- Soft delete linked accounts receivable
    UPDATE accounts_receivable
    SET deleted_at = now()
    WHERE cliente_id = doc.cliente_id
      AND tenant_id = doc.tenant_id
      AND documento_origem = 'NS-' || COALESCE(doc.numero_nf::text, doc.id::text)
      AND deleted_at IS NULL;
  ELSE
    -- PENDENTE: soft-delete items
    UPDATE outbound_document_items SET deleted_at = now()
    WHERE outbound_document_id = _doc_id AND deleted_at IS NULL;
  END IF;

  UPDATE outbound_documents SET status = 'CANCELADO' WHERE id = _doc_id;
END;
$$;
