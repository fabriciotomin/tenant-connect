
-- ============================================================
-- REFORÇO ARQUITETURAL: Integração completa entre módulos
-- ============================================================

-- 1) TABELAS FALTANTES
-- ============================================================

-- Representantes (comissão sobre vendas)
CREATE TABLE public.representantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  nome TEXT NOT NULL,
  percentual_comissao NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Itens do documento de entrada (para entradas manuais sem PO)
CREATE TABLE public.inbound_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inbound_document_id UUID NOT NULL REFERENCES public.inbound_documents(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  impostos NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Documento de Saída (NF-e saída)
CREATE TABLE public.outbound_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  cliente_id UUID NOT NULL REFERENCES public.customers(id),
  representante_id UUID REFERENCES public.representantes(id),
  condicao_pagamento_id UUID REFERENCES public.payment_conditions(id),
  pedido_venda_id UUID, -- future FK to sales_orders
  numero TEXT,
  serie TEXT,
  chave_acesso TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  status status_documento NOT NULL DEFAULT 'PENDENTE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE TABLE public.outbound_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbound_document_id UUID NOT NULL REFERENCES public.outbound_documents(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id),
  quantidade NUMERIC NOT NULL DEFAULT 1,
  valor_unitario NUMERIC NOT NULL DEFAULT 0,
  impostos NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comissões geradas
CREATE TABLE public.comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  representante_id UUID NOT NULL REFERENCES public.representantes(id),
  documento_id UUID NOT NULL REFERENCES public.outbound_documents(id),
  valor_base NUMERIC NOT NULL,
  percentual NUMERIC NOT NULL,
  valor_comissao NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar condicao_pagamento_id ao inbound_documents
ALTER TABLE public.inbound_documents ADD COLUMN IF NOT EXISTS condicao_pagamento_id UUID REFERENCES public.payment_conditions(id);

-- ============================================================
-- 2) INDEXES
-- ============================================================
CREATE INDEX idx_representantes_tenant ON public.representantes(tenant_id);
CREATE INDEX idx_outbound_documents_tenant ON public.outbound_documents(tenant_id);
CREATE INDEX idx_comissoes_tenant ON public.comissoes(tenant_id);
CREATE INDEX idx_inbound_doc_items_doc ON public.inbound_document_items(inbound_document_id);
CREATE INDEX idx_outbound_doc_items_doc ON public.outbound_document_items(outbound_document_id);

-- ============================================================
-- 3) RLS
-- ============================================================
ALTER TABLE public.representantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbound_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_document_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;

-- representantes
CREATE POLICY "admin_global_all_representantes" ON public.representantes FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_representantes" ON public.representantes FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_representantes" ON public.representantes FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- inbound_document_items (via join)
CREATE POLICY "admin_global_all_inbound_doc_items" ON public.inbound_document_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.inbound_documents d WHERE d.id = inbound_document_id AND is_admin_global(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.inbound_documents d WHERE d.id = inbound_document_id AND is_admin_global(auth.uid())));
CREATE POLICY "admin_empresa_all_inbound_doc_items" ON public.inbound_document_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.inbound_documents d WHERE d.id = inbound_document_id AND is_admin_empresa(auth.uid(), d.tenant_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.inbound_documents d WHERE d.id = inbound_document_id AND is_admin_empresa(auth.uid(), d.tenant_id)));
CREATE POLICY "user_select_inbound_doc_items" ON public.inbound_document_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.inbound_documents d WHERE d.id = inbound_document_id AND d.tenant_id = get_user_tenant_id(auth.uid())));

-- outbound_documents
CREATE POLICY "admin_global_all_outbound_docs" ON public.outbound_documents FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_outbound_docs" ON public.outbound_documents FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_outbound_docs" ON public.outbound_documents FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- outbound_document_items (via join)
CREATE POLICY "admin_global_all_outbound_doc_items" ON public.outbound_document_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.outbound_documents d WHERE d.id = outbound_document_id AND is_admin_global(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.outbound_documents d WHERE d.id = outbound_document_id AND is_admin_global(auth.uid())));
CREATE POLICY "admin_empresa_all_outbound_doc_items" ON public.outbound_document_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.outbound_documents d WHERE d.id = outbound_document_id AND is_admin_empresa(auth.uid(), d.tenant_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.outbound_documents d WHERE d.id = outbound_document_id AND is_admin_empresa(auth.uid(), d.tenant_id)));
CREATE POLICY "user_select_outbound_doc_items" ON public.outbound_document_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.outbound_documents d WHERE d.id = outbound_document_id AND d.tenant_id = get_user_tenant_id(auth.uid())));

