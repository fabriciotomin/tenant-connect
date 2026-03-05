
-- 1. Add numero_sequencial to service_orders (like quotations/sales_orders)
CREATE SEQUENCE IF NOT EXISTS service_orders_numero_sequencial_seq;

ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS numero_sequencial integer NOT NULL DEFAULT nextval('service_orders_numero_sequencial_seq');

-- 2. Add service_order_id to outbound_documents for OS traceability
ALTER TABLE public.outbound_documents 
ADD COLUMN IF NOT EXISTS service_order_id uuid;

-- 3. Update confirm_service_order to use numero_sequencial and store service_order_id
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
BEGIN
  SELECT * INTO v_os FROM service_orders WHERE id = _os_id AND deleted_at IS NULL;
  IF v_os IS NULL THEN RAISE EXCEPTION 'OS não encontrada'; END IF;
  IF v_os.status != 'RASCUNHO' THEN RAISE EXCEPTION 'OS não está em RASCUNHO'; END IF;

  -- Create outbound document linked to the OS
  INSERT INTO outbound_documents (tenant_id, cliente_id, data_emissao, valor_total, status, service_order_id)
  VALUES (v_os.tenant_id, v_os.customer_id, CURRENT_DATE, COALESCE(v_os.valor_total, 0), 'PENDENTE', _os_id)
  RETURNING id INTO v_doc_id;

  -- Copy OS items to outbound document items
  FOR v_line IN SELECT * FROM service_order_items WHERE service_order_id = _os_id AND deleted_at IS NULL LOOP
    INSERT INTO outbound_document_items (outbound_document_id, item_id, quantidade, valor_unitario, tenant_id)
    VALUES (v_doc_id, v_line.item_id, COALESCE(v_line.quantidade, 0), COALESCE(v_line.valor_unitario, 0), v_os.tenant_id);
  END LOOP;

  -- Update OS status
  UPDATE service_orders SET status = 'CONFIRMADO', updated_at = now() WHERE id = _os_id;

  RETURN v_doc_id;
END;
$function$;

-- 4. Update process_outbound_document to use proper number+serie in documento_origem
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

  INSERT INTO accounts_receivable (tenant_id, cliente_id, documento_origem, valor, data_vencimento, status)
  VALUES (
    doc.tenant_id, doc.cliente_id, v_doc_ref,
    COALESCE(doc.valor_total, 0),
    COALESCE(doc.data_emissao, CURRENT_DATE) + INTERVAL '30 days',
    'ABERTO'
  );

  UPDATE outbound_documents SET status = 'PROCESSADO' WHERE id = _doc_id;
END;
$function$;

-- 5. Update cancel_outbound_document to match new documento_origem format
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

    UPDATE accounts_receivable
    SET deleted_at = now()
    WHERE cliente_id = doc.cliente_id
      AND tenant_id = doc.tenant_id
      AND documento_origem = v_doc_ref
      AND deleted_at IS NULL;
  ELSE
    UPDATE outbound_document_items SET deleted_at = now()
    WHERE outbound_document_id = _doc_id AND deleted_at IS NULL;
  END IF;

  UPDATE outbound_documents SET status = 'CANCELADO' WHERE id = _doc_id;
END;
$function$;
