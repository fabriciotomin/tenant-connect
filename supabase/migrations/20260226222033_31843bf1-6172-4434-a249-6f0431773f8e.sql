
-- RPC: Cancel Quotation
-- Allowed if status != APROVADO (converted) and != CANCELADO
CREATE OR REPLACE FUNCTION public.cancel_quotation(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_tenant_id uuid;
BEGIN
  SELECT status, tenant_id INTO v_status, v_tenant_id FROM quotations WHERE id = p_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Orçamento não encontrado';
  END IF;
  IF v_status = 'CANCELADO' THEN
    RAISE EXCEPTION 'Orçamento já está cancelado';
  END IF;
  IF v_status = 'APROVADO' THEN
    RAISE EXCEPTION 'Orçamento já foi convertido em pedido e não pode ser cancelado';
  END IF;
  UPDATE quotations SET status = 'CANCELADO', updated_at = now() WHERE id = p_id;
END;
$$;

-- RPC: Cancel Sales Order
-- Allowed if no outbound document exists and status != CANCELADO
CREATE OR REPLACE FUNCTION public.cancel_sales_order(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_has_outbound boolean;
BEGIN
  SELECT status INTO v_status FROM sales_orders WHERE id = p_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Pedido de venda não encontrado';
  END IF;
  IF v_status = 'CANCELADO' THEN
    RAISE EXCEPTION 'Pedido já está cancelado';
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM outbound_documents WHERE pedido_venda_id = p_id AND status <> 'CANCELADO'
  ) INTO v_has_outbound;
  IF v_has_outbound THEN
    RAISE EXCEPTION 'Pedido possui documento de saída vinculado e não pode ser cancelado';
  END IF;
  UPDATE sales_orders SET status = 'CANCELADO', updated_at = now() WHERE id = p_id;
END;
$$;

-- RPC: Cancel Purchase Order
-- Allowed if no PROCESSADO inbound document and status != CANCELADO
CREATE OR REPLACE FUNCTION public.cancel_purchase_order(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_has_confirmed boolean;
BEGIN
  SELECT status INTO v_status FROM purchase_orders WHERE id = p_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Pedido de compra não encontrado';
  END IF;
  IF v_status = 'CANCELADO' THEN
    RAISE EXCEPTION 'Pedido já está cancelado';
  END IF;
  SELECT EXISTS(
    SELECT 1 FROM inbound_documents WHERE purchase_order_id = p_id AND status = 'PROCESSADO'
  ) INTO v_has_confirmed;
  IF v_has_confirmed THEN
    RAISE EXCEPTION 'Pedido possui documento de entrada confirmado e não pode ser cancelado';
  END IF;
  -- Cancel any pending inbound documents linked to this PO
  UPDATE inbound_documents SET status = 'CANCELADO', updated_at = now()
    WHERE purchase_order_id = p_id AND status = 'PENDENTE';
  UPDATE purchase_orders SET status = 'CANCELADO', updated_at = now() WHERE id = p_id;
END;
$$;
