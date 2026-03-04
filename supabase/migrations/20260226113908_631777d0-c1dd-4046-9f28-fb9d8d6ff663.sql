
-- 1) Add service_order_id to outbound_documents
ALTER TABLE public.outbound_documents
  ADD COLUMN IF NOT EXISTS service_order_id uuid REFERENCES public.service_orders(id);

CREATE INDEX IF NOT EXISTS idx_outbound_docs_service_order ON public.outbound_documents(service_order_id);

-- 2) Drop old function and recreate: only changes status, no financeiro
DROP FUNCTION IF EXISTS public.confirmar_ordem_servico;

CREATE FUNCTION public.confirmar_ordem_servico(p_os_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM service_orders WHERE id = p_os_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Ordem de serviço não encontrada';
  END IF;
  IF v_status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'Apenas OS com status RASCUNHO pode ser confirmada. Status atual: %', v_status;
  END IF;

  UPDATE service_orders
  SET status = 'CONFIRMADO',
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_os_id;
END;
$$;

-- 3) Function to generate outbound document from OS
CREATE OR REPLACE FUNCTION public.gerar_documento_saida_os(p_os_id uuid, p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_os service_orders%ROWTYPE;
  v_doc_id uuid;
  v_existing uuid;
BEGIN
  SELECT * INTO v_os FROM service_orders WHERE id = p_os_id;
  IF v_os.id IS NULL THEN
    RAISE EXCEPTION 'Ordem de serviço não encontrada';
  END IF;
  IF v_os.status <> 'CONFIRMADO' THEN
    RAISE EXCEPTION 'Apenas OS com status CONFIRMADO pode gerar documento de saída. Status atual: %', v_os.status;
  END IF;

  SELECT id INTO v_existing FROM outbound_documents WHERE service_order_id = p_os_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Já existe um documento de saída vinculado a esta OS';
  END IF;

  INSERT INTO outbound_documents (
    tenant_id, cliente_id, condicao_pagamento_id, valor_total,
    status, created_by, service_order_id
  ) VALUES (
    v_os.tenant_id, v_os.customer_id, v_os.condicao_pagamento_id, v_os.valor_total,
    'PENDENTE', p_user_id, p_os_id
  ) RETURNING id INTO v_doc_id;

  INSERT INTO outbound_document_items (outbound_document_id, item_id, quantidade, valor_unitario)
  SELECT v_doc_id, item_id, quantidade, valor_unitario
  FROM service_order_items
  WHERE service_order_id = p_os_id;

  UPDATE service_orders
  SET status = 'FATURADO',
      updated_by = p_user_id,
      updated_at = now()
  WHERE id = p_os_id;

  RETURN v_doc_id;
END;
$$;

-- 4) Trigger: block edit/delete of OS if outbound doc exists
CREATE OR REPLACE FUNCTION public.validate_service_order_with_doc()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_has_doc boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM outbound_documents WHERE service_order_id = OLD.id) INTO v_has_doc;

  IF TG_OP = 'DELETE' AND v_has_doc THEN
    RAISE EXCEPTION 'Não é possível excluir OS que possui documento de saída vinculado';
  END IF;

  IF TG_OP = 'UPDATE' AND v_has_doc THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND 
       NEW.customer_id = OLD.customer_id AND
       NEW.condicao_pagamento_id IS NOT DISTINCT FROM OLD.condicao_pagamento_id AND
       NEW.valor_total = OLD.valor_total THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Não é possível editar OS que possui documento de saída vinculado';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_service_order_doc ON public.service_orders;
CREATE TRIGGER trg_validate_service_order_doc
  BEFORE UPDATE OR DELETE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_service_order_with_doc();
