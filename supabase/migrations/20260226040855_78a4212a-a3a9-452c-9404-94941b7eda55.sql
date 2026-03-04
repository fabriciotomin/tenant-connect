
-- =============================================
-- 1) BANKS TABLE: add missing columns
-- =============================================
ALTER TABLE public.banks 
  ADD COLUMN IF NOT EXISTS agencia text,
  ADD COLUMN IF NOT EXISTS conta text,
  ADD COLUMN IF NOT EXISTS tipo_conta text NOT NULL DEFAULT 'corrente',
  ADD COLUMN IF NOT EXISTS saldo_inicial numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- =============================================
-- 2) ACCOUNTS_PAYABLE: add manual entry columns
-- =============================================
ALTER TABLE public.accounts_payable
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id),
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id),
  ADD COLUMN IF NOT EXISTS forma_pagamento_id uuid REFERENCES public.formas_pagamento(id),
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS juros numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multa numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_pago numeric,
  ADD COLUMN IF NOT EXISTS banco_baixa_id uuid REFERENCES public.banks(id);

-- =============================================
-- 3) ACCOUNTS_RECEIVABLE: add manual entry columns
-- =============================================
ALTER TABLE public.accounts_receivable
  ADD COLUMN IF NOT EXISTS descricao text,
  ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id),
  ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id),
  ADD COLUMN IF NOT EXISTS forma_pagamento_id uuid REFERENCES public.formas_pagamento(id),
  ADD COLUMN IF NOT EXISTS observacao text,
  ADD COLUMN IF NOT EXISTS juros numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multa numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_recebido numeric,
  ADD COLUMN IF NOT EXISTS banco_baixa_id uuid REFERENCES public.banks(id);

-- =============================================
-- 4) UPDATE baixar_titulo_pagar with juros/multa/desconto
-- =============================================
CREATE OR REPLACE FUNCTION public.baixar_titulo_pagar(
  p_titulo_id uuid, 
  p_banco_id uuid, 
  p_user_id uuid DEFAULT NULL,
  p_juros numeric DEFAULT 0,
  p_multa numeric DEFAULT 0,
  p_desconto numeric DEFAULT 0,
  p_data_baixa date DEFAULT CURRENT_DATE,
  p_observacao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_titulo RECORD;
  v_banco RECORD;
  v_valor_final numeric;
BEGIN
  SELECT * INTO v_titulo FROM public.accounts_payable WHERE id = p_titulo_id FOR UPDATE;
  
  IF v_titulo IS NULL THEN
    RAISE EXCEPTION 'Título não encontrado: %', p_titulo_id;
  END IF;
  
  IF v_titulo.status != 'ABERTO' THEN
    RAISE EXCEPTION 'Título % não está aberto para baixa (status: %)', p_titulo_id, v_titulo.status;
  END IF;

  -- Check closed period
  IF public.is_period_closed(v_titulo.tenant_id, p_data_baixa) THEN
    RAISE EXCEPTION 'Período contábil fechado. Não é possível realizar baixa.';
  END IF;

  SELECT * INTO v_banco FROM public.banks WHERE id = p_banco_id AND tenant_id = v_titulo.tenant_id;
  IF v_banco IS NULL THEN
    RAISE EXCEPTION 'Banco % não encontrado ou pertence a outro tenant', p_banco_id;
  END IF;

  v_valor_final := v_titulo.valor + COALESCE(p_juros, 0) + COALESCE(p_multa, 0) - COALESCE(p_desconto, 0);

  UPDATE public.accounts_payable 
  SET status = 'PAGO', 
      data_baixa = p_data_baixa, 
      juros = COALESCE(p_juros, 0),
      multa = COALESCE(p_multa, 0),
      desconto = COALESCE(p_desconto, 0),
      valor_pago = v_valor_final,
      banco_baixa_id = p_banco_id,
      observacao = COALESCE(p_observacao, observacao),
      updated_at = now(), 
      updated_by = p_user_id
  WHERE id = p_titulo_id;

  INSERT INTO public.bank_movements (tenant_id, banco_id, tipo, valor, data, referencia, created_by)
  VALUES (v_titulo.tenant_id, p_banco_id, 'SAIDA', v_valor_final, p_data_baixa, 'CP-' || p_titulo_id::text, p_user_id);

  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_anteriores, dados_novos)
  VALUES (
    v_titulo.tenant_id, p_user_id, 'BAIXA_PAGAR', 'accounts_payable', p_titulo_id::text,
    jsonb_build_object('status', 'ABERTO', 'data_baixa', NULL, 'valor', v_titulo.valor),
    jsonb_build_object('status', 'PAGO', 'data_baixa', p_data_baixa, 'valor_original', v_titulo.valor, 'juros', p_juros, 'multa', p_multa, 'desconto', p_desconto, 'valor_pago', v_valor_final, 'banco_id', p_banco_id)
  );
