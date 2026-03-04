
-- Function to get purchase orders with pending balance for inbound documents
CREATE OR REPLACE FUNCTION public.get_purchase_orders_with_pending_balance(p_tenant_id uuid)
RETURNS TABLE(
  id uuid,
  numero_sequencial integer,
  status text,
  fornecedor_id uuid,
  fornecedor_nome text,
  condicao_pagamento_id uuid,
  valor_frete numeric
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    po.id,
    po.numero_sequencial,
    po.status::text,
    po.fornecedor_id,
    s.razao_social AS fornecedor_nome,
    po.condicao_pagamento_id,
    po.valor_frete
  FROM purchase_orders po
  JOIN suppliers s ON s.id = po.fornecedor_id
  WHERE po.tenant_id = p_tenant_id
    AND po.status IN ('ABERTO', 'PARCIAL')
    AND EXISTS (
      SELECT 1
      FROM purchase_order_items poi
      WHERE poi.purchase_order_id = po.id
        AND poi.quantidade > COALESCE((
          SELECT SUM(idi.quantidade)
          FROM inbound_document_items idi
          JOIN inbound_documents id_doc ON id_doc.id = idi.inbound_document_id
          WHERE idi.item_id = poi.item_id
            AND id_doc.purchase_order_id = po.id
            AND id_doc.status != 'CANCELADO'
        ), 0)
    )
  ORDER BY po.created_at DESC;
$$;

-- Function to get pending items for a specific purchase order
CREATE OR REPLACE FUNCTION public.get_po_pending_items(p_purchase_order_id uuid)
RETURNS TABLE(
  item_id uuid,
  item_codigo text,
  item_descricao text,
  quantidade_pedida numeric,
  quantidade_recebida numeric,
  quantidade_pendente numeric,
  valor_unitario numeric,
  impostos numeric
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    poi.item_id,
    i.codigo AS item_codigo,
    i.descricao AS item_descricao,
    poi.quantidade AS quantidade_pedida,
    COALESCE((
      SELECT SUM(idi.quantidade)
      FROM inbound_document_items idi
      JOIN inbound_documents id_doc ON id_doc.id = idi.inbound_document_id
      WHERE idi.item_id = poi.item_id
        AND id_doc.purchase_order_id = p_purchase_order_id
        AND id_doc.status != 'CANCELADO'
    ), 0) AS quantidade_recebida,
    poi.quantidade - COALESCE((
      SELECT SUM(idi.quantidade)
      FROM inbound_document_items idi
      JOIN inbound_documents id_doc ON id_doc.id = idi.inbound_document_id
      WHERE idi.item_id = poi.item_id
        AND id_doc.purchase_order_id = p_purchase_order_id
        AND id_doc.status != 'CANCELADO'
    ), 0) AS quantidade_pendente,
    poi.valor_unitario,
    poi.impostos
  FROM purchase_order_items poi
  JOIN items i ON i.id = poi.item_id
  WHERE poi.purchase_order_id = p_purchase_order_id
    AND poi.quantidade > COALESCE((
      SELECT SUM(idi.quantidade)
      FROM inbound_document_items idi
      JOIN inbound_documents id_doc ON id_doc.id = idi.inbound_document_id
      WHERE idi.item_id = poi.item_id
        AND id_doc.purchase_order_id = p_purchase_order_id
        AND id_doc.status != 'CANCELADO'
    ), 0);
$$;
