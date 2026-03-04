
-- Step 1: Add columns
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS numero_sequencial integer;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS numero_sequencial integer;
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS numero_sequencial integer;

-- Step 2: Disable ALL user triggers for safe backfill
ALTER TABLE public.quotations DISABLE TRIGGER USER;
ALTER TABLE public.sales_orders DISABLE TRIGGER USER;
ALTER TABLE public.purchase_orders DISABLE TRIGGER USER;

-- Step 3: Backfill existing records
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) AS rn
  FROM public.quotations WHERE numero_sequencial IS NULL
)
UPDATE public.quotations q SET numero_sequencial = n.rn FROM numbered n WHERE q.id = n.id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) AS rn
  FROM public.sales_orders WHERE numero_sequencial IS NULL
)
UPDATE public.sales_orders s SET numero_sequencial = n.rn FROM numbered n WHERE s.id = n.id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) AS rn
  FROM public.purchase_orders WHERE numero_sequencial IS NULL
)
UPDATE public.purchase_orders p SET numero_sequencial = n.rn FROM numbered n WHERE p.id = n.id;

-- Step 4: Re-enable triggers
ALTER TABLE public.quotations ENABLE TRIGGER USER;
ALTER TABLE public.sales_orders ENABLE TRIGGER USER;
ALTER TABLE public.purchase_orders ENABLE TRIGGER USER;

-- Step 5: Make NOT NULL and add unique indexes
ALTER TABLE public.quotations ALTER COLUMN numero_sequencial SET NOT NULL;
ALTER TABLE public.sales_orders ALTER COLUMN numero_sequencial SET NOT NULL;
ALTER TABLE public.purchase_orders ALTER COLUMN numero_sequencial SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotations_tenant_numero_seq ON public.quotations (tenant_id, numero_sequencial);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_tenant_numero_seq ON public.sales_orders (tenant_id, numero_sequencial);
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_tenant_numero_seq ON public.purchase_orders (tenant_id, numero_sequencial);

-- Step 6: Auto-assign functions
CREATE OR REPLACE FUNCTION public.assign_numero_sequencial_quotations()
RETURNS TRIGGER AS $$
DECLARE v_next integer;
BEGIN
  SELECT COALESCE(MAX(numero_sequencial), 0) + 1 INTO v_next
  FROM public.quotations WHERE tenant_id = NEW.tenant_id FOR UPDATE;
  NEW.numero_sequencial := v_next;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.assign_numero_sequencial_sales_orders()
RETURNS TRIGGER AS $$
DECLARE v_next integer;
BEGIN
  SELECT COALESCE(MAX(numero_sequencial), 0) + 1 INTO v_next
  FROM public.sales_orders WHERE tenant_id = NEW.tenant_id FOR UPDATE;
  NEW.numero_sequencial := v_next;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.assign_numero_sequencial_purchase_orders()
RETURNS TRIGGER AS $$
DECLARE v_next integer;
BEGIN
  SELECT COALESCE(MAX(numero_sequencial), 0) + 1 INTO v_next
  FROM public.purchase_orders WHERE tenant_id = NEW.tenant_id FOR UPDATE;
  NEW.numero_sequencial := v_next;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Step 7: INSERT triggers
DROP TRIGGER IF EXISTS trg_assign_numero_seq_quotations ON public.quotations;
CREATE TRIGGER trg_assign_numero_seq_quotations
  BEFORE INSERT ON public.quotations FOR EACH ROW
  EXECUTE FUNCTION public.assign_numero_sequencial_quotations();

DROP TRIGGER IF EXISTS trg_assign_numero_seq_sales_orders ON public.sales_orders;
CREATE TRIGGER trg_assign_numero_seq_sales_orders
  BEFORE INSERT ON public.sales_orders FOR EACH ROW
  EXECUTE FUNCTION public.assign_numero_sequencial_sales_orders();

DROP TRIGGER IF EXISTS trg_assign_numero_seq_purchase_orders ON public.purchase_orders;
CREATE TRIGGER trg_assign_numero_seq_purchase_orders
  BEFORE INSERT ON public.purchase_orders FOR EACH ROW
  EXECUTE FUNCTION public.assign_numero_sequencial_purchase_orders();

-- Step 8: Prevent numero_sequencial modification
CREATE OR REPLACE FUNCTION public.prevent_numero_sequencial_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.numero_sequencial IS NOT NULL AND NEW.numero_sequencial IS DISTINCT FROM OLD.numero_sequencial THEN
    RAISE EXCEPTION 'numero_sequencial não pode ser alterado';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_seq_update_quotations ON public.quotations;
CREATE TRIGGER trg_prevent_seq_update_quotations
  BEFORE UPDATE ON public.quotations FOR EACH ROW
  EXECUTE FUNCTION public.prevent_numero_sequencial_update();

DROP TRIGGER IF EXISTS trg_prevent_seq_update_sales_orders ON public.sales_orders;
CREATE TRIGGER trg_prevent_seq_update_sales_orders
  BEFORE UPDATE ON public.sales_orders FOR EACH ROW
  EXECUTE FUNCTION public.prevent_numero_sequencial_update();

DROP TRIGGER IF EXISTS trg_prevent_seq_update_purchase_orders ON public.purchase_orders;
CREATE TRIGGER trg_prevent_seq_update_purchase_orders
  BEFORE UPDATE ON public.purchase_orders FOR EACH ROW
  EXECUTE FUNCTION public.prevent_numero_sequencial_update();
