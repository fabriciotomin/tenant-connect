
-- Fix validate_purchase_order_editable to exclude CANCELADO and PENDENTE documents
-- Only PROCESSADO documents should block editing
CREATE OR REPLACE FUNCTION public.validate_purchase_order_editable(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_has_confirmed_inbound boolean;
BEGIN
  SELECT status INTO v_status FROM purchase_orders WHERE id = p_order_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Pedido de compra não encontrado';
  END IF;
  IF v_status <> 'ABERTO' THEN
    RAISE EXCEPTION 'Pedido de compra não pode ser editado no status %', v_status;
  END IF;
  -- Only block if there are PROCESSADO (confirmed) inbound documents
  SELECT EXISTS(
    SELECT 1 FROM inbound_documents 
    WHERE purchase_order_id = p_order_id 
      AND status = 'PROCESSADO'
  ) INTO v_has_confirmed_inbound;
  IF v_has_confirmed_inbound THEN
    RAISE EXCEPTION 'Pedido já possui documento de entrada confirmado e não pode ser editado';
  END IF;
END;
$$;

-- Fix the trigger to skip validation when only status/updated_at are changing
-- (i.e., when recalc triggers update the PO status)
CREATE OR REPLACE FUNCTION public.trg_validate_purchase_order_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow status changes (from recalc triggers)
  IF OLD.status <> NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Allow if only updated_at changed
  IF OLD.fornecedor_id = NEW.fornecedor_id
    AND OLD.data_entrega IS NOT DISTINCT FROM NEW.data_entrega
    AND OLD.valor_frete = NEW.valor_frete
    AND OLD.condicao_pagamento_id IS NOT DISTINCT FROM NEW.condicao_pagamento_id
    AND OLD.forma_pagamento_id IS NOT DISTINCT FROM NEW.forma_pagamento_id
    AND OLD.comprador_id IS NOT DISTINCT FROM NEW.comprador_id
    AND OLD.frete_tipo = NEW.frete_tipo
  THEN
    RETURN NEW;
  END IF;
  
  -- For actual data edits, validate
  IF OLD.status <> 'ABERTO' THEN
    RAISE EXCEPTION 'Pedido de compra não pode ser editado no status %', OLD.status;
  END IF;
  
  PERFORM validate_purchase_order_editable(OLD.id);
  RETURN NEW;
END;
$$;
