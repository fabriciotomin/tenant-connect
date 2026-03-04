
-- Add sale-specific financial classification columns to items
ALTER TABLE public.items
  ADD COLUMN natureza_venda_id uuid REFERENCES public.financial_natures(id),
  ADD COLUMN centro_custo_venda_id uuid REFERENCES public.cost_centers(id);

-- Comment for clarity
COMMENT ON COLUMN public.items.natureza_financeira_id IS 'Natureza financeira de COMPRA';
COMMENT ON COLUMN public.items.centro_custo_id IS 'Centro de custo de COMPRA';
COMMENT ON COLUMN public.items.natureza_venda_id IS 'Natureza financeira de VENDA';
COMMENT ON COLUMN public.items.centro_custo_venda_id IS 'Centro de custo de VENDA';
