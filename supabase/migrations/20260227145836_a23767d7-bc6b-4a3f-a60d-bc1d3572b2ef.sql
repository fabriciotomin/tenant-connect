
-- Add centro_custo_id to all document item tables
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id);
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id);
ALTER TABLE public.quotation_items ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id);
ALTER TABLE public.inbound_document_items ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id);
ALTER TABLE public.outbound_document_items ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id);
ALTER TABLE public.service_order_items ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id);

-- Add natureza_financeira_id and centro_custo_id to bank_movements
ALTER TABLE public.bank_movements ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id);
ALTER TABLE public.bank_movements ADD COLUMN IF NOT EXISTS centro_custo_id uuid REFERENCES public.cost_centers(id);
