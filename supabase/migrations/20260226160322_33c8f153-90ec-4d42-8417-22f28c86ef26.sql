
DROP FUNCTION IF EXISTS public.cancelar_documento_entrada(uuid, uuid);

CREATE OR REPLACE FUNCTION public.cancelar_documento_entrada(p_document_id uuid, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_item RECORD;
  v_has_paid BOOLEAN;
  v_po_id uuid;
  v_total_pedida numeric;
  v_total_recebida numeric;
  v_new_po_status text;
BEGIN
  SELECT * INTO v_doc FROM public.inbound_documents WHERE id = p_document_id FOR UPDATE;

  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Documento não encontrado: %', p_document_id;
  END IF;

  IF v_doc.status != 'PROCESSADO' THEN
    RAISE EXCEPTION 'Somente documentos PROCESSADOS podem ser cancelados (status atual: %)', v_doc.status;
  END IF;

  IF p_user_id IS NOT NULL AND NOT public.is_admin_global(p_user_id) THEN
    RAISE EXCEPTION 'Somente Admin Global pode cancelar documentos confirmados';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.accounts_payable
    WHERE documento_origem LIKE 'NF-E-' || COALESCE(v_doc.numero, v_doc.id::text) || '%'
      AND tenant_id = v_doc.tenant_id
      AND status = 'PAGO'
  ) INTO v_has_paid;

  IF v_has_paid THEN
    RAISE EXCEPTION 'Não é possível cancelar: existem títulos já baixados vinculados a este documento. Estorne as baixas primeiro.';
  END IF;

  IF public.is_period_closed(v_doc.tenant_id, CURRENT_DATE) THEN
    RAISE EXCEPTION 'Período contábil fechado. Não é possível cancelar.';
  END IF;

  -- 1) Reverse stock using actual inbound_document_items
  FOR v_item IN
    SELECT idi.item_id, idi.quantidade, idi.valor_unitario
    FROM public.inbound_document_items idi
    WHERE idi.inbound_document_id = p_document_id
  LOOP
    INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
    VALUES (v_doc.tenant_id, v_item.item_id, 'SAIDA', v_item.quantidade, v_item.valor_unitario,
            'CANC-NF-E-' || COALESCE(v_doc.numero, v_doc.id::text), p_user_id);
  END LOOP;

  -- 2) Cancel open accounts payable
  UPDATE public.accounts_payable
  SET status = 'CANCELADO', updated_at = now(), updated_by = p_user_id
  WHERE documento_origem LIKE 'NF-E-' || COALESCE(v_doc.numero, v_doc.id::text) || '%'
    AND tenant_id = v_doc.tenant_id
    AND status = 'ABERTO';

  -- 3) Update document status
  UPDATE public.inbound_documents
  SET status = 'CANCELADO', updated_at = now(), updated_by = p_user_id
  WHERE id = p_document_id;

  -- 4) Recalculate purchase order status dynamically
  v_po_id := v_doc.purchase_order_id;

  IF v_po_id IS NOT NULL THEN
    SELECT COALESCE(SUM(poi.quantidade), 0)
    INTO v_total_pedida
    FROM public.purchase_order_items poi
    WHERE poi.purchase_order_id = v_po_id;

    SELECT COALESCE(SUM(idi.quantidade), 0)
    INTO v_total_recebida
    FROM public.inbound_document_items idi
    JOIN public.inbound_documents idoc ON idoc.id = idi.inbound_document_id
    WHERE idoc.purchase_order_id = v_po_id
      AND idoc.status != 'CANCELADO';

    IF v_total_recebida <= 0 THEN
      v_new_po_status := 'ABERTO';
    ELSIF v_total_recebida < v_total_pedida THEN
      v_new_po_status := 'PARCIAL';
    ELSE
      v_new_po_status := 'ATENDIDO';
    END IF;

    UPDATE public.purchase_orders
    SET status = v_new_po_status::status_pedido_compra,
        updated_at = now(),
        updated_by = p_user_id
    WHERE id = v_po_id
      AND tenant_id = v_doc.tenant_id;
  END IF;

  -- 5) Audit log
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_anteriores, dados_novos)
  VALUES (
    v_doc.tenant_id, p_user_id, 'CANCELAR_ENTRADA', 'inbound_documents', p_document_id::text,
    jsonb_build_object('status', 'PROCESSADO', 'valor_total', v_doc.valor_total),
    jsonb_build_object('status', 'CANCELADO', 'po_status_recalculado', COALESCE(v_new_po_status, 'N/A'))
  );
END;
$$;