END;
$$;

-- =============================================
-- 5) UPDATE baixar_titulo_receber with juros/multa/desconto
-- =============================================
CREATE OR REPLACE FUNCTION public.baixar_titulo_receber(
  p_titulo_id uuid, 
  p_banco_id uuid, 
  p_user_id uuid DEFAULT NULL,
  p_juros numeric DEFAULT 0,
  p_multa numeric DEFAULT 0,
  p_desconto numeric DEFAULT 0,
  p_data_baixa date DEFAULT CURRENT_DATE,
  p_observacao text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_titulo RECORD;
  v_banco RECORD;
  v_valor_final numeric;
BEGIN
  SELECT * INTO v_titulo FROM public.accounts_receivable WHERE id = p_titulo_id FOR UPDATE;
  
  IF v_titulo IS NULL THEN
    RAISE EXCEPTION 'Título não encontrado: %', p_titulo_id;
  END IF;
  
  IF v_titulo.status != 'ABERTO' THEN
    RAISE EXCEPTION 'Título % não está aberto para baixa (status: %)', p_titulo_id, v_titulo.status;
  END IF;

  IF public.is_period_closed(v_titulo.tenant_id, p_data_baixa) THEN
    RAISE EXCEPTION 'Período contábil fechado. Não é possível realizar baixa.';
  END IF;

  SELECT * INTO v_banco FROM public.banks WHERE id = p_banco_id AND tenant_id = v_titulo.tenant_id;
  IF v_banco IS NULL THEN
    RAISE EXCEPTION 'Banco % não encontrado ou pertence a outro tenant', p_banco_id;
  END IF;

  v_valor_final := v_titulo.valor + COALESCE(p_juros, 0) + COALESCE(p_multa, 0) - COALESCE(p_desconto, 0);

  UPDATE public.accounts_receivable 
  SET status = 'PAGO', 
      data_baixa = p_data_baixa, 
      juros = COALESCE(p_juros, 0),
      multa = COALESCE(p_multa, 0),
      desconto = COALESCE(p_desconto, 0),
      valor_recebido = v_valor_final,
      banco_baixa_id = p_banco_id,
      observacao = COALESCE(p_observacao, observacao),
      updated_at = now(), 
      updated_by = p_user_id
  WHERE id = p_titulo_id;

  INSERT INTO public.bank_movements (tenant_id, banco_id, tipo, valor, data, referencia, created_by)
  VALUES (v_titulo.tenant_id, p_banco_id, 'ENTRADA', v_valor_final, p_data_baixa, 'CR-' || p_titulo_id::text, p_user_id);

  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_anteriores, dados_novos)
  VALUES (
    v_titulo.tenant_id, p_user_id, 'BAIXA_RECEBER', 'accounts_receivable', p_titulo_id::text,
    jsonb_build_object('status', 'ABERTO', 'data_baixa', NULL, 'valor', v_titulo.valor),
    jsonb_build_object('status', 'PAGO', 'data_baixa', p_data_baixa, 'valor_original', v_titulo.valor, 'juros', p_juros, 'multa', p_multa, 'desconto', p_desconto, 'valor_recebido', v_valor_final, 'banco_id', p_banco_id)
  );
