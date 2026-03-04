
-- 1) Remove tipo_documento column from document_series
ALTER TABLE public.document_series DROP COLUMN IF EXISTS tipo_documento;

-- 2) Drop the inbound-specific numbering function
DROP FUNCTION IF EXISTS public.get_next_inbound_number(uuid, text);

-- 3) Drop old unique index on (tenant_id, serie, numero) and create correct one including fornecedor_id
DROP INDEX IF EXISTS public.idx_inbound_documents_unique_serie_numero;
CREATE UNIQUE INDEX idx_inbound_docs_unique_fornecedor_serie_numero 
ON public.inbound_documents (tenant_id, fornecedor_id, serie, numero)
WHERE serie IS NOT NULL AND numero IS NOT NULL;
