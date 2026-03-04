
-- Add data_emissao to outbound_documents
ALTER TABLE public.outbound_documents ADD COLUMN IF NOT EXISTS data_emissao date NOT NULL DEFAULT CURRENT_DATE;

-- Add updated_at trigger for outbound_documents
DROP TRIGGER IF EXISTS update_outbound_documents_updated_at ON public.outbound_documents;
CREATE TRIGGER update_outbound_documents_updated_at
  BEFORE UPDATE ON public.outbound_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
