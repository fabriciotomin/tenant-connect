
-- Fix confirm_service_order to populate numero_nf and serie on outbound documents
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
BEGIN
  SELECT * INTO v_os FROM service_orders WHERE id = _os_id AND deleted_at IS NULL;
  IF v_os IS NULL THEN RAISE EXCEPTION 'OS não encontrada'; END IF;
  IF v_os.status != 'RASCUNHO' THEN RAISE EXCEPTION 'OS não está em RASCUNHO'; END IF;

  -- Get default document series for this tenant
  SELECT ds.serie, ds.proximo_numero INTO v_serie_rec
  FROM document_series ds
  WHERE ds.tenant_id = v_os.tenant_id AND ds.padrao = true AND ds.ativo = true AND ds.deleted_at IS NULL
  LIMIT 1;

  IF v_serie_rec IS NOT NULL THEN
    v_serie := v_serie_rec.serie;
    v_numero_nf := v_serie_rec.proximo_numero;
    -- Increment the next number
    UPDATE document_series SET proximo_numero = proximo_numero + 1
    WHERE tenant_id = v_os.tenant_id AND padrao = true AND ativo = true AND deleted_at IS NULL;
  ELSE
    -- Fallback: calculate next numero_nf from existing documents for this tenant
    SELECT COALESCE(MAX(numero_nf), 0) + 1 INTO v_numero_nf
    FROM outbound_documents WHERE tenant_id = v_os.tenant_id AND deleted_at IS NULL;
    v_serie := '1';
  END IF;

  -- Create outbound document with numero_nf and serie populated
  INSERT INTO outbound_documents (tenant_id, cliente_id, data_emissao, valor_total, status, service_order_id, numero_nf, serie)
  VALUES (v_os.tenant_id, v_os.customer_id, CURRENT_DATE, COALESCE(v_os.valor_total, 0), 'PENDENTE', _os_id, v_numero_nf, v_serie)
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
