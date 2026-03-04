
-- Function to prevent codigo changes on UPDATE
CREATE OR REPLACE FUNCTION public.prevent_codigo_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo IS DISTINCT FROM OLD.codigo THEN
    RAISE EXCEPTION 'Código não pode ser alterado após criação.';
  END IF;
  RETURN NEW;
END;
$$;

-- Apply trigger to all tables with "codigo" column
CREATE TRIGGER trg_prevent_codigo_update_item_groups
  BEFORE UPDATE ON public.item_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_codigo_update();

CREATE TRIGGER trg_prevent_codigo_update_items
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_codigo_update();

CREATE TRIGGER trg_prevent_codigo_update_banks
  BEFORE UPDATE ON public.banks
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_codigo_update();

CREATE TRIGGER trg_prevent_codigo_update_financial_natures
  BEFORE UPDATE ON public.financial_natures
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_codigo_update();

CREATE TRIGGER trg_prevent_codigo_update_cost_centers
  BEFORE UPDATE ON public.cost_centers
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_codigo_update();
