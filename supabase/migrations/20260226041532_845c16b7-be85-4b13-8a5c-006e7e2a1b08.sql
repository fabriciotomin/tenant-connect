
-- 1) Add tipo_natureza (RECEITA/DESPESA), ativo, ordem to financial_natures
ALTER TABLE public.financial_natures 
  ADD COLUMN IF NOT EXISTS tipo_natureza text NOT NULL DEFAULT 'DESPESA',
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;

-- 2) Add ativo to cost_centers
ALTER TABLE public.cost_centers 
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

-- 3) Seed function for new tenants
CREATE OR REPLACE FUNCTION public.seed_financial_data_for_tenant(p_tenant_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_exists boolean;
  -- Receitas
  v_rec_id uuid; v_rec_bruta_id uuid; v_ded_id uuid; v_rec_liq_id uuid;
  -- Custos
  v_custos_id uuid;
  -- Despesas
  v_desp_id uuid;
  -- Resultado
  v_res_id uuid;
BEGIN
  -- Check if already seeded
  SELECT EXISTS(SELECT 1 FROM public.financial_natures WHERE tenant_id = p_tenant_id LIMIT 1) INTO v_exists;
  IF v_exists THEN RETURN; END IF;

  -- === RECEITAS ===
  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, ordem)
  VALUES (p_tenant_id, '1', 'RECEITAS', 'SINTETICO', 'RECEITA', 100) RETURNING id INTO v_rec_id;
  
  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, codigo_pai, ordem)
  VALUES (p_tenant_id, '1.1', 'Receita Bruta', 'SINTETICO', 'RECEITA', v_rec_id, 110) RETURNING id INTO v_rec_bruta_id;
  
  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, codigo_pai, ordem)
  VALUES 
    (p_tenant_id, '1.1.1', 'Venda de Mercadorias', 'ANALITICO', 'RECEITA', v_rec_bruta_id, 111),
    (p_tenant_id, '1.1.2', 'Prestação de Serviços', 'ANALITICO', 'RECEITA', v_rec_bruta_id, 112);

  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, codigo_pai, ordem)
  VALUES (p_tenant_id, '1.2', 'Deduções', 'SINTETICO', 'RECEITA', v_rec_id, 120) RETURNING id INTO v_ded_id;
  
  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, codigo_pai, ordem)
  VALUES (p_tenant_id, '1.2.1', 'Impostos sobre Vendas', 'ANALITICO', 'RECEITA', v_ded_id, 121);

  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, codigo_pai, ordem)
  VALUES (p_tenant_id, '1.3', 'Receita Líquida', 'SINTETICO', 'RECEITA', v_rec_id, 130);

  -- === CUSTOS ===
  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, ordem)
  VALUES (p_tenant_id, '2', 'CUSTOS', 'SINTETICO', 'DESPESA', 200) RETURNING id INTO v_custos_id;
  
  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, codigo_pai, ordem)
  VALUES 
    (p_tenant_id, '2.1', 'Custo das Mercadorias Vendidas', 'ANALITICO', 'DESPESA', v_custos_id, 210),
    (p_tenant_id, '2.2', 'Custo dos Serviços Prestados', 'ANALITICO', 'DESPESA', v_custos_id, 220);

  -- === DESPESAS OPERACIONAIS ===
  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, ordem)
  VALUES (p_tenant_id, '3', 'DESPESAS OPERACIONAIS', 'SINTETICO', 'DESPESA', 300) RETURNING id INTO v_desp_id;
  
  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, codigo_pai, ordem)
  VALUES 
    (p_tenant_id, '3.1', 'Despesas Administrativas', 'ANALITICO', 'DESPESA', v_desp_id, 310),
    (p_tenant_id, '3.2', 'Despesas Comerciais', 'ANALITICO', 'DESPESA', v_desp_id, 320),
    (p_tenant_id, '3.3', 'Despesas Operacionais', 'ANALITICO', 'DESPESA', v_desp_id, 330);

  -- === RESULTADO ===
  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, ordem)
  VALUES (p_tenant_id, '4', 'RESULTADO', 'SINTETICO', 'RECEITA', 400) RETURNING id INTO v_res_id;
  
  INSERT INTO public.financial_natures (tenant_id, codigo, descricao, tipo, tipo_natureza, codigo_pai, ordem)
  VALUES (p_tenant_id, '4.1', 'Resultado Operacional', 'ANALITICO', 'RECEITA', v_res_id, 410);

  -- === CENTROS DE CUSTO ===
  INSERT INTO public.cost_centers (tenant_id, codigo, descricao, tipo)
  VALUES
    (p_tenant_id, 'ADM', 'Administrativo', 'ANALITICO'),
    (p_tenant_id, 'COM', 'Comercial', 'ANALITICO'),
    (p_tenant_id, 'OPR', 'Operacional', 'ANALITICO');
END;
$$;

-- 4) Trigger to auto-seed on new empresa
CREATE OR REPLACE FUNCTION public.seed_tenant_on_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.seed_financial_data_for_tenant(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_tenant_on_create ON public.empresas;
CREATE TRIGGER trg_seed_tenant_on_create
  AFTER INSERT ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_tenant_on_create();

-- 5) Seed existing tenants that don't have data yet
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.empresas LOOP
    PERFORM public.seed_financial_data_for_tenant(r.id);
  END LOOP;
END;
$$;
