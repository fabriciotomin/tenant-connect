
-- Drop all overloads
DROP FUNCTION IF EXISTS public.confirmar_documento_entrada(uuid, uuid);

-- Recreate WITHOUT touching purchase_orders
CREATE OR REPLACE FUNCTION public.confirmar_documento_entrada(p_document_id uuid, p_user_id uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_item RECORD;
  v_cond RECORD;
  v_parcela INTEGER;
  v_valor_parcela NUMERIC;
  v_data_venc DATE;
  v_item_count INTEGER;
BEGIN
  SELECT * INTO v_doc FROM public.inbound_documents WHERE id = p_document_id FOR UPDATE;
  
  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Documento não encontrado: %', p_document_id;
  END IF;
  
  IF v_doc.status != 'PENDENTE' THEN
    RAISE EXCEPTION 'Documento % já foi processado ou cancelado (status: %)', p_document_id, v_doc.status;
  END IF;

  -- Validate items exist in the document
  SELECT COUNT(*) INTO v_item_count FROM public.inbound_document_items WHERE inbound_document_id = p_document_id;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Não é possível confirmar documento sem itens';
  END IF;

  -- ===== 1) STOCK MOVEMENTS (always from inbound_document_items) =====
  FOR v_item IN 
    SELECT idi.item_id, idi.quantidade, idi.valor_unitario
    FROM public.inbound_document_items idi
    WHERE idi.inbound_document_id = p_document_id
  LOOP
    INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
    VALUES (v_doc.tenant_id, v_item.item_id, 'ENTRADA', v_item.quantidade, v_item.valor_unitario, 'NF-E-' || COALESCE(v_doc.numero, v_doc.id::text), p_user_id);
  END LOOP;

  -- ===== 2) ACCOUNTS PAYABLE =====
  IF v_doc.condicao_pagamento_id IS NOT NULL THEN
    SELECT * INTO v_cond FROM public.payment_conditions WHERE id = v_doc.condicao_pagamento_id;
    v_valor_parcela := ROUND(v_doc.valor_total / GREATEST(v_cond.numero_parcelas, 1), 2);
    
    FOR v_parcela IN 1..v_cond.numero_parcelas LOOP
      v_data_venc := CURRENT_DATE + (v_cond.dias_entre_parcelas * v_parcela);
      INSERT INTO public.accounts_payable (
        tenant_id, fornecedor_id, valor, data_vencimento, documento_origem, 
        competencia, data_emissao, created_by
      ) VALUES (
        v_doc.tenant_id, v_doc.fornecedor_id, v_valor_parcela, v_data_venc,
        'NF-E-' || COALESCE(v_doc.numero, v_doc.id::text) || '-P' || v_parcela,
        CURRENT_DATE, CURRENT_DATE, p_user_id
      );
    END LOOP;
  ELSE
    INSERT INTO public.accounts_payable (
      tenant_id, fornecedor_id, valor, data_vencimento, documento_origem, 
      competencia, data_emissao, created_by
    ) VALUES (
      v_doc.tenant_id, v_doc.fornecedor_id, v_doc.valor_total, CURRENT_DATE + INTERVAL '30 days',
      'NF-E-' || COALESCE(v_doc.numero, v_doc.id::text),
      CURRENT_DATE, CURRENT_DATE, p_user_id
    );
  END IF;

  -- ===== 3) UPDATE DOCUMENT STATUS ONLY (NO purchase_orders update) =====
  UPDATE public.inbound_documents 
  SET status = 'PROCESSADO', updated_at = now(), updated_by = p_user_id
  WHERE id = p_document_id;

  -- ===== 4) AUDIT LOG =====
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_novos)
  VALUES (
    v_doc.tenant_id, p_user_id, 'CONFIRMAR_ENTRADA', 'inbound_documents', p_document_id::text,
    jsonb_build_object(
      'valor_total', v_doc.valor_total,
      'fornecedor_id', v_doc.fornecedor_id,
      'purchase_order_id', v_doc.purchase_order_id,
      'numero', v_doc.numero
    )
  );
END;
$$;
