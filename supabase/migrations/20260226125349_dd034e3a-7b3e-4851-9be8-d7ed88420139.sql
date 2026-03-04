
-- Function to validate if a quotation can be edited
CREATE OR REPLACE FUNCTION public.validate_quotation_editable(p_quotation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_has_sales_order boolean;
BEGIN
  SELECT status INTO v_status FROM quotations WHERE id = p_quotation_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Orçamento não encontrado';
  END IF;
  IF v_status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'Orçamento não pode ser editado no status %', v_status;
  END IF;
  -- Check if already generated a sales order
  SELECT EXISTS(SELECT 1 FROM sales_orders WHERE quotation_id = p_quotation_id) INTO v_has_sales_order;
  IF v_has_sales_order THEN
    RAISE EXCEPTION 'Orçamento já gerou pedido de venda e não pode ser editado';
  END IF;
END;
$$;

-- Function to validate if a sales order can be edited
CREATE OR REPLACE FUNCTION public.validate_sales_order_editable(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_has_outbound boolean;
BEGIN
  SELECT status INTO v_status FROM sales_orders WHERE id = p_order_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Pedido de venda não encontrado';
  END IF;
  IF v_status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'Pedido de venda não pode ser editado no status %', v_status;
  END IF;
  SELECT EXISTS(SELECT 1 FROM outbound_documents WHERE pedido_venda_id = p_order_id) INTO v_has_outbound;
  IF v_has_outbound THEN
    RAISE EXCEPTION 'Pedido já gerou documento fiscal e não pode ser editado';
  END IF;
END;
$$;

-- Function to validate if a purchase order can be edited
CREATE OR REPLACE FUNCTION public.validate_purchase_order_editable(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_has_inbound boolean;
BEGIN
  SELECT status INTO v_status FROM purchase_orders WHERE id = p_order_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Pedido de compra não encontrado';
  END IF;
  IF v_status <> 'ABERTO' THEN
    RAISE EXCEPTION 'Pedido de compra não pode ser editado no status %', v_status;
  END IF;
  SELECT EXISTS(SELECT 1 FROM inbound_documents WHERE purchase_order_id = p_order_id) INTO v_has_inbound;
  IF v_has_inbound THEN
    RAISE EXCEPTION 'Pedido já gerou documento de entrada e não pode ser editado';
  END IF;
END;
$$;

-- Trigger to validate quotation edits
CREATE OR REPLACE FUNCTION public.trg_validate_quotation_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only validate if meaningful fields changed (not just status change from generate order)
  IF OLD.status = 'RASCUNHO' AND NEW.status <> OLD.status THEN
    RETURN NEW; -- Allow status transitions
  END IF;
  IF OLD.status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'Orçamento não pode ser editado no status %', OLD.status;
  END IF;
  PERFORM validate_quotation_editable(OLD.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_quotation_edit ON quotations;
CREATE TRIGGER trg_validate_quotation_edit
  BEFORE UPDATE ON quotations
  FOR EACH ROW
  EXECUTE FUNCTION trg_validate_quotation_edit();

-- Trigger to validate sales order edits
CREATE OR REPLACE FUNCTION public.trg_validate_sales_order_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'RASCUNHO' AND NEW.status <> OLD.status THEN
    RETURN NEW;
  END IF;
  IF OLD.status <> 'RASCUNHO' THEN
    RAISE EXCEPTION 'Pedido de venda não pode ser editado no status %', OLD.status;
  END IF;
  PERFORM validate_sales_order_editable(OLD.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_sales_order_edit ON sales_orders;
CREATE TRIGGER trg_validate_sales_order_edit
  BEFORE UPDATE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_validate_sales_order_edit();

-- Trigger to validate purchase order edits
CREATE OR REPLACE FUNCTION public.trg_validate_purchase_order_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'ABERTO' AND NEW.status <> OLD.status THEN
    RETURN NEW;
  END IF;
  IF OLD.status <> 'ABERTO' THEN
    RAISE EXCEPTION 'Pedido de compra não pode ser editado no status %', OLD.status;
  END IF;
  PERFORM validate_purchase_order_editable(OLD.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_purchase_order_edit ON purchase_orders;
CREATE TRIGGER trg_validate_purchase_order_edit
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION trg_validate_purchase_order_edit();
