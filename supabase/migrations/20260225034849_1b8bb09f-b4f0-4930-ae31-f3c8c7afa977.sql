
-- =============================================
-- 1) ACCOUNTING PERIODS TABLE
-- =============================================
CREATE TABLE public.accounting_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  fechado BOOLEAN NOT NULL DEFAULT false,
  fechado_por UUID,
  fechado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, ano, mes)
);

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_global_all_accounting_periods" ON public.accounting_periods FOR ALL
  USING (public.is_admin_global(auth.uid()))
  WITH CHECK (public.is_admin_global(auth.uid()));

CREATE POLICY "admin_empresa_all_accounting_periods" ON public.accounting_periods FOR ALL
  USING (public.is_admin_empresa(auth.uid(), tenant_id))
  WITH CHECK (public.is_admin_empresa(auth.uid(), tenant_id));

CREATE POLICY "user_select_accounting_periods" ON public.accounting_periods FOR SELECT
  USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE TRIGGER update_accounting_periods_updated_at
  BEFORE UPDATE ON public.accounting_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 2) HELPER: Check if period is closed
-- =============================================
CREATE OR REPLACE FUNCTION public.is_period_closed(p_tenant_id UUID, p_date DATE)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT fechado FROM public.accounting_periods
     WHERE tenant_id = p_tenant_id
       AND ano = EXTRACT(YEAR FROM p_date)
       AND mes = EXTRACT(MONTH FROM p_date)),
    false
  )
$$;

-- =============================================
-- 3) BLOCK TRIGGERS: prevent edit/delete on confirmed docs
-- =============================================

-- Block UPDATE on confirmed inbound_documents (except by admin_global changing to CANCELADO via function)
CREATE OR REPLACE FUNCTION public.block_confirmed_inbound_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow status change from PROCESSADO to CANCELADO (done by cancellation function with SECURITY DEFINER)
  IF OLD.status = 'PROCESSADO' AND NEW.status = 'CANCELADO' THEN
    RETURN NEW;
  END IF;
  -- Block any other change on confirmed docs
  IF OLD.status = 'PROCESSADO' THEN
    RAISE EXCEPTION 'Documento de entrada confirmado não pode ser alterado. Use a função de cancelamento.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_confirmed_inbound_update
  BEFORE UPDATE ON public.inbound_documents
  FOR EACH ROW EXECUTE FUNCTION public.block_confirmed_inbound_update();

-- Block DELETE on confirmed inbound_documents
CREATE OR REPLACE FUNCTION public.block_confirmed_inbound_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('PROCESSADO', 'CANCELADO') THEN
    RAISE EXCEPTION 'Documento de entrada confirmado/cancelado não pode ser excluído.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_block_confirmed_inbound_delete
  BEFORE DELETE ON public.inbound_documents
  FOR EACH ROW EXECUTE FUNCTION public.block_confirmed_inbound_delete();

-- Block UPDATE on confirmed outbound_documents
CREATE OR REPLACE FUNCTION public.block_confirmed_outbound_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'PROCESSADO' AND NEW.status = 'CANCELADO' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'PROCESSADO' THEN
    RAISE EXCEPTION 'Documento de saída confirmado não pode ser alterado. Use a função de cancelamento.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_confirmed_outbound_update
  BEFORE UPDATE ON public.outbound_documents
  FOR EACH ROW EXECUTE FUNCTION public.block_confirmed_outbound_update();

-- Block DELETE on confirmed outbound_documents
CREATE OR REPLACE FUNCTION public.block_confirmed_outbound_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IN ('PROCESSADO', 'CANCELADO') THEN
    RAISE EXCEPTION 'Documento de saída confirmado/cancelado não pode ser excluído.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_block_confirmed_outbound_delete
  BEFORE DELETE ON public.outbound_documents
  FOR EACH ROW EXECUTE FUNCTION public.block_confirmed_outbound_delete();

-- Block changes to items of confirmed inbound documents
CREATE OR REPLACE FUNCTION public.block_confirmed_inbound_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO v_status FROM public.inbound_documents WHERE id = OLD.inbound_document_id;
  ELSE
    SELECT status INTO v_status FROM public.inbound_documents WHERE id = NEW.inbound_document_id;
  END IF;

  IF v_status IN ('PROCESSADO', 'CANCELADO') THEN
    RAISE EXCEPTION 'Não é possível alterar itens de documento de entrada confirmado/cancelado.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_block_confirmed_inbound_items
  BEFORE INSERT OR UPDATE OR DELETE ON public.inbound_document_items
  FOR EACH ROW EXECUTE FUNCTION public.block_confirmed_inbound_items();

