
-- Safe delete for financial_natures
CREATE OR REPLACE FUNCTION public.delete_financial_nature_safe(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_count int;
BEGIN
  -- Get tenant and validate ownership
  SELECT tenant_id INTO v_tenant FROM financial_natures WHERE id = p_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Natureza financeira não encontrada.';
  END IF;
  IF v_tenant <> get_user_tenant_id(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  -- Check children
  SELECT count(*) INTO v_count FROM financial_natures WHERE codigo_pai = p_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Registro possui estrutura hierárquica vinculada. Remova os filhos primeiro.';
  END IF;

  -- Check usage across all tables
  SELECT count(*) INTO v_count FROM items WHERE (natureza_financeira_id = p_id OR natureza_venda_id = p_id) AND tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Natureza financeira já utilizada em Itens e não pode ser excluída.'; END IF;

  SELECT count(*) INTO v_count FROM purchase_order_items poi JOIN purchase_orders po ON po.id = poi.purchase_order_id WHERE poi.natureza_financeira_id = p_id AND po.tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Natureza financeira já utilizada em Pedidos de Compra e não pode ser excluída.'; END IF;

  SELECT count(*) INTO v_count FROM inbound_document_items idi JOIN inbound_documents id2 ON id2.id = idi.inbound_document_id WHERE idi.natureza_financeira_id = p_id AND id2.tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Natureza financeira já utilizada em Documentos de Entrada e não pode ser excluída.'; END IF;

  SELECT count(*) INTO v_count FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.sales_order_id WHERE soi.natureza_financeira_id = p_id AND so.tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Natureza financeira já utilizada em Pedidos de Venda e não pode ser excluída.'; END IF;

  SELECT count(*) INTO v_count FROM outbound_document_items odi JOIN outbound_documents od ON od.id = odi.outbound_document_id WHERE odi.natureza_financeira_id = p_id AND od.tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Natureza financeira já utilizada em Documentos de Saída e não pode ser excluída.'; END IF;

  SELECT count(*) INTO v_count FROM service_order_items soi2 JOIN service_orders so2 ON so2.id = soi2.service_order_id WHERE soi2.natureza_financeira_id = p_id AND so2.tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Natureza financeira já utilizada em Ordens de Serviço e não pode ser excluída.'; END IF;

  SELECT count(*) INTO v_count FROM accounts_payable WHERE natureza_financeira_id = p_id AND tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Natureza financeira já utilizada em Contas a Pagar e não pode ser excluída.'; END IF;

  SELECT count(*) INTO v_count FROM accounts_receivable WHERE natureza_financeira_id = p_id AND tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Natureza financeira já utilizada em Contas a Receber e não pode ser excluída.'; END IF;

  SELECT count(*) INTO v_count FROM bank_movements WHERE natureza_financeira_id = p_id AND tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Natureza financeira já utilizada em Movimentações Bancárias e não pode ser excluída.'; END IF;

  -- All checks passed, delete
  DELETE FROM financial_natures WHERE id = p_id AND tenant_id = v_tenant;
END;
$$;

-- Safe delete for cost_centers
CREATE OR REPLACE FUNCTION public.delete_cost_center_safe(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_count int;
BEGIN
  SELECT tenant_id INTO v_tenant FROM cost_centers WHERE id = p_id;
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Centro de custo não encontrado.';
  END IF;
  IF v_tenant <> get_user_tenant_id(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  -- Check children
  SELECT count(*) INTO v_count FROM cost_centers WHERE codigo_pai = p_id;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Registro possui estrutura hierárquica vinculada. Remova os filhos primeiro.';
  END IF;

  -- Check usage
  SELECT count(*) INTO v_count FROM items WHERE (centro_custo_id = p_id OR centro_custo_venda_id = p_id) AND tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Centro de custo já utilizado em Itens e não pode ser excluído.'; END IF;

  SELECT count(*) INTO v_count FROM purchase_order_items poi JOIN purchase_orders po ON po.id = poi.purchase_order_id WHERE poi.centro_custo_id = p_id AND po.tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Centro de custo já utilizado em Pedidos de Compra e não pode ser excluído.'; END IF;

  SELECT count(*) INTO v_count FROM inbound_document_items idi JOIN inbound_documents id2 ON id2.id = idi.inbound_document_id WHERE idi.centro_custo_id = p_id AND id2.tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Centro de custo já utilizado em Documentos de Entrada e não pode ser excluído.'; END IF;

  SELECT count(*) INTO v_count FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.sales_order_id WHERE soi.centro_custo_id = p_id AND so.tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Centro de custo já utilizado em Pedidos de Venda e não pode ser excluído.'; END IF;

  SELECT count(*) INTO v_count FROM outbound_document_items odi JOIN outbound_documents od ON od.id = odi.outbound_document_id WHERE odi.centro_custo_id = p_id AND od.tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Centro de custo já utilizado em Documentos de Saída e não pode ser excluído.'; END IF;

  SELECT count(*) INTO v_count FROM service_order_items soi2 JOIN service_orders so2 ON so2.id = soi2.service_order_id WHERE soi2.centro_custo_id = p_id AND so2.tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Centro de custo já utilizado em Ordens de Serviço e não pode ser excluído.'; END IF;

  SELECT count(*) INTO v_count FROM accounts_payable WHERE centro_custo_id = p_id AND tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Centro de custo já utilizado em Contas a Pagar e não pode ser excluído.'; END IF;

  SELECT count(*) INTO v_count FROM accounts_receivable WHERE centro_custo_id = p_id AND tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Centro de custo já utilizado em Contas a Receber e não pode ser excluído.'; END IF;

  SELECT count(*) INTO v_count FROM bank_movements WHERE centro_custo_id = p_id AND tenant_id = v_tenant;
  IF v_count > 0 THEN RAISE EXCEPTION 'Centro de custo já utilizado em Movimentações Bancárias e não pode ser excluído.'; END IF;

  DELETE FROM cost_centers WHERE id = p_id AND tenant_id = v_tenant;
END;
$$;
