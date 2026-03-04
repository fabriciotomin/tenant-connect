
-- Add natureza_financeira_id to all document item tables
ALTER TABLE public.quotation_items ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id);
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id);
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id);
ALTER TABLE public.service_order_items ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id);
ALTER TABLE public.inbound_document_items ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id);
ALTER TABLE public.outbound_document_items ADD COLUMN IF NOT EXISTS natureza_financeira_id uuid REFERENCES public.financial_natures(id);
