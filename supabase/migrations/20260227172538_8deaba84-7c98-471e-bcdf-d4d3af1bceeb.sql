
-- Create supplier_item_mappings table for intelligent auto-matching
CREATE TABLE public.supplier_item_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.empresas(id),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
  supplier_item_description TEXT NOT NULL,
  supplier_item_code TEXT,
  item_id UUID NOT NULL REFERENCES public.items(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index to prevent duplicate mappings
CREATE UNIQUE INDEX idx_supplier_item_mappings_unique 
  ON public.supplier_item_mappings (tenant_id, supplier_id, supplier_item_description);

-- Create index for lookup performance
CREATE INDEX idx_supplier_item_mappings_lookup 
  ON public.supplier_item_mappings (tenant_id, supplier_id);

-- Enable RLS
ALTER TABLE public.supplier_item_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (PERMISSIVE pattern matching existing system)
CREATE POLICY "admin_global_all_supplier_item_mappings"
  ON public.supplier_item_mappings
  FOR ALL
  USING (is_admin_global_in_tenant(auth.uid(), tenant_id))
  WITH CHECK (is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY "admin_empresa_all_supplier_item_mappings"
  ON public.supplier_item_mappings
  FOR ALL
  USING (is_admin_empresa(auth.uid(), tenant_id))
  WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));

CREATE POLICY "tenant_all_supplier_item_mappings"
  ON public.supplier_item_mappings
  FOR ALL
  USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
