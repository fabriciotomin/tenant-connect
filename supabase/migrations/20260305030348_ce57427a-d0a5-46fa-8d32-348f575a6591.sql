
CREATE OR REPLACE FUNCTION public.recalc_inbound_costs(_tenant_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc record;
  line record;
  v_total_valor numeric;
  v_frete_total numeric;
  v_frete_rateado numeric;
  v_custo_unitario numeric;
  v_item_tipo text;
BEGIN
  -- Step 1: Recalculate custo_unitario on each active movement from active documents
  FOR doc IN
    SELECT d.*, COALESCE(po.valor_frete, 0) as frete
    FROM inbound_documents d
    LEFT JOIN purchase_orders po ON po.id = d.purchase_order_id AND po.deleted_at IS NULL
    WHERE d.tenant_id = _tenant_id AND d.status = 'PROCESSADO' AND d.deleted_at IS NULL
    ORDER BY d.created_at
  LOOP
    SELECT COALESCE(SUM(quantidade * valor_unitario), 0)
    INTO v_total_valor
    FROM inbound_document_items WHERE inbound_document_id = doc.id AND deleted_at IS NULL;

    v_frete_total := doc.frete;

    FOR line IN SELECT * FROM inbound_document_items WHERE inbound_document_id = doc.id AND deleted_at IS NULL LOOP
      SELECT tipo_item INTO v_item_tipo FROM items WHERE id = line.item_id AND deleted_at IS NULL;

      IF v_total_valor > 0 THEN
        v_frete_rateado := v_frete_total * (line.quantidade * line.valor_unitario) / v_total_valor;
      ELSE
        v_frete_rateado := 0;
      END IF;

      IF line.quantidade > 0 THEN
        v_custo_unitario := (line.valor_unitario * line.quantidade + COALESCE(line.impostos, 0) + v_frete_rateado) / line.quantidade;
      ELSE
        v_custo_unitario := line.valor_unitario;
      END IF;

      UPDATE stock_movements
      SET custo_unitario = v_custo_unitario
      WHERE item_id = line.item_id
        AND tenant_id = _tenant_id
        AND documento_origem = 'NE-' || doc.numero
        AND tipo = 'ENTRADA'
        AND deleted_at IS NULL;
    END LOOP;
  END LOOP;

  -- Step 2: Recalculate custo_medio from ACTIVE entry movements only
  UPDATE items i
  SET custo_medio = sub.avg_cost
  FROM (
    SELECT sm.item_id,
           CASE WHEN SUM(sm.quantidade) > 0
                THEN SUM(sm.custo_unitario * sm.quantidade) / SUM(sm.quantidade)
                ELSE 0
           END as avg_cost
    FROM stock_movements sm
    WHERE sm.tenant_id = _tenant_id AND sm.tipo = 'ENTRADA' AND sm.deleted_at IS NULL
    GROUP BY sm.item_id
  ) sub
  WHERE i.id = sub.item_id
    AND i.tenant_id = _tenant_id
    AND i.deleted_at IS NULL
    AND (i.tipo_item IS NULL OR i.tipo_item != 'SERVICO');

  -- Step 3: Recalculate saldo_estoque from ALL active movements (ENTRADA - SAIDA)
  UPDATE items i
  SET saldo_estoque = COALESCE(sub.saldo, 0)
  FROM (
    SELECT sm.item_id,
           SUM(CASE WHEN sm.tipo = 'ENTRADA' THEN sm.quantidade
                    WHEN sm.tipo = 'SAIDA' THEN -sm.quantidade
                    ELSE 0 END) as saldo
    FROM stock_movements sm
    WHERE sm.tenant_id = _tenant_id AND sm.deleted_at IS NULL
    GROUP BY sm.item_id
  ) sub
  WHERE i.id = sub.item_id
    AND i.tenant_id = _tenant_id
    AND i.deleted_at IS NULL
    AND (i.tipo_item IS NULL OR i.tipo_item != 'SERVICO');
END;
$function$;