-- comissoes
CREATE POLICY "admin_global_all_comissoes" ON public.comissoes FOR ALL TO authenticated USING (is_admin_global(auth.uid())) WITH CHECK (is_admin_global(auth.uid()));
CREATE POLICY "admin_empresa_all_comissoes" ON public.comissoes FOR ALL TO authenticated USING (is_admin_empresa(auth.uid(), tenant_id)) WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));
CREATE POLICY "user_select_comissoes" ON public.comissoes FOR SELECT TO authenticated USING (tenant_id = get_user_tenant_id(auth.uid()));

-- ============================================================
-- 4) TRIGGERS updated_at
-- ============================================================
CREATE TRIGGER update_representantes_updated_at BEFORE UPDATE ON public.representantes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outbound_documents_updated_at BEFORE UPDATE ON public.outbound_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5) FUNÇÕES TRANSACIONAIS REFORÇADAS
-- ============================================================

-- Drop old less robust version
DROP FUNCTION IF EXISTS public.process_inbound_document(UUID, UUID);

-- ============================================================
-- confirmar_documento_entrada()
-- Transacional: estoque + financeiro + audit em uma operação
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirmar_documento_entrada(
  p_document_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
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
BEGIN
  -- Lock document
  SELECT * INTO v_doc FROM public.inbound_documents WHERE id = p_document_id FOR UPDATE;
  
  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Documento não encontrado: %', p_document_id;
  END IF;
  
  IF v_doc.status != 'PENDENTE' THEN
    RAISE EXCEPTION 'Documento % já foi processado ou cancelado (status: %)', p_document_id, v_doc.status;
  END IF;

  -- ===== 1) GERAR MOVIMENTAÇÕES DE ESTOQUE =====
  -- Se vinculado a um PO, usar itens do PO
  IF v_doc.purchase_order_id IS NOT NULL THEN
    FOR v_item IN 
      SELECT poi.item_id, poi.quantidade, poi.valor_unitario
      FROM public.purchase_order_items poi
      WHERE poi.purchase_order_id = v_doc.purchase_order_id
    LOOP
      -- Lock item row + generate movement (trigger handles saldo/custo)
      INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
      VALUES (v_doc.tenant_id, v_item.item_id, 'ENTRADA', v_item.quantidade, v_item.valor_unitario, 'NF-E-' || COALESCE(v_doc.numero, v_doc.id::text), p_user_id);
    END LOOP;

    -- Mark PO as ATENDIDO
    UPDATE public.purchase_orders 
    SET status = 'ATENDIDO', updated_at = now(), updated_by = p_user_id
    WHERE id = v_doc.purchase_order_id AND tenant_id = v_doc.tenant_id;
  ELSE
    -- Manual entry: use inbound_document_items
    FOR v_item IN 
      SELECT idi.item_id, idi.quantidade, idi.valor_unitario
      FROM public.inbound_document_items idi
      WHERE idi.inbound_document_id = p_document_id
    LOOP
      INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
      VALUES (v_doc.tenant_id, v_item.item_id, 'ENTRADA', v_item.quantidade, v_item.valor_unitario, 'NF-E-' || COALESCE(v_doc.numero, v_doc.id::text), p_user_id);
    END LOOP;
  END IF;

  -- ===== 2) GERAR CONTAS A PAGAR (com parcelamento) =====
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
    -- Sem condição: parcela única 30 dias
    INSERT INTO public.accounts_payable (
      tenant_id, fornecedor_id, valor, data_vencimento, documento_origem, 
      competencia, data_emissao, created_by
    ) VALUES (
      v_doc.tenant_id, v_doc.fornecedor_id, v_doc.valor_total, CURRENT_DATE + INTERVAL '30 days',
      'NF-E-' || COALESCE(v_doc.numero, v_doc.id::text),
      CURRENT_DATE, CURRENT_DATE, p_user_id
    );
  END IF;

  -- ===== 3) ATUALIZAR STATUS DO DOCUMENTO =====
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