END;
$$;

-- =============================================
-- 6) SAFE DELETE VALIDATION FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.check_entity_dependencies(
  p_entity text,
  p_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_deps text := '';
BEGIN
  CASE p_entity
    WHEN 'suppliers' THEN
      SELECT COUNT(*) INTO v_count FROM public.purchase_orders WHERE fornecedor_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Pedidos de Compra (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.inbound_documents WHERE fornecedor_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Documentos de Entrada (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.accounts_payable WHERE fornecedor_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Contas a Pagar (' || v_count || '), '; END IF;

    WHEN 'customers' THEN
      SELECT COUNT(*) INTO v_count FROM public.quotations WHERE customer_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Orçamentos (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.sales_orders WHERE customer_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Pedidos de Venda (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.outbound_documents WHERE cliente_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Documentos de Saída (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.accounts_receivable WHERE cliente_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Contas a Receber (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.service_orders WHERE customer_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Ordens de Serviço (' || v_count || '), '; END IF;

    WHEN 'banks' THEN
      SELECT COUNT(*) INTO v_count FROM public.bank_movements WHERE banco_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Movimentações Bancárias (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.accounts_payable WHERE banco_baixa_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Baixas de Pagar (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.accounts_receivable WHERE banco_baixa_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Baixas de Receber (' || v_count || '), '; END IF;

    WHEN 'items' THEN
      SELECT COUNT(*) INTO v_count FROM public.stock_movements WHERE item_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Movimentações de Estoque (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.purchase_order_items WHERE item_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Pedidos de Compra (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.inbound_document_items WHERE item_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Documentos de Entrada (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.quotation_items WHERE item_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Orçamentos (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.sales_order_items WHERE item_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Pedidos de Venda (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.outbound_document_items WHERE item_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Documentos de Saída (' || v_count || '), '; END IF;

    WHEN 'item_groups' THEN
      SELECT COUNT(*) INTO v_count FROM public.items WHERE grupo_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Itens (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.item_groups WHERE codigo_pai = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Subgrupos (' || v_count || '), '; END IF;

    WHEN 'financial_natures' THEN
      SELECT COUNT(*) INTO v_count FROM public.items WHERE natureza_financeira_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Itens (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.financial_natures WHERE codigo_pai = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Subnaturezas (' || v_count || '), '; END IF;

    WHEN 'cost_centers' THEN
      SELECT COUNT(*) INTO v_count FROM public.items WHERE centro_custo_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Itens (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.cost_centers WHERE codigo_pai = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Sub centros (' || v_count || '), '; END IF;

    WHEN 'formas_pagamento' THEN
      SELECT COUNT(*) INTO v_count FROM public.purchase_orders WHERE forma_pagamento_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Pedidos de Compra (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.sales_orders WHERE forma_pagamento_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Pedidos de Venda (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.inbound_documents WHERE forma_pagamento_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Doc. Entrada (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.outbound_documents WHERE forma_pagamento_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Doc. Saída (' || v_count || '), '; END IF;

    WHEN 'payment_conditions' THEN
      SELECT COUNT(*) INTO v_count FROM public.purchase_orders WHERE condicao_pagamento_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Pedidos de Compra (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.sales_orders WHERE condicao_pagamento_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Pedidos de Venda (' || v_count || '), '; END IF;
      SELECT COUNT(*) INTO v_count FROM public.inbound_documents WHERE condicao_pagamento_id = p_id;
      IF v_count > 0 THEN v_deps := v_deps || 'Doc. Entrada (' || v_count || '), '; END IF;

    ELSE
      RETURN '';
  END CASE;

  -- Remove trailing comma+space
  IF v_deps != '' THEN
    v_deps := rtrim(v_deps, ', ');
  END IF;

  RETURN v_deps;
END;
$$;
