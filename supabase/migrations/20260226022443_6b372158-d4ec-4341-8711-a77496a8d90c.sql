
-- 1) Tabela formas_pagamento
CREATE TABLE public.formas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.empresas(id),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'boleto',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_global_all_formas_pagamento" ON public.formas_pagamento FOR ALL USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_formas_pagamento" ON public.formas_pagamento FOR ALL USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "tenant_all_formas_pagamento" ON public.formas_pagamento FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid())) WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_formas_pagamento_updated_at BEFORE UPDATE ON public.formas_pagamento FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2) Adicionar forma_pagamento_id nas tabelas de documentos/pedidos
ALTER TABLE public.purchase_orders ADD COLUMN forma_pagamento_id uuid REFERENCES public.formas_pagamento(id);
ALTER TABLE public.sales_orders ADD COLUMN forma_pagamento_id uuid REFERENCES public.formas_pagamento(id);
ALTER TABLE public.inbound_documents ADD COLUMN forma_pagamento_id uuid REFERENCES public.formas_pagamento(id);
ALTER TABLE public.outbound_documents ADD COLUMN forma_pagamento_id uuid REFERENCES public.formas_pagamento(id);

-- 3) Adicionar campos de frete nos itens do pedido de compra
ALTER TABLE public.purchase_order_items ADD COLUMN frete_unitario numeric NOT NULL DEFAULT 0;
ALTER TABLE public.purchase_order_items ADD COLUMN frete_total_item numeric NOT NULL DEFAULT 0;

-- 4) Atualizar confirmar_documento_entrada para validar itens
CREATE OR REPLACE FUNCTION public.confirmar_documento_entrada(p_document_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Validar que existem itens
  IF v_doc.purchase_order_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_item_count FROM public.purchase_order_items WHERE purchase_order_id = v_doc.purchase_order_id;
  ELSE
    SELECT COUNT(*) INTO v_item_count FROM public.inbound_document_items WHERE inbound_document_id = p_document_id;
  END IF;

  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Não é possível confirmar documento sem itens';
  END IF;

  -- ===== 1) GERAR MOVIMENTAÇÕES DE ESTOQUE =====
  IF v_doc.purchase_order_id IS NOT NULL THEN
    FOR v_item IN 
      SELECT poi.item_id, poi.quantidade, poi.valor_unitario, poi.frete_unitario
      FROM public.purchase_order_items poi
      WHERE poi.purchase_order_id = v_doc.purchase_order_id
    LOOP
      INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
      VALUES (v_doc.tenant_id, v_item.item_id, 'ENTRADA', v_item.quantidade, v_item.valor_unitario + v_item.frete_unitario, 'NF-E-' || COALESCE(v_doc.numero, v_doc.id::text), p_user_id);
    END LOOP;

    UPDATE public.purchase_orders 
    SET status = 'ATENDIDO', updated_at = now(), updated_by = p_user_id
    WHERE id = v_doc.purchase_order_id AND tenant_id = v_doc.tenant_id;
  ELSE
    FOR v_item IN 
      SELECT idi.item_id, idi.quantidade, idi.valor_unitario
      FROM public.inbound_document_items idi
      WHERE idi.inbound_document_id = p_document_id
    LOOP
      INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
      VALUES (v_doc.tenant_id, v_item.item_id, 'ENTRADA', v_item.quantidade, v_item.valor_unitario, 'NF-E-' || COALESCE(v_doc.numero, v_doc.id::text), p_user_id);
    END LOOP;
  END IF;

  -- ===== 2) GERAR CONTAS A PAGAR =====
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

  -- ===== 3) ATUALIZAR STATUS =====
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
$function$;

-- 5) Atualizar confirmar_documento_saida para validar itens
CREATE OR REPLACE FUNCTION public.confirmar_documento_saida(p_document_id uuid, p_user_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Validar que existem itens
  SELECT COUNT(*) INTO v_item_count FROM public.outbound_document_items WHERE outbound_document_id = p_document_id;
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Não é possível confirmar documento sem itens';
  END IF;

  -- ===== 1) MOVIMENTAÇÕES DE ESTOQUE (SAÍDA) =====
  FOR v_item IN 
    SELECT odi.item_id, odi.quantidade, odi.valor_unitario,
           i.custo_medio, i.saldo_estoque
    FROM public.outbound_document_items odi
    JOIN public.items i ON i.id = odi.item_id
    WHERE odi.outbound_document_id = p_document_id
  LOOP
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
$function$;