-- ============================================================
-- confirmar_documento_saida()
-- Transacional: estoque(saída) + financeiro(receber) + comissão + audit
-- ============================================================
CREATE OR REPLACE FUNCTION public.confirmar_documento_saida(
  p_document_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
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
  v_custo_item NUMERIC;
BEGIN
  -- Lock document
  SELECT * INTO v_doc FROM public.outbound_documents WHERE id = p_document_id FOR UPDATE;
  
  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Documento de saída não encontrado: %', p_document_id;
  END IF;
  
  IF v_doc.status != 'PENDENTE' THEN
    RAISE EXCEPTION 'Documento % já foi processado ou cancelado (status: %)', p_document_id, v_doc.status;
  END IF;

  -- ===== 1) GERAR MOVIMENTAÇÕES DE ESTOQUE (SAÍDA) =====
  FOR v_item IN 
    SELECT odi.item_id, odi.quantidade, odi.valor_unitario,
           i.custo_medio, i.saldo_estoque
    FROM public.outbound_document_items odi
    JOIN public.items i ON i.id = odi.item_id
    WHERE odi.outbound_document_id = p_document_id
  LOOP
    -- Validate stock (trigger also validates, but explicit check here)
    IF v_item.saldo_estoque < v_item.quantidade THEN
      RAISE EXCEPTION 'Saldo insuficiente para item %. Saldo: %, Quantidade: %', 
        v_item.item_id, v_item.saldo_estoque, v_item.quantidade;
    END IF;

    -- Movement uses custo_medio for SAIDA
    INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
    VALUES (v_doc.tenant_id, v_item.item_id, 'SAIDA', v_item.quantidade, v_item.custo_medio, 'NF-S-' || COALESCE(v_doc.numero, v_doc.id::text), p_user_id);
  END LOOP;

  -- ===== 2) GERAR CONTAS A RECEBER (com parcelamento) =====
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

  -- ===== 3) REGISTRAR COMISSÃO DO REPRESENTANTE =====
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

  -- ===== 4) ATUALIZAR STATUS =====
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

-- ============================================================
-- REFORÇO: baixar_titulo_pagar com validação tenant_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.baixar_titulo_pagar(
  p_titulo_id UUID,
  p_banco_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo RECORD;
  v_banco RECORD;
BEGIN
  -- Lock titulo
  SELECT * INTO v_titulo FROM public.accounts_payable WHERE id = p_titulo_id FOR UPDATE;
  
  IF v_titulo IS NULL THEN
    RAISE EXCEPTION 'Título não encontrado: %', p_titulo_id;
  END IF;
  
  IF v_titulo.status != 'ABERTO' THEN
    RAISE EXCEPTION 'Título % não está aberto para baixa (status: %)', p_titulo_id, v_titulo.status;
  END IF;

  -- Validate banco belongs to same tenant
  SELECT * INTO v_banco FROM public.banks WHERE id = p_banco_id AND tenant_id = v_titulo.tenant_id;
  IF v_banco IS NULL THEN
    RAISE EXCEPTION 'Banco % não encontrado ou pertence a outro tenant', p_banco_id;
  END IF;

  -- Update titulo
  UPDATE public.accounts_payable 
  SET status = 'PAGO', data_baixa = CURRENT_DATE, updated_at = now(), updated_by = p_user_id
  WHERE id = p_titulo_id;

  -- Generate bank movement (SAIDA = pagamento)
  INSERT INTO public.bank_movements (tenant_id, banco_id, tipo, valor, data, referencia, created_by)
  VALUES (v_titulo.tenant_id, p_banco_id, 'SAIDA', v_titulo.valor, CURRENT_DATE, 'CP-' || p_titulo_id::text, p_user_id);

  -- Audit log with before/after
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_anteriores, dados_novos)
  VALUES (
    v_titulo.tenant_id, p_user_id, 'BAIXA_PAGAR', 'accounts_payable', p_titulo_id::text,
    jsonb_build_object('status', 'ABERTO', 'data_baixa', NULL),
    jsonb_build_object('status', 'PAGO', 'data_baixa', CURRENT_DATE, 'valor', v_titulo.valor, 'banco_id', p_banco_id)
  );
