
-- Add date/time fields to service_orders
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS data_inicio date,
  ADD COLUMN IF NOT EXISTS hora_inicio time without time zone,
  ADD COLUMN IF NOT EXISTS data_fim date,
  ADD COLUMN IF NOT EXISTS hora_fim time without time zone;

-- Validation trigger: data_fim+hora_fim >= data_inicio+hora_inicio
CREATE OR REPLACE FUNCTION public.validate_service_order_dates()
RETURNS TRIGGER AS $$
BEGIN
  -- On confirm, require all date/time fields
  IF NEW.status IN ('CONFIRMADO', 'FATURADO') THEN
    IF NEW.data_inicio IS NULL OR NEW.hora_inicio IS NULL OR NEW.data_fim IS NULL OR NEW.hora_fim IS NULL THEN
      RAISE EXCEPTION 'Data/hora de início e fim são obrigatórios para confirmar a OS';
    END IF;
  END IF;

  -- Validate end >= start when both are set
  IF NEW.data_inicio IS NOT NULL AND NEW.hora_inicio IS NOT NULL
     AND NEW.data_fim IS NOT NULL AND NEW.hora_fim IS NOT NULL THEN
    IF (NEW.data_fim + NEW.hora_fim) < (NEW.data_inicio + NEW.hora_inicio) THEN
      RAISE EXCEPTION 'Data/hora de fim deve ser maior ou igual à data/hora de início';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_service_order_dates ON public.service_orders;
CREATE TRIGGER trg_validate_service_order_dates
  BEFORE INSERT OR UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_service_order_dates();
