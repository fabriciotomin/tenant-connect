
-- Fix: Replace MAX() + FOR UPDATE with ORDER BY + LIMIT 1 + FOR UPDATE

CREATE OR REPLACE FUNCTION public.assign_numero_sequencial_quotations()
RETURNS TRIGGER AS $$
DECLARE v_next INTEGER;
BEGIN
  SELECT numero_sequencial + 1 INTO v_next
  FROM public.quotations
  WHERE tenant_id = NEW.tenant_id
  ORDER BY numero_sequencial DESC
  LIMIT 1
  FOR UPDATE;

  NEW.numero_sequencial := COALESCE(v_next, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.assign_numero_sequencial_sales_orders()
RETURNS TRIGGER AS $$
DECLARE v_next INTEGER;
BEGIN
  SELECT numero_sequencial + 1 INTO v_next
  FROM public.sales_orders
  WHERE tenant_id = NEW.tenant_id
  ORDER BY numero_sequencial DESC
  LIMIT 1
  FOR UPDATE;

  NEW.numero_sequencial := COALESCE(v_next, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.assign_numero_sequencial_purchase_orders()
RETURNS TRIGGER AS $$
DECLARE v_next INTEGER;
BEGIN
  SELECT numero_sequencial + 1 INTO v_next
  FROM public.purchase_orders
  WHERE tenant_id = NEW.tenant_id
  ORDER BY numero_sequencial DESC
  LIMIT 1
  FOR UPDATE;

  NEW.numero_sequencial := COALESCE(v_next, 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
