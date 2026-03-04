
-- =============================================
-- PROBLEMA 1: Separar séries ENTRADA vs SAÍDA
-- =============================================

-- Add tipo_documento column
ALTER TABLE public.document_series 
ADD COLUMN IF NOT EXISTS tipo_documento text NOT NULL DEFAULT 'SAIDA';

-- Update get_next_inbound_number to filter by tipo_documento = 'ENTRADA'
CREATE OR REPLACE FUNCTION public.get_next_inbound_number(p_tenant_id uuid, p_serie text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
BEGIN
  UPDATE public.document_series
  SET proximo_numero = proximo_numero + 1, updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND serie = p_serie
    AND ativo = true
    AND tipo_documento = 'ENTRADA'
  RETURNING proximo_numero - 1 INTO v_next;

  IF v_next IS NULL THEN
    v_next := 1;
  END IF;

  RETURN v_next;
END;
$$;

-- =============================================
-- PROBLEMA 2: Trigger só conta docs PROCESSADO
-- =============================================

CREATE OR REPLACE FUNCTION public.recalc_po_status_from_inbound_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_po_id uuid;
  v_total_pedida numeric;
  v_total_recebida numeric;
  v_new_status text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO v_doc FROM public.inbound_documents WHERE id = OLD.inbound_document_id;
  ELSE
    SELECT * INTO v_doc FROM public.inbound_documents WHERE id = NEW.inbound_document_id;
  END IF;

  IF v_doc IS NULL OR v_doc.purchase_order_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF v_doc.status = 'CANCELADO' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  v_po_id := v_doc.purchase_order_id;

  -- Total ordered
  SELECT COALESCE(SUM(poi.quantidade), 0)
  INTO v_total_pedida
  FROM public.purchase_order_items poi
  WHERE poi.purchase_order_id = v_po_id;

  -- ONLY count items from PROCESSADO documents (not PENDENTE)
  SELECT COALESCE(SUM(idi.quantidade), 0)
  INTO v_total_recebida
  FROM public.inbound_document_items idi
  JOIN public.inbound_documents idoc ON idoc.id = idi.inbound_document_id
  WHERE idoc.purchase_order_id = v_po_id
    AND idoc.status = 'PROCESSADO';

  IF v_total_recebida <= 0 THEN
    v_new_status := 'ABERTO';
  ELSIF v_total_recebida < v_total_pedida THEN
    v_new_status := 'PARCIAL';
  ELSE
    v_new_status := 'ATENDIDO';
  END IF;

  UPDATE public.purchase_orders
  SET status = v_new_status::status_pedido_compra,
      updated_at = now()
  WHERE id = v_po_id;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Also need to recalc PO status when inbound_document status changes (PENDENTE->PROCESSADO or CANCELADO)
CREATE OR REPLACE FUNCTION public.recalc_po_status_on_doc_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_id uuid;
  v_total_pedida numeric;
  v_total_recebida numeric;
  v_new_status text;
BEGIN
  -- Only act when status changes and document is linked to a PO
  IF NEW.purchase_order_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_po_id := NEW.purchase_order_id;

  SELECT COALESCE(SUM(poi.quantidade), 0)
  INTO v_total_pedida
  FROM public.purchase_order_items poi
  WHERE poi.purchase_order_id = v_po_id;

  SELECT COALESCE(SUM(idi.quantidade), 0)
  INTO v_total_recebida
  FROM public.inbound_document_items idi
  JOIN public.inbound_documents idoc ON idoc.id = idi.inbound_document_id
  WHERE idoc.purchase_order_id = v_po_id
    AND idoc.status = 'PROCESSADO';

  IF v_total_recebida <= 0 THEN
    v_new_status := 'ABERTO';
  ELSIF v_total_recebida < v_total_pedida THEN
    v_new_status := 'PARCIAL';
  ELSE
    v_new_status := 'ATENDIDO';
  END IF;

  UPDATE public.purchase_orders
  SET status = v_new_status::status_pedido_compra,
      updated_at = now()
  WHERE id = v_po_id;

  RETURN NEW;
END;
$$;

-- Create trigger for doc status changes
DROP TRIGGER IF EXISTS trg_recalc_po_on_doc_status ON public.inbound_documents;
CREATE TRIGGER trg_recalc_po_on_doc_status
  AFTER UPDATE OF status ON public.inbound_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.recalc_po_status_on_doc_status_change();