END;
$$;

-- ============================================================
-- REFORÇO: baixar_titulo_receber com validação tenant_id
-- ============================================================
CREATE OR REPLACE FUNCTION public.baixar_titulo_receber(
  p_titulo_id UUID,
  p_banco_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo RECORD;
  v_banco RECORD;
BEGIN
  SELECT * INTO v_titulo FROM public.accounts_receivable WHERE id = p_titulo_id FOR UPDATE;
  
  IF v_titulo IS NULL THEN
    RAISE EXCEPTION 'Título não encontrado: %', p_titulo_id;
  END IF;
  
  IF v_titulo.status != 'ABERTO' THEN
    RAISE EXCEPTION 'Título % não está aberto para baixa (status: %)', p_titulo_id, v_titulo.status;
  END IF;

  -- Validate banco belongs to same tenant
  SELECT * INTO v_banco FROM public.banks WHERE id = p_banco_id AND tenant_id = v_titulo.tenant_id;
  IF v_banco IS NULL THEN
    RAISE EXCEPTION 'Banco % não encontrado ou pertence a outro tenant', p_banco_id;
  END IF;

  UPDATE public.accounts_receivable 
  SET status = 'PAGO', data_baixa = CURRENT_DATE, updated_at = now(), updated_by = p_user_id
  WHERE id = p_titulo_id;

  -- Generate bank movement (ENTRADA = recebimento)
  INSERT INTO public.bank_movements (tenant_id, banco_id, tipo, valor, data, referencia, created_by)
  VALUES (v_titulo.tenant_id, p_banco_id, 'ENTRADA', v_titulo.valor, CURRENT_DATE, 'CR-' || p_titulo_id::text, p_user_id);

  -- Audit with before/after
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_anteriores, dados_novos)
  VALUES (
    v_titulo.tenant_id, p_user_id, 'BAIXA_RECEBER', 'accounts_receivable', p_titulo_id::text,
    jsonb_build_object('status', 'ABERTO', 'data_baixa', NULL),
    jsonb_build_object('status', 'PAGO', 'data_baixa', CURRENT_DATE, 'valor', v_titulo.valor, 'banco_id', p_banco_id)
  );
END;
$$;

-- ============================================================
-- REFORÇO: gerar_movimentacao_estoque (wrapper transacional com validação)
-- ============================================================
CREATE OR REPLACE FUNCTION public.gerar_movimentacao_estoque(
  p_tenant_id UUID,
  p_item_id UUID,
  p_tipo tipo_movimento,
  p_quantidade NUMERIC,
  p_custo_unitario NUMERIC,
  p_documento_origem TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_item RECORD;
BEGIN
  -- Validate tenant_id matches item's tenant
  SELECT * INTO v_item FROM public.items WHERE id = p_item_id AND tenant_id = p_tenant_id;
  IF v_item IS NULL THEN
    RAISE EXCEPTION 'Item % não encontrado no tenant %', p_item_id, p_tenant_id;
  END IF;

  -- Validate documento_origem is provided (exceto AJUSTE administrativo)
  IF p_documento_origem IS NULL AND p_tipo != 'AJUSTE' THEN
    RAISE EXCEPTION 'Movimentação de estoque requer documento de origem';
  END IF;

  -- Insert (trigger process_stock_movement handles saldo + custo)
  INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
  VALUES (p_tenant_id, p_item_id, p_tipo, p_quantidade, p_custo_unitario, p_documento_origem, p_user_id)
  RETURNING id INTO v_id;

  -- Audit log
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_novos)
  VALUES (
    p_tenant_id, p_user_id, 'MOVIMENTACAO_ESTOQUE', 'stock_movements', v_id::text,
    jsonb_build_object('tipo', p_tipo::text, 'quantidade', p_quantidade, 'custo_unitario', p_custo_unitario, 'item_id', p_item_id, 'documento_origem', p_documento_origem)
  );

  RETURN v_id;
