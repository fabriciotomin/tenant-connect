
-- Add FATURADO to the allowed status values
ALTER TABLE public.service_orders DROP CONSTRAINT service_orders_status_check;
ALTER TABLE public.service_orders ADD CONSTRAINT service_orders_status_check
  CHECK (status = ANY (ARRAY['RASCUNHO','CONFIRMADO','FATURADO','CANCELADO']));
