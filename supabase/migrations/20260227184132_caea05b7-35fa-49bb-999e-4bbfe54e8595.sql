
-- 1) Add custo_servico to items
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS custo_servico numeric NOT NULL DEFAULT 0;

-- 2) Create unidades_medida table
CREATE TABLE IF NOT EXISTS public.unidades_medida (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.empresas(id),
  codigo text NOT NULL,
  descricao text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, codigo)
);

ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_empresa_all_unidades_medida" ON public.unidades_medida
  FOR ALL USING (is_admin_empresa(auth.uid(), tenant_id))
  WITH CHECK (is_admin_empresa(auth.uid(), tenant_id));

CREATE POLICY "admin_global_all_unidades_medida" ON public.unidades_medida
  FOR ALL USING (is_admin_global_in_tenant(auth.uid(), tenant_id))
  WITH CHECK (is_admin_global_in_tenant(auth.uid(), tenant_id));

CREATE POLICY "tenant_all_unidades_medida" ON public.unidades_medida
  FOR ALL USING (tenant_id = get_user_tenant_id(auth.uid()))
  WITH CHECK (tenant_id = get_user_tenant_id(auth.uid()));