END;
$$;

-- ============================================================
-- gerar_titulos_financeiros (helper for batch generation)
-- ============================================================
CREATE OR REPLACE FUNCTION public.gerar_titulos_pagar(
  p_tenant_id UUID,
  p_fornecedor_id UUID,
  p_valor_total NUMERIC,
  p_condicao_pagamento_id UUID,
  p_documento_origem TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cond RECORD;
  v_parcela INTEGER;
  v_valor_parcela NUMERIC;
  v_data_venc DATE;
BEGIN
  IF p_condicao_pagamento_id IS NOT NULL THEN
    SELECT * INTO v_cond FROM public.payment_conditions WHERE id = p_condicao_pagamento_id AND tenant_id = p_tenant_id;
    IF v_cond IS NULL THEN
      RAISE EXCEPTION 'Condição de pagamento não encontrada no tenant';
    END IF;
    v_valor_parcela := ROUND(p_valor_total / GREATEST(v_cond.numero_parcelas, 1), 2);
    FOR v_parcela IN 1..v_cond.numero_parcelas LOOP
      v_data_venc := CURRENT_DATE + (v_cond.dias_entre_parcelas * v_parcela);
      INSERT INTO public.accounts_payable (tenant_id, fornecedor_id, valor, data_vencimento, documento_origem, competencia, data_emissao, created_by)
      VALUES (p_tenant_id, p_fornecedor_id, v_valor_parcela, v_data_venc, p_documento_origem || '-P' || v_parcela, CURRENT_DATE, CURRENT_DATE, p_user_id);
    END LOOP;
  ELSE
    INSERT INTO public.accounts_payable (tenant_id, fornecedor_id, valor, data_vencimento, documento_origem, competencia, data_emissao, created_by)
    VALUES (p_tenant_id, p_fornecedor_id, p_valor_total, CURRENT_DATE + INTERVAL '30 days', p_documento_origem, CURRENT_DATE, CURRENT_DATE, p_user_id);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.gerar_titulos_receber(
  p_tenant_id UUID,
  p_cliente_id UUID,
  p_valor_total NUMERIC,
  p_condicao_pagamento_id UUID,
  p_documento_origem TEXT,
  p_user_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cond RECORD;
  v_parcela INTEGER;
  v_valor_parcela NUMERIC;
  v_data_venc DATE;
BEGIN
  IF p_condicao_pagamento_id IS NOT NULL THEN
    SELECT * INTO v_cond FROM public.payment_conditions WHERE id = p_condicao_pagamento_id AND tenant_id = p_tenant_id;
    IF v_cond IS NULL THEN
      RAISE EXCEPTION 'Condição de pagamento não encontrada no tenant';
    END IF;
    v_valor_parcela := ROUND(p_valor_total / GREATEST(v_cond.numero_parcelas, 1), 2);
    FOR v_parcela IN 1..v_cond.numero_parcelas LOOP
      v_data_venc := CURRENT_DATE + (v_cond.dias_entre_parcelas * v_parcela);
      INSERT INTO public.accounts_receivable (tenant_id, cliente_id, valor, data_vencimento, documento_origem, competencia, data_emissao, created_by)
      VALUES (p_tenant_id, p_cliente_id, v_valor_parcela, v_data_venc, p_documento_origem || '-P' || v_parcela, CURRENT_DATE, CURRENT_DATE, p_user_id);
    END LOOP;
  ELSE
    INSERT INTO public.accounts_receivable (tenant_id, cliente_id, valor, data_vencimento, documento_origem, competencia, data_emissao, created_by)
    VALUES (p_tenant_id, p_cliente_id, p_valor_total, CURRENT_DATE + INTERVAL '30 days', p_documento_origem, CURRENT_DATE, CURRENT_DATE, p_user_id);
  END IF;
END;
$$;