-- Block changes to items of confirmed outbound documents
CREATE OR REPLACE FUNCTION public.block_confirmed_outbound_items()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT status INTO v_status FROM public.outbound_documents WHERE id = OLD.outbound_document_id;
  ELSE
    SELECT status INTO v_status FROM public.outbound_documents WHERE id = NEW.outbound_document_id;
  END IF;

  IF v_status IN ('PROCESSADO', 'CANCELADO') THEN
    RAISE EXCEPTION 'Não é possível alterar itens de documento de saída confirmado/cancelado.';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

CREATE TRIGGER trg_block_confirmed_outbound_items
  BEFORE INSERT OR UPDATE OR DELETE ON public.outbound_document_items
  FOR EACH ROW EXECUTE FUNCTION public.block_confirmed_outbound_items();

-- =============================================
-- 4) CANCELAR DOCUMENTO DE ENTRADA (transactional)
-- =============================================
CREATE OR REPLACE FUNCTION public.cancelar_documento_entrada(p_document_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_item RECORD;
  v_has_paid BOOLEAN;
BEGIN
  -- Lock document
  SELECT * INTO v_doc FROM public.inbound_documents WHERE id = p_document_id FOR UPDATE;

  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Documento não encontrado: %', p_document_id;
  END IF;

  IF v_doc.status != 'PROCESSADO' THEN
    RAISE EXCEPTION 'Somente documentos PROCESSADOS podem ser cancelados (status atual: %)', v_doc.status;
  END IF;

  -- Only admin_global can cancel
  IF p_user_id IS NOT NULL AND NOT public.is_admin_global(p_user_id) THEN
    RAISE EXCEPTION 'Somente Admin Global pode cancelar documentos confirmados';
  END IF;

  -- Check for paid accounts payable
  SELECT EXISTS (
    SELECT 1 FROM public.accounts_payable
    WHERE documento_origem LIKE 'NF-E-' || COALESCE(v_doc.numero, v_doc.id::text) || '%'
      AND tenant_id = v_doc.tenant_id
      AND status = 'PAGO'
  ) INTO v_has_paid;

  IF v_has_paid THEN
    RAISE EXCEPTION 'Não é possível cancelar: existem títulos já baixados vinculados a este documento. Estorne as baixas primeiro.';
  END IF;

  -- Check closed period
  IF public.is_period_closed(v_doc.tenant_id, CURRENT_DATE) THEN
    RAISE EXCEPTION 'Período contábil fechado. Não é possível cancelar.';
  END IF;

  -- 1) Reverse stock movements
  IF v_doc.purchase_order_id IS NOT NULL THEN
    FOR v_item IN
      SELECT poi.item_id, poi.quantidade, poi.valor_unitario
      FROM public.purchase_order_items poi
      WHERE poi.purchase_order_id = v_doc.purchase_order_id
    LOOP
      INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
      VALUES (v_doc.tenant_id, v_item.item_id, 'SAIDA', v_item.quantidade, v_item.valor_unitario,
              'CANC-NF-E-' || COALESCE(v_doc.numero, v_doc.id::text), p_user_id);
    END LOOP;

    -- Revert PO status back to ABERTO
    UPDATE public.purchase_orders
    SET status = 'ABERTO', updated_at = now(), updated_by = p_user_id
    WHERE id = v_doc.purchase_order_id AND tenant_id = v_doc.tenant_id;
  ELSE
    FOR v_item IN
      SELECT idi.item_id, idi.quantidade, idi.valor_unitario
      FROM public.inbound_document_items idi
      WHERE idi.inbound_document_id = p_document_id
    LOOP
      INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
      VALUES (v_doc.tenant_id, v_item.item_id, 'SAIDA', v_item.quantidade, v_item.valor_unitario,
              'CANC-NF-E-' || COALESCE(v_doc.numero, v_doc.id::text), p_user_id);
    END LOOP;
  END IF;

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

  -- 4) Audit log
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_anteriores, dados_novos)
  VALUES (
    v_doc.tenant_id, p_user_id, 'CANCELAR_ENTRADA', 'inbound_documents', p_document_id::text,
    jsonb_build_object('status', 'PROCESSADO', 'valor_total', v_doc.valor_total),
    jsonb_build_object('status', 'CANCELADO', 'motivo', 'Cancelamento por admin')
  );
