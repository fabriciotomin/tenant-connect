
-- 1) TABELA document_series
CREATE TABLE public.document_series (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.empresas(id),
  nome text NOT NULL,
  modelo text NOT NULL DEFAULT '55',
  serie text NOT NULL DEFAULT '1',
  proximo_numero integer NOT NULL DEFAULT 1,
  padrao boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_series ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX idx_document_series_tenant_padrao 
  ON public.document_series (tenant_id) WHERE padrao = true AND ativo = true;

CREATE POLICY "admin_empresa_all_document_series" ON public.document_series FOR ALL
  USING (is_admin_empresa(auth.uid(), tenant_id))
  WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));

CREATE POLICY "admin_global_all_document_series" ON public.document_series FOR ALL
  USING (is_admin_global_in_tenant(auth.uid(), tenant_id))
  WITH CHECK (is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY "tenant_select_document_series" ON public.document_series FOR SELECT
  USING (tenant_id = get_user_tenant_id(auth.uid()));

-- 2) ALTERAR outbound_documents
ALTER TABLE public.outbound_documents 
  ADD COLUMN serie_id uuid REFERENCES public.document_series(id),
  ADD COLUMN numero_nf integer;

CREATE UNIQUE INDEX idx_outbound_docs_tenant_serie_numero 
  ON public.outbound_documents (tenant_id, serie_id, numero_nf) WHERE numero_nf IS NOT NULL;

-- 3) TRIGGER para impedir edição de série com docs vinculados
CREATE OR REPLACE FUNCTION public.protect_document_series()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF EXISTS (SELECT 1 FROM public.outbound_documents WHERE serie_id = OLD.id) THEN
      RAISE EXCEPTION 'Não é possível excluir série com documentos vinculados';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.serie != NEW.serie OR OLD.modelo != NEW.modelo THEN
      IF EXISTS (SELECT 1 FROM public.outbound_documents WHERE serie_id = OLD.id AND numero_nf IS NOT NULL) THEN
        RAISE EXCEPTION 'Não é possível alterar série/modelo após emissão de documentos';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_protect_document_series
  BEFORE UPDATE OR DELETE ON public.document_series
  FOR EACH ROW EXECUTE FUNCTION public.protect_document_series();

-- 4) RECRIAR confirmar_documento_saida COM numeração
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
  v_serie RECORD;
  v_parcela INTEGER;
  v_valor_parcela NUMERIC;
  v_data_venc DATE;
  v_item_count INTEGER;
  v_numero INTEGER;
  v_doc_ref TEXT;
BEGIN
  SELECT * INTO v_doc FROM public.outbound_documents WHERE id = p_document_id FOR UPDATE;
  
  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Documento de saída não encontrado: %', p_document_id;
  END IF;
  
  IF v_doc.status != 'PENDENTE' THEN
    RAISE EXCEPTION 'Documento já foi processado ou cancelado (status: %)', v_doc.status;
  END IF;

  SELECT COUNT(*) INTO v_item_count FROM public.outbound_document_items WHERE outbound_document_id = p_document_id;
  IF v_item_count = 0 THEN
    RAISE EXCEPTION 'Não é possível confirmar documento sem itens';
  END IF;

  -- ===== 0) NUMERAÇÃO NF =====
  SELECT * INTO v_serie 
  FROM public.document_series 
  WHERE tenant_id = v_doc.tenant_id AND padrao = true AND ativo = true
  FOR UPDATE;

  IF v_serie IS NULL THEN
    RAISE EXCEPTION 'Nenhuma série padrão ativa encontrada para o tenant';
  END IF;

  v_numero := v_serie.proximo_numero;

  UPDATE public.document_series 
  SET proximo_numero = proximo_numero + 1, updated_at = now()
  WHERE id = v_serie.id;

  v_doc_ref := 'NF ' || v_numero || '/' || v_serie.serie;

  -- ===== 1) MOVIMENTAÇÕES DE ESTOQUE (SAÍDA) – APENAS NÃO-SERVIÇO =====
  FOR v_item IN 
    SELECT odi.item_id, odi.quantidade, odi.valor_unitario,
           i.custo_medio, i.saldo_estoque, i.tipo_item
    FROM public.outbound_document_items odi
    JOIN public.items i ON i.id = odi.item_id
    WHERE odi.outbound_document_id = p_document_id
  LOOP
    IF v_item.tipo_item = 'SERVICO' THEN
      CONTINUE;
    END IF;

    IF v_item.saldo_estoque < v_item.quantidade THEN
      RAISE EXCEPTION 'Saldo insuficiente para item %. Saldo: %, Quantidade: %', 
        v_item.item_id, v_item.saldo_estoque, v_item.quantidade;
    END IF;

    INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
    VALUES (v_doc.tenant_id, v_item.item_id, 'SAIDA', v_item.quantidade, v_item.custo_medio, v_doc_ref, p_user_id);
  END LOOP;

  -- ===== 2) CONTAS A RECEBER =====
  IF v_doc.condicao_pagamento_id IS NOT NULL THEN
    SELECT * INTO v_cond FROM public.payment_conditions WHERE id = v_doc.condicao_pagamento_id;
    v_valor_parcela := ROUND(v_doc.valor_total / GREATEST(v_cond.numero_parcelas, 1), 2);
    
    FOR v_parcela IN 1..v_cond.numero_parcelas LOOP
      v_data_venc := CURRENT_DATE + (v_cond.dias_entre_parcelas * v_parcela);
      INSERT INTO public.accounts_receivable (
        tenant_id, cliente_id, valor, data_vencimento, documento_origem, competencia, data_emissao, created_by
      ) VALUES (
        v_doc.tenant_id, v_doc.cliente_id, v_valor_parcela, v_data_venc,
        v_doc_ref || '-P' || v_parcela, CURRENT_DATE, CURRENT_DATE, p_user_id
      );
    END LOOP;
  ELSE
    INSERT INTO public.accounts_receivable (
      tenant_id, cliente_id, valor, data_vencimento, documento_origem, competencia, data_emissao, created_by
    ) VALUES (
      v_doc.tenant_id, v_doc.cliente_id, v_doc.valor_total, CURRENT_DATE + INTERVAL '30 days',
      v_doc_ref, CURRENT_DATE, CURRENT_DATE, p_user_id
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

  -- ===== 4) STATUS + NUMERO =====
  UPDATE public.outbound_documents 
  SET status = 'PROCESSADO', 
      updated_at = now(), 
      updated_by = p_user_id,
      serie_id = v_serie.id,
      numero_nf = v_numero
  WHERE id = p_document_id;

  -- ===== 5) AUDIT LOG =====
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_novos)
  VALUES (
    v_doc.tenant_id, p_user_id, 'CONFIRMAR_SAIDA', 'outbound_documents', p_document_id::text,
    jsonb_build_object(
      'valor_total', v_doc.valor_total,
      'cliente_id', v_doc.cliente_id,
      'numero_nf', v_numero,
      'serie', v_serie.serie,
      'representante_id', v_doc.representante_id
    )
  );
END;
$$;
