
-- Add data_emissao column to inbound_documents
ALTER TABLE public.inbound_documents
ADD COLUMN IF NOT EXISTS data_emissao date DEFAULT CURRENT_DATE;