END;
$$;

-- =============================================
-- 5) CANCELAR DOCUMENTO DE SAÍDA (transactional)
-- =============================================
CREATE OR REPLACE FUNCTION public.cancelar_documento_saida(p_document_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_item RECORD;
  v_has_paid BOOLEAN;
BEGIN
  -- Lock document
  SELECT * INTO v_doc FROM public.outbound_documents WHERE id = p_document_id FOR UPDATE;

  IF v_doc IS NULL THEN
    RAISE EXCEPTION 'Documento não encontrado: %', p_document_id;
  END IF;

  IF v_doc.status != 'PROCESSADO' THEN
    RAISE EXCEPTION 'Somente documentos PROCESSADOS podem ser cancelados (status atual: %)', v_doc.status;
  END IF;

  -- Only admin_global can cancel confirmed docs
  IF p_user_id IS NOT NULL AND NOT public.is_admin_global(p_user_id) THEN
    RAISE EXCEPTION 'Somente Admin Global pode cancelar documentos confirmados';
  END IF;

  -- Check for paid receivables
  SELECT EXISTS (
    SELECT 1 FROM public.accounts_receivable
    WHERE documento_origem LIKE 'NF-S-' || COALESCE(v_doc.numero, v_doc.id::text) || '%'
      AND tenant_id = v_doc.tenant_id
      AND status = 'PAGO'
  ) INTO v_has_paid;

  IF v_has_paid THEN
    RAISE EXCEPTION 'Não é possível cancelar: existem títulos já baixados vinculados a este documento. Estorne as baixas primeiro.';
  END IF;

  -- Check closed period
  IF public.is_period_closed(v_doc.tenant_id, CURRENT_DATE) THEN
    RAISE EXCEPTION 'Período contábil fechado. Não é possível cancelar.';
  END IF;

  -- 1) Reverse stock movements (ENTRADA reversa)
  FOR v_item IN
    SELECT odi.item_id, odi.quantidade, i.custo_medio
    FROM public.outbound_document_items odi
    JOIN public.items i ON i.id = odi.item_id
    WHERE odi.outbound_document_id = p_document_id
  LOOP
    INSERT INTO public.stock_movements (tenant_id, item_id, tipo, quantidade, custo_unitario, documento_origem, created_by)
    VALUES (v_doc.tenant_id, v_item.item_id, 'ENTRADA', v_item.quantidade, v_item.custo_medio,
            'CANC-NF-S-' || COALESCE(v_doc.numero, v_doc.id::text), p_user_id);
  END LOOP;

  -- 2) Cancel open accounts receivable
  UPDATE public.accounts_receivable
  SET status = 'CANCELADO', updated_at = now(), updated_by = p_user_id
  WHERE documento_origem LIKE 'NF-S-' || COALESCE(v_doc.numero, v_doc.id::text) || '%'
    AND tenant_id = v_doc.tenant_id
    AND status = 'ABERTO';

  -- 3) Cancel commissions
  DELETE FROM public.comissoes
  WHERE documento_id = p_document_id AND tenant_id = v_doc.tenant_id;

  -- 4) Update document status
  UPDATE public.outbound_documents
  SET status = 'CANCELADO', updated_at = now(), updated_by = p_user_id
  WHERE id = p_document_id;

  -- 5) Audit log
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_anteriores, dados_novos)
  VALUES (
    v_doc.tenant_id, p_user_id, 'CANCELAR_SAIDA', 'outbound_documents', p_document_id::text,
    jsonb_build_object('status', 'PROCESSADO', 'valor_total', v_doc.valor_total),
    jsonb_build_object('status', 'CANCELADO', 'motivo', 'Cancelamento por admin')
  );
END;
$$;

