
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
BEGIN
  SELECT * INTO doc FROM outbound_documents WHERE id = _doc_id AND deleted_at IS NULL;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'PROCESSADO' THEN RAISE EXCEPTION 'Documento já processado'; END IF;

  FOR line IN SELECT * FROM outbound_document_items WHERE outbound_document_id = _doc_id AND deleted_at IS NULL LOOP
    -- Fetch current custo_medio from items (already filtered by deleted_at in recalc)
    SELECT COALESCE(i.custo_medio, 0) INTO v_custo_medio
    FROM items i WHERE i.id = line.item_id AND i.deleted_at IS NULL;

    INSERT INTO stock_movements (item_id, tenant_id, tipo, quantidade, documento_origem, custo_unitario)
    VALUES (line.item_id, doc.tenant_id, 'SAIDA', line.quantidade,
            'NS-' || COALESCE(doc.numero_nf::text, doc.id::text), v_custo_medio);

    UPDATE items SET saldo_estoque = COALESCE(saldo_estoque, 0) - line.quantidade
    WHERE id = line.item_id AND deleted_at IS NULL;
  END LOOP;

  UPDATE outbound_documents SET status = 'PROCESSADO' WHERE id = _doc_id;
END;
$function$;
