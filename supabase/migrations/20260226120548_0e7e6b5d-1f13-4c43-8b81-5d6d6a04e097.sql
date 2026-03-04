
CREATE OR REPLACE FUNCTION public.confirmar_documento_saida(p_document_id uuid, p_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_item RECORD;
  v_cond RECORD;
  v_rep RECORD;
  v_parcela INTEGER;
  v_valor_parcela NUMERIC;
  v_data_venc DATE;
  v_item_count INTEGER;
BEGIN
  SELECT * INTO v_doc FROM public.outbound_documents WHERE id = p_document_id FOR UPDATE;
  
  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Documento de saída não encontrado: %', p_document_id;
  END IF;
  
  IF v_doc.status != 'PENDENTE' THEN
    RAISE EXCEPTION 'Documento % já foi processado ou cancelado (status: %)', p_document_id, v_doc.status;
  END IF;

  SELECT COUNT(*) INTO v_item_count FROM public.outbound_document_items WHERE outbound_document_id = p_document_id;
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Não é possível confirmar documento sem itens';
  END IF;

  -- ===== 1) MOVIMENTAÇÕES DE ESTOQUE (SAÍDA) – APENAS NÃO-SERVIÇO =====
  FOR v_item IN 
    SELECT odi.item_id, odi.quantidade, odi.valor_unitario,
           i.custo_medio, i.saldo_estoque, i.tipo_item
    FROM public.outbound_document_items odi
    JOIN public.items i ON i.id = odi.item_id
    WHERE odi.outbound_document_id = p_document_id
  LOOP
    -- Pular itens do tipo SERVICO – não movimentam estoque
    IF v_item.tipo_item = 'SERVICO' THEN
      CONTINUE;
    END IF;

    IF v_item.saldo_estoque < v_item.quantidade THEN
      RAISE EXCEPTION 'Saldo insuficiente para item %. Saldo: %, Quantidade: %', 
        v_item.item_id, v_item.saldo_estoque, v_item.quantidade;
    END IF;

    INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
    VALUES (v_doc.tenant_id, v_item.item_id, 'SAIDA', v_item.quantidade, v_item.custo_medio, 'NF-S-' || COALESCE(v_doc.numero, v_doc.id::text), p_user_id);
  END LOOP;

  -- ===== 2) CONTAS A RECEBER =====
  IF v_doc.condicao_pagamento_id IS NOT NULL THEN
    SELECT * INTO v_cond FROM public.payment_conditions WHERE id = v_doc.condicao_pagamento_id;
    v_valor_parcela := ROUND(v_doc.valor_total / GREATEST(v_cond.numero_parcelas, 1), 2);
    
    FOR v_parcela IN 1..v_cond.numero_parcelas LOOP
      v_data_venc := CURRENT_DATE + (v_cond.dias_entre_parcelas * v_parcela);
      INSERT INTO public.accounts_receivable (
        tenant_id, cliente_id, valor, data_vencimento, documento_origem,
        competencia, data_emissao, created_by
      ) VALUES (
        v_doc.tenant_id, v_doc.cliente_id, v_valor_parcela, v_data_venc,
        'NF-S-' || COALESCE(v_doc.numero, v_doc.id::text) || '-P' || v_parcela,
        CURRENT_DATE, CURRENT_DATE, p_user_id
      );
    END LOOP;
  ELSE
    INSERT INTO public.accounts_receivable (
      tenant_id, cliente_id, valor, data_vencimento, documento_origem,
      competencia, data_emissao, created_by
    ) VALUES (
      v_doc.tenant_id, v_doc.cliente_id, v_doc.valor_total, CURRENT_DATE + INTERVAL '30 days',
      'NF-S-' || COALESCE(v_doc.numero, v_doc.id::text),
      CURRENT_DATE, CURRENT_DATE, p_user_id
    );
  END IF;

  -- ===== 3) COMISSÃO =====
  IF v_doc.representante_id IS NOT NULL THEN
    SELECT * INTO v_rep FROM public.representantes 
    WHERE id = v_doc.representante_id AND tenant_id = v_doc.tenant_id;
    
    IF v_rep IS NOT NULL AND v_rep.percentual_comissao > 0 THEN
      INSERT INTO public.comissoes (tenant_id, representante_id, documento_id, valor_base, percentual, valor_comissao)
      VALUES (
        v_doc.tenant_id, v_doc.representante_id, p_document_id,
        v_doc.valor_total, v_rep.percentual_comissao,
        ROUND(v_doc.valor_total * v_rep.percentual_comissao / 100, 2)
      );
    END IF;
  END IF;

  -- ===== 4) STATUS =====
  UPDATE public.outbound_documents 
  SET status = 'PROCESSADO', updated_at = now(), updated_by = p_user_id
  WHERE id = p_document_id;

  -- ===== 5) AUDIT LOG =====
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_novos)
  VALUES (
    v_doc.tenant_id, p_user_id, 'CONFIRMAR_SAIDA', 'outbound_documents', p_document_id::text,
    jsonb_build_object(
      'valor_total', v_doc.valor_total,
      'cliente_id', v_doc.cliente_id,
      'representante_id', v_doc.representante_id,
      'numero', v_doc.numero
    )
  );
END;
$$;