-- =============================================
-- 6) ESTORNAR BAIXA DE TÍTULO (PAGAR)
-- =============================================
CREATE OR REPLACE FUNCTION public.estornar_baixa_pagar(p_titulo_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo RECORD;
BEGIN
  SELECT * INTO v_titulo FROM public.accounts_payable WHERE id = p_titulo_id FOR UPDATE;

  IF v_titulo IS NULL THEN
    RAISE EXCEPTION 'Título não encontrado: %', p_titulo_id;
  END IF;

  IF v_titulo.status != 'PAGO' THEN
    RAISE EXCEPTION 'Somente títulos PAGOS podem ser estornados (status: %)', v_titulo.status;
  END IF;

  -- Only admin_global
  IF p_user_id IS NOT NULL AND NOT public.is_admin_global(p_user_id) THEN
    RAISE EXCEPTION 'Somente Admin Global pode estornar baixas';
  END IF;

  -- Check closed period
  IF public.is_period_closed(v_titulo.tenant_id, COALESCE(v_titulo.data_baixa, CURRENT_DATE)) THEN
    RAISE EXCEPTION 'Período contábil fechado. Não é possível estornar.';
  END IF;

  -- 1) Revert titulo status
  UPDATE public.accounts_payable
  SET status = 'ABERTO', data_baixa = NULL, updated_at = now(), updated_by = p_user_id
  WHERE id = p_titulo_id;

  -- 2) Reverse bank movement
  INSERT INTO public.bank_movements (tenant_id, banco_id, tipo, valor, data, referencia, created_by)
  SELECT v_titulo.tenant_id, bm.banco_id, 'ENTRADA', v_titulo.valor, CURRENT_DATE,
         'ESTORNO-CP-' || p_titulo_id::text, p_user_id
  FROM public.bank_movements bm
  WHERE bm.referencia = 'CP-' || p_titulo_id::text
    AND bm.tenant_id = v_titulo.tenant_id
  LIMIT 1;

  -- 3) Audit log
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_anteriores, dados_novos)
  VALUES (
    v_titulo.tenant_id, p_user_id, 'ESTORNO_BAIXA_PAGAR', 'accounts_payable', p_titulo_id::text,
    jsonb_build_object('status', 'PAGO', 'data_baixa', v_titulo.data_baixa, 'valor', v_titulo.valor),
    jsonb_build_object('status', 'ABERTO', 'data_baixa', NULL)
  );
END;
$$;

-- =============================================
-- 7) ESTORNAR BAIXA DE TÍTULO (RECEBER)
-- =============================================
CREATE OR REPLACE FUNCTION public.estornar_baixa_receber(p_titulo_id UUID, p_user_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_titulo RECORD;
BEGIN
  SELECT * INTO v_titulo FROM public.accounts_receivable WHERE id = p_titulo_id FOR UPDATE;

  IF v_titulo IS NULL THEN
    RAISE EXCEPTION 'Título não encontrado: %', p_titulo_id;
  END IF;

  IF v_titulo.status != 'PAGO' THEN
    RAISE EXCEPTION 'Somente títulos PAGOS podem ser estornados (status: %)', v_titulo.status;
  END IF;

  IF p_user_id IS NOT NULL AND NOT public.is_admin_global(p_user_id) THEN
    RAISE EXCEPTION 'Somente Admin Global pode estornar baixas';
  END IF;

  IF public.is_period_closed(v_titulo.tenant_id, COALESCE(v_titulo.data_baixa, CURRENT_DATE)) THEN
    RAISE EXCEPTION 'Período contábil fechado. Não é possível estornar.';
  END IF;

  -- 1) Revert titulo
  UPDATE public.accounts_receivable
  SET status = 'ABERTO', data_baixa = NULL, updated_at = now(), updated_by = p_user_id
  WHERE id = p_titulo_id;

  -- 2) Reverse bank movement
  INSERT INTO public.bank_movements (tenant_id, banco_id, tipo, valor, data, referencia, created_by)
  SELECT v_titulo.tenant_id, bm.banco_id, 'SAIDA', v_titulo.valor, CURRENT_DATE,
         'ESTORNO-CR-' || p_titulo_id::text, p_user_id
  FROM public.bank_movements bm
  WHERE bm.referencia = 'CR-' || p_titulo_id::text
    AND bm.tenant_id = v_titulo.tenant_id
  LIMIT 1;

  -- 3) Audit log
  INSERT INTO public.audit_logs (tenant_id, user_id, acao, entidade, entidade_id, dados_anteriores, dados_novos)
  VALUES (
    v_titulo.tenant_id, p_user_id, 'ESTORNO_BAIXA_RECEBER', 'accounts_receivable', p_titulo_id::text,
    jsonb_build_object('status', 'PAGO', 'data_baixa', v_titulo.data_baixa, 'valor', v_titulo.valor),
    jsonb_build_object('status', 'ABERTO', 'data_baixa', NULL)
  );
END;
$$;
