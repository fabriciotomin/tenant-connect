
-- 1) Function to recalculate purchase order status from inbound_document_items
CREATE OR REPLACE FUNCTION public.recalc_po_status_from_inbound_items()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc RECORD;
  v_po_id uuid;
  v_total_pedida numeric;
  v_total_recebida numeric;
  v_new_status text;
BEGIN
  -- Get the inbound document for the affected item
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO v_doc FROM public.inbound_documents WHERE id = OLD.inbound_document_id;
  ELSE
    SELECT * INTO v_doc FROM public.inbound_documents WHERE id = NEW.inbound_document_id;
  END IF;

  IF v_doc IS NULL OR v_doc.purchase_order_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Skip if document is CANCELADO
  IF v_doc.status = 'CANCELADO' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  v_po_id := v_doc.purchase_order_id;

  -- Total ordered
  SELECT COALESCE(SUM(poi.quantidade), 0)
  INTO v_total_pedida
  FROM public.purchase_order_items poi
  WHERE poi.purchase_order_id = v_po_id;

  -- Total received from all non-cancelled inbound documents linked to this PO
  SELECT COALESCE(SUM(idi.quantidade), 0)
  INTO v_total_recebida
  FROM public.inbound_document_items idi
  JOIN public.inbound_documents idoc ON idoc.id = idi.inbound_document_id
  WHERE idoc.purchase_order_id = v_po_id
    AND idoc.status != 'CANCELADO';

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

-- 2) Trigger AFTER INSERT on inbound_document_items
DROP TRIGGER IF EXISTS trg_recalc_po_on_inbound_item_insert ON public.inbound_document_items;
CREATE TRIGGER trg_recalc_po_on_inbound_item_insert
AFTER INSERT ON public.inbound_document_items
FOR EACH ROW
EXECUTE FUNCTION public.recalc_po_status_from_inbound_items();

-- 3) Trigger AFTER DELETE on inbound_document_items
DROP TRIGGER IF EXISTS trg_recalc_po_on_inbound_item_delete ON public.inbound_document_items;
CREATE TRIGGER trg_recalc_po_on_inbound_item_delete
AFTER DELETE ON public.inbound_document_items
FOR EACH ROW
EXECUTE FUNCTION public.recalc_po_status_from_inbound_items();

-- 4) Unique index on (tenant_id, serie, numero) for inbound_documents - only when both are non-null
CREATE UNIQUE INDEX IF NOT EXISTS idx_inbound_documents_unique_serie_numero
ON public.inbound_documents (tenant_id, serie, numero)
WHERE serie IS NOT NULL AND numero IS NOT NULL;
