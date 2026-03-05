
CREATE OR REPLACE FUNCTION public.cancel_inbound_document(_doc_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc record;
  line record;
  v_old_saldo numeric;
  v_item_tipo text;
BEGIN
  SELECT * INTO doc FROM inbound_documents WHERE id = _doc_id AND deleted_at IS NULL;
  IF doc IS NULL THEN RAISE EXCEPTION 'Documento não encontrado'; END IF;
  IF doc.status = 'CANCELADO' THEN RAISE EXCEPTION 'Documento já cancelado'; END IF;

  IF doc.status = 'PROCESSADO' THEN
    FOR line IN
      SELECT sm.id as mov_id, sm.item_id, sm.quantidade
      FROM stock_movements sm
      WHERE sm.documento_origem = 'NE-' || doc.numero
        AND sm.tenant_id = doc.tenant_id
        AND sm.tipo = 'ENTRADA'
        AND sm.deleted_at IS NULL
    LOOP
      UPDATE stock_movements SET deleted_at = now() WHERE id = line.mov_id;

      SELECT tipo_item INTO v_item_tipo FROM items WHERE id = line.item_id AND deleted_at IS NULL;
      IF v_item_tipo IS NULL OR v_item_tipo != 'SERVICO' THEN
        UPDATE items
        SET saldo_estoque = COALESCE(saldo_estoque, 0) - line.quantidade
        WHERE id = line.item_id AND deleted_at IS NULL;
      END IF;
    END LOOP;

    UPDATE accounts_payable
    SET deleted_at = now()
    WHERE supplier_id = doc.fornecedor_id
      AND tenant_id = doc.tenant_id
      AND descricao = 'NE-' || COALESCE(doc.numero, doc.id::text)
      AND deleted_at IS NULL;
  ELSE
    UPDATE inbound_document_items
    SET deleted_at = now()
    WHERE inbound_document_id = _doc_id AND deleted_at IS NULL;
  END IF;

  UPDATE inbound_documents SET status = 'CANCELADO' WHERE id = _doc_id;

  -- Revert linked purchase order status back to ABERTO
  IF doc.purchase_order_id IS NOT NULL THEN
    UPDATE purchase_orders
    SET status = 'ABERTO', updated_at = now()
    WHERE id = doc.purchase_order_id
      AND tenant_id = doc.tenant_id
      AND deleted_at IS NULL
      AND status != 'CANCELADO';
  END IF;
END;
$function$;
