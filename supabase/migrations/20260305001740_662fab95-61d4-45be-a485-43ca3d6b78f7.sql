
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS natureza_venda_id uuid REFERENCES public.financial_natures(id),
  ADD COLUMN IF NOT EXISTS centro_custo_venda_id uuid REFERENCES public.cost_centers(id);
