
-- Function to validate if a service order can be edited
CREATE OR REPLACE FUNCTION public.validate_service_order_editable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow status changes by RPCs (confirmar_ordem_servico, gerar_documento_saida_os)
  -- by checking if ONLY status/updated_at/updated_by changed
  IF OLD.status != 'RASCUNHO' THEN
    -- Check if any field other than status, updated_at, updated_by changed
    IF (
      NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
      NEW.condicao_pagamento_id IS DISTINCT FROM OLD.condicao_pagamento_id OR
      NEW.data_inicio IS DISTINCT FROM OLD.data_inicio OR
      NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio OR
      NEW.data_fim IS DISTINCT FROM OLD.data_fim OR
      NEW.hora_fim IS DISTINCT FROM OLD.hora_fim OR
      NEW.data_inicio_prevista IS DISTINCT FROM OLD.data_inicio_prevista OR
      NEW.data_fim_prevista IS DISTINCT FROM OLD.data_fim_prevista OR
      NEW.valor_total IS DISTINCT FROM OLD.valor_total
    ) THEN
      RAISE EXCEPTION 'Ordem de Serviço com status % não pode ser editada. Apenas OS com status RASCUNHO pode ser alterada.', OLD.status;
    END IF;
  END IF;

  -- Block edits if outbound document exists (even for RASCUNHO, shouldn't happen but safety net)
  IF (
    NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
    NEW.condicao_pagamento_id IS DISTINCT FROM OLD.condicao_pagamento_id OR
    NEW.data_inicio IS DISTINCT FROM OLD.data_inicio OR
    NEW.hora_inicio IS DISTINCT FROM OLD.hora_inicio OR
    NEW.data_fim IS DISTINCT FROM OLD.data_fim OR
    NEW.hora_fim IS DISTINCT FROM OLD.hora_fim OR
    NEW.valor_total IS DISTINCT FROM OLD.valor_total
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.outbound_documents
      WHERE service_order_id = OLD.id
    ) THEN
      RAISE EXCEPTION 'Ordem de Serviço já possui Documento de Saída vinculado e não pode ser alterada.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_validate_service_order_editable ON public.service_orders;
CREATE TRIGGER trg_validate_service_order_editable
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_service_order_editable();
