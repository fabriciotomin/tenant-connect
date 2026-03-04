
-- 1) Add ativo to tables that don't have it
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;
ALTER TABLE public.item_groups ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- 2) Add preco_venda to items
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS preco_venda numeric NOT NULL DEFAULT 0;

-- 3) Status validation triggers

-- Purchase Orders: edit/delete only if ABERTO, cancel if not ATENDIDO
CREATE OR REPLACE FUNCTION public.validate_purchase_order_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'ABERTO' THEN
      RAISE EXCEPTION 'Pedido de compra só pode ser excluído com status ABERTO';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    -- Allow cancel if not ATENDIDO
    IF NEW.status = 'CANCELADO' AND OLD.status = 'ATENDIDO' THEN
      RAISE EXCEPTION 'Pedido de compra ATENDIDO não pode ser cancelado';
    END IF;
    -- Block edits (non-status changes) if not ABERTO
    IF OLD.status <> 'ABERTO' AND NEW.status = OLD.status THEN
      RAISE EXCEPTION 'Pedido de compra só pode ser editado com status ABERTO';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_purchase_order_status ON public.purchase_orders;
CREATE TRIGGER trg_validate_purchase_order_status
  BEFORE UPDATE OR DELETE ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_purchase_order_status();

-- Sales Orders: edit/delete only if RASCUNHO/ABERTO, cancel if not PROCESSADO
CREATE OR REPLACE FUNCTION public.validate_sales_order_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status NOT IN ('RASCUNHO', 'ABERTO') THEN
      RAISE EXCEPTION 'Pedido de venda só pode ser excluído com status ABERTO';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'CANCELADO' AND OLD.status = 'PROCESSADO' THEN
      RAISE EXCEPTION 'Pedido de venda PROCESSADO não pode ser cancelado';
    END IF;
    IF OLD.status NOT IN ('RASCUNHO', 'ABERTO') AND NEW.status = OLD.status THEN
      RAISE EXCEPTION 'Pedido de venda só pode ser editado com status ABERTO';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_sales_order_status ON public.sales_orders;
CREATE TRIGGER trg_validate_sales_order_status
  BEFORE UPDATE OR DELETE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_sales_order_status();

-- Inbound Documents: edit/delete only if PENDENTE, cancel if no paid parcels
CREATE OR REPLACE FUNCTION public.validate_inbound_document_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'PENDENTE' THEN
      RAISE EXCEPTION 'Documento de entrada só pode ser excluído com status PENDENTE';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'CANCELADO' AND OLD.status <> 'PENDENTE' THEN
      -- Check for paid parcels
      IF EXISTS (SELECT 1 FROM accounts_payable WHERE documento_origem = OLD.id::text AND status = 'BAIXADO') THEN
        RAISE EXCEPTION 'Documento de entrada com baixa financeira não pode ser cancelado';
      END IF;
    END IF;
    IF OLD.status <> 'PENDENTE' AND NEW.status = OLD.status THEN
      RAISE EXCEPTION 'Documento de entrada só pode ser editado com status PENDENTE';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_inbound_document_status ON public.inbound_documents;
CREATE TRIGGER trg_validate_inbound_document_status
  BEFORE UPDATE OR DELETE ON public.inbound_documents
  FOR EACH ROW EXECUTE FUNCTION public.validate_inbound_document_status();

-- Outbound Documents: edit/delete only if PENDENTE, cancel if no paid parcels
CREATE OR REPLACE FUNCTION public.validate_outbound_document_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'PENDENTE' THEN
      RAISE EXCEPTION 'Documento de saída só pode ser excluído com status PENDENTE';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'CANCELADO' AND OLD.status <> 'PENDENTE' THEN
      IF EXISTS (SELECT 1 FROM accounts_receivable WHERE documento_origem = OLD.id::text AND status = 'BAIXADO') THEN
        RAISE EXCEPTION 'Documento de saída com baixa financeira não pode ser cancelado';
      END IF;
    END IF;
    IF OLD.status <> 'PENDENTE' AND NEW.status = OLD.status THEN
      RAISE EXCEPTION 'Documento de saída só pode ser editado com status PENDENTE';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_outbound_document_status ON public.outbound_documents;
CREATE TRIGGER trg_validate_outbound_document_status
  BEFORE UPDATE OR DELETE ON public.outbound_documents
  FOR EACH ROW EXECUTE FUNCTION public.validate_outbound_document_status();

-- Service Orders: edit/delete only if RASCUNHO/ABERTA, cancel if not CONCLUIDA/FATURADA
CREATE OR REPLACE FUNCTION public.validate_service_order_status()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status NOT IN ('RASCUNHO', 'ABERTA') THEN
      RAISE EXCEPTION 'Ordem de serviço só pode ser excluída com status ABERTA';
    END IF;
    RETURN OLD;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'CANCELADA' AND OLD.status IN ('CONCLUIDA', 'FATURADA') THEN
      RAISE EXCEPTION 'Ordem de serviço CONCLUÍDA/FATURADA não pode ser cancelada';
    END IF;
    IF OLD.status NOT IN ('RASCUNHO', 'ABERTA') AND NEW.status = OLD.status THEN
      RAISE EXCEPTION 'Ordem de serviço só pode ser editada com status ABERTA';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_service_order_status ON public.service_orders;
CREATE TRIGGER trg_validate_service_order_status
  BEFORE UPDATE OR DELETE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_service_order_status();
