
-- Function to atomically get next inbound document number for a given serie
CREATE OR REPLACE FUNCTION public.get_next_inbound_number(p_tenant_id uuid, p_serie text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next integer;
BEGIN
  -- Atomically increment and return
  UPDATE public.document_series
  SET proximo_numero = proximo_numero + 1, updated_at = now()
  WHERE tenant_id = p_tenant_id
    AND serie = p_serie
    AND ativo = true
  RETURNING proximo_numero - 1 INTO v_next;

  -- If no matching series found, start from 1
  IF v_next IS NULL THEN
    v_next := 1;
  END IF;

  RETURN v_next;
END;
$$;

-- Function to validate inbound document uniqueness
CREATE OR REPLACE FUNCTION public.validate_inbound_doc_unique(p_tenant_id uuid, p_serie text, p_numero text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.inbound_documents
    WHERE tenant_id = p_tenant_id
      AND serie = p_serie
      AND numero = p_numero
      AND status != 'CANCELADO'
  ) INTO v_exists;

  RETURN NOT v_exists;
END;
$$;
