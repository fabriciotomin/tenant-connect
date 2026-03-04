import { useState, useMemo, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useFinancialClassification } from "@/hooks/useFinancialClassification";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, UserPlus } from "lucide-react";
import { QuickSupplierDialog } from "./QuickSupplierDialog";
import { QuickItemDialog } from "./QuickItemDialog";

interface XmlItemMapping {
  item_id: string;
  quantidade: string;
  valor_unitario: string;
  impostos: string;
  natureza_financeira_id: string;
  centro_custo_id: string;
  xml_descricao: string;
  xml_codigo: string;
}

interface XmlImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  xmlData: any;
  suppliers: { id: string; razao_social: string; cnpj: string | null }[];
  allItems: { id: string; codigo: string; descricao: string; unidade_medida?: string; natureza_financeira_id: string | null; centro_custo_id: string | null }[];
  paymentConditions: { id: string; descricao: string; numero_parcelas: number; dias_entre_parcelas: number }[];
  paymentMethods: { id: string; nome: string; tipo: string }[];
  onSubmit: (params: {
    fornecedor_id: string;
    condicao_pagamento_id: string;
    forma_pagamento_id: string;
    purchase_order_id?: string;
    numero: string;
    serie: string;
    data_emissao: string;
    chave_acesso: string;
    items: { item_id: string; quantidade: number; valor_unitario: number; impostos: number; natureza_financeira_id: string; centro_custo_id: string }[];
    supplier_item_mappings?: { supplier_id: string; supplier_item_description: string; supplier_item_code: string; item_id: string }[];
  }) => void;
  submitting: boolean;
}

export function XmlImportDialog({
  open,
  onOpenChange,
  xmlData,
  suppliers: suppliersProp,
  allItems: allItemsProp,
  paymentConditions,
  paymentMethods,
  onSubmit,
  submitting,
}: XmlImportDialogProps) {
  const { tenant } = useTenant();
  const { natures, costCenters } = useFinancialClassification();
  const queryClient = useQueryClient();

  const [localSuppliers, setLocalSuppliers] = useState<typeof suppliersProp>([]);
  const [localItems, setLocalItems] = useState<typeof allItemsProp>([]);
  const suppliers = useMemo(() => [...suppliersProp, ...localSuppliers], [suppliersProp, localSuppliers]);
  const allItems = useMemo(() => [...allItemsProp, ...localItems], [allItemsProp, localItems]);
  const normalizeMatchText = (value?: string | null) =>
    (value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  const [form, setForm] = useState({
    fornecedor_id: "",
    condicao_pagamento_id: "",
    forma_pagamento_id: "",
    purchase_order_id: "",
  });

  const [xmlItemMappings, setXmlItemMappings] = useState<XmlItemMapping[]>([]);
  const [quickSupplierOpen, setQuickSupplierOpen] = useState(false);
  const [quickItemOpen, setQuickItemOpen] = useState(false);
  const [quickItemIndex, setQuickItemIndex] = useState(-1);

  // Purchase orders query
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase_orders_for_xml", tenant?.id],
    enabled: !!tenant?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_purchase_orders_with_pending_balance", { p_tenant_id: tenant!.id });
      if (error) throw error;
      return (data || []) as { id: string; numero_sequencial: number; status: string; fornecedor_id: string; fornecedor_nome: string; condicao_pagamento_id: string | null; forma_pagamento_id: string | null; valor_frete: number }[];
    },
  });

  // PO items query - only when PO is selected
  const { data: poItems = [] } = useQuery({
    queryKey: ["po_items_for_xml", tenant?.id, form.purchase_order_id],
    enabled: !!tenant?.id && !!form.purchase_order_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select("item_id, quantidade, valor_unitario, natureza_financeira_id, centro_custo_id, items(id, codigo, descricao), purchase_orders!inner(tenant_id)")
        .eq("purchase_order_id", form.purchase_order_id)
        .eq("purchase_orders.tenant_id", tenant!.id);
      if (error) throw error;
      return (data || []) as { item_id: string; quantidade: number; valor_unitario: number; natureza_financeira_id: string | null; centro_custo_id: string | null; items: { id: string; codigo: string; descricao: string } | null }[];
    },
  });

  // Supplier item mappings query
  const { data: supplierMappings = [] } = useQuery({
    queryKey: ["supplier_item_mappings", tenant?.id, form.fornecedor_id],
    enabled: !!tenant?.id && !!form.fornecedor_id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_item_mappings")
        .select("supplier_item_description, supplier_item_code, item_id")
        .eq("tenant_id", tenant!.id)
        .eq("supplier_id", form.fornecedor_id);
      if (error) throw error;
      return data || [];
    },
  });

  // Items available for selection based on PO or all items
  const selectableItems = useMemo(() => {
    if (form.purchase_order_id) {
      return poItems
        .filter(pi => pi.items)
        .map(pi => ({
          id: pi.item_id,
          codigo: pi.items!.codigo,
          descricao: pi.items!.descricao,
          natureza_financeira_id: pi.natureza_financeira_id,
          centro_custo_id: pi.centro_custo_id,
        }));
    }
    return allItems;
  }, [form.purchase_order_id, poItems, allItems]);

  // Initialize form when xmlData changes
  const initializeFromXml = useCallback(() => {
    if (!xmlData) return;

    const cnpjClean = (xmlData.emitente?.cnpj || "").replace(/\D/g, "");
    const foundSupplier = suppliers.find(s => (s.cnpj || "").replace(/\D/g, "") === cnpjClean);

    setForm({
      fornecedor_id: foundSupplier?.id || "",
      condicao_pagamento_id: "",
      forma_pagamento_id: "",
      purchase_order_id: "",
    });

    setXmlItemMappings(
      (xmlData.itens || []).map((xi: any) => ({
        item_id: "",
        quantidade: String(xi.quantidade),
        valor_unitario: String(xi.valor_unitario),
        impostos: String(xi.impostos_total || 0),
        natureza_financeira_id: "",
        centro_custo_id: "",
        xml_descricao: xi.xProd || "",
        xml_codigo: xi.cProd || "",
      }))
    );

    if (!foundSupplier && cnpjClean) {
      toast.info(`Fornecedor CNPJ ${cnpjClean} não encontrado. Cadastre ou selecione manualmente.`);
    }

    setLocalSuppliers([]);
    setLocalItems([]);
  }, [xmlData, suppliers]);

  // Run init when dialog opens
  useEffect(() => {
    if (open && xmlData) {
      initializeFromXml();
    }
  }, [open, xmlData]);

  // Apply supplier mappings when supplier changes or mappings load
  useEffect(() => {
    if (!form.fornecedor_id || supplierMappings.length === 0 || xmlItemMappings.length === 0) return;

    const allowedPoItemIds = new Set(poItems.map((pi) => pi.item_id));

    setXmlItemMappings(prev => prev.map(mapping => {
      if (mapping.item_id) return mapping; // Already mapped, skip

      const xmlCode = normalizeMatchText(mapping.xml_codigo);
      const xmlDescription = normalizeMatchText(mapping.xml_descricao);

      const foundByCode = xmlCode
        ? supplierMappings.find(sm => normalizeMatchText(sm.supplier_item_code) === xmlCode)
        : null;

      const foundByDescription = supplierMappings.find(
        sm => normalizeMatchText(sm.supplier_item_description) === xmlDescription
      );

      const found = foundByCode || foundByDescription;

      if (found) {
        if (form.purchase_order_id && !allowedPoItemIds.has(found.item_id)) {
          return mapping;
        }

        const item = allItems.find(i => i.id === found.item_id);
        return {
          ...mapping,
          item_id: found.item_id,
          natureza_financeira_id: item?.natureza_financeira_id || "",
          centro_custo_id: item?.centro_custo_id || "",
        };
      }
      return mapping;
    }));
  }, [form.fornecedor_id, form.purchase_order_id, supplierMappings, xmlItemMappings.length, allItems, poItems]);

  async function handlePOChange(poId: string) {
    const effectiveId = poId === "none" ? "" : poId;

    if (!effectiveId) {
      setForm(prev => ({ ...prev, purchase_order_id: "" }));
      return;
    }

    if (!tenant?.id) {
      toast.error("Tenant não identificado para vincular Pedido de Compra");
      return;
    }

    const { data: po, error } = await supabase
      .from("purchase_orders")
      .select("id, tenant_id, fornecedor_id, condicao_pagamento_id, forma_pagamento_id")
      .eq("id", effectiveId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (error) {
      toast.error("Não foi possível carregar os dados do Pedido de Compra");
      return;
    }

    if (!po) {
      toast.error("Pedido de Compra não encontrado para o tenant atual");
      setForm(prev => ({ ...prev, purchase_order_id: "" }));
      return;
    }

    setForm(prev => ({
      ...prev,
      purchase_order_id: effectiveId,
      fornecedor_id: po.fornecedor_id || "",
      condicao_pagamento_id: po.condicao_pagamento_id || "",
      forma_pagamento_id: po.forma_pagamento_id || "",
    }));

    // Clear item mappings when PO changes - user needs to re-link
    setXmlItemMappings(prev => prev.map(m => ({ ...m, item_id: "", natureza_financeira_id: "", centro_custo_id: "" })));
  }

  // Handle item selection - auto-fill natureza/centro
  function handleItemChange(idx: number, itemId: string) {
    if (hasPO && !selectableItems.some(i => i.id === itemId)) {
      toast.error("Somente itens do Pedido de Compra vinculado podem ser selecionados");
      return;
    }

    const item = allItems.find(i => i.id === itemId) || selectableItems.find(i => i.id === itemId);
    const updated = [...xmlItemMappings];
    updated[idx] = {
      ...updated[idx],
      item_id: itemId,
      natureza_financeira_id: item?.natureza_financeira_id || updated[idx].natureza_financeira_id || "",
      centro_custo_id: item?.centro_custo_id || updated[idx].centro_custo_id || "",
    };
    setXmlItemMappings(updated);
  }

  function updateMapping(idx: number, field: keyof XmlItemMapping, value: string) {
    const updated = [...xmlItemMappings];
    updated[idx] = { ...updated[idx], [field]: value };
    setXmlItemMappings(updated);
  }

  function handleSubmit() {
    if (!xmlData) return;
    if (!form.fornecedor_id) { toast.error("Selecione o fornecedor"); return; }
    if (!form.forma_pagamento_id) { toast.error("Selecione a forma de pagamento"); return; }

    const mappedItems = xmlItemMappings
      .filter(m => m.item_id)
      .map(m => ({
        item_id: m.item_id,
        quantidade: parseFloat(m.quantidade),
        valor_unitario: parseFloat(m.valor_unitario),
        impostos: parseFloat(m.impostos || "0"),
        natureza_financeira_id: m.natureza_financeira_id || "",
        centro_custo_id: m.centro_custo_id || "",
      }));

    if (mappedItems.length === 0) {
      toast.error("Vincule ao menos um item do XML");
      return;
    }

    // Collect new mappings to save
    const newMappings = xmlItemMappings
      .filter(m => m.item_id && (m.xml_descricao || m.xml_codigo))
      .map(m => ({
        supplier_id: form.fornecedor_id,
        supplier_item_description: (m.xml_descricao || m.xml_codigo).trim(),
        supplier_item_code: m.xml_codigo?.trim() || "",
        item_id: m.item_id,
      }));

    onSubmit({
      fornecedor_id: form.fornecedor_id,
      condicao_pagamento_id: form.condicao_pagamento_id,
      forma_pagamento_id: form.forma_pagamento_id,
      purchase_order_id: form.purchase_order_id || undefined,
      numero: xmlData.numero,
      serie: xmlData.serie,
      data_emissao: xmlData.data_emissao,
      chave_acesso: xmlData.chave_acesso || "",
      items: mappedItems,
      supplier_item_mappings: newMappings,
    });
  }

  const hasPO = !!form.purchase_order_id;
  const calcTotal = xmlItemMappings
    .filter(m => m.item_id)
    .reduce((sum, m) => sum + parseFloat(m.quantidade || "0") * parseFloat(m.valor_unitario || "0") + parseFloat(m.impostos || "0"), 0);

  if (!xmlData) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">Importar NF-e via XML</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1">
            {/* NF-e data summary */}
            <div className="border rounded p-3 bg-muted/30 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
              <p className="text-xs"><span className="font-medium">Emitente:</span> {xmlData.emitente?.razao_social}</p>
              <p className="text-xs"><span className="font-medium">CNPJ:</span> {xmlData.emitente?.cnpj}</p>
              <p className="text-xs"><span className="font-medium">NF-e:</span> {xmlData.numero} | Série: {xmlData.serie}</p>
              <p className="text-xs"><span className="font-medium">Emissão:</span> {xmlData.data_emissao}</p>
              <p className="text-xs"><span className="font-medium">Chave:</span> {(xmlData.chave_acesso || "—").slice(0, 25)}...</p>
              <p className="text-xs font-semibold">Valor XML: R$ {Number(xmlData.valor_total).toFixed(2)}</p>
            </div>

            {/* Header fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Fornecedor */}
              <div className="space-y-1.5">
                <Label className="text-xs">Fornecedor *</Label>
                <div className="flex gap-1">
                  <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })} disabled={hasPO}>
                    <SelectTrigger className="h-8 text-xs flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id} className="text-xs">{s.razao_social} {s.cnpj ? `(${s.cnpj})` : ""}</SelectItem>)}</SelectContent>
                  </Select>
                  {!form.fornecedor_id && (
                    <Button type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0" title="Cadastrar fornecedor" onClick={() => setQuickSupplierOpen(true)}>
                      <UserPlus className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Pedido de Compra */}
              <div className="space-y-1.5">
                <Label className="text-xs">Pedido de Compra</Label>
                <Select value={form.purchase_order_id} onValueChange={handlePOChange}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhum (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
                    {purchaseOrders.map(po => (
                      <SelectItem key={po.id} value={po.id} className="text-xs">
                        PC-{po.numero_sequencial} — {po.fornecedor_nome || "—"} [{po.status}]
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Forma de Pagamento */}
              <div className="space-y-1.5">
                <Label className="text-xs">Forma de Pagamento *</Label>
                <Select value={form.forma_pagamento_id} onValueChange={(v) => setForm({ ...form, forma_pagamento_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(pm => <SelectItem key={pm.id} value={pm.id} className="text-xs">{pm.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {/* Condição de Pagamento */}
              <div className="space-y-1.5">
                <Label className="text-xs">Cond. Pagamento</Label>
                <Select value={form.condicao_pagamento_id} onValueChange={(v) => setForm({ ...form, condicao_pagamento_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="À vista (30 dias)" /></SelectTrigger>
                  <SelectContent>{paymentConditions.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.descricao} ({p.numero_parcelas}x)</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {hasPO && (
              <div className="border rounded p-2 bg-accent/30">
                <p className="text-2xs text-accent-foreground">
                  ⚠ Pedido de Compra vinculado: apenas itens do pedido podem ser selecionados.
                </p>
              </div>
            )}

            {/* Items grid */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Mapeamento de Itens (XML → Sistema)</Label>
              <div className="border rounded-md overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_1fr_70px_90px_70px_100px_100px_32px] gap-1 px-2 py-1.5 bg-muted/50 text-2xs font-medium text-muted-foreground">
                  <span>Produto XML</span>
                  <span>Item Sistema</span>
                  <span className="text-right">Qtd</span>
                  <span className="text-right">Vlr Unit</span>
                  <span className="text-right">Impostos</span>
                  <span>Natureza</span>
                  <span>Centro Custo</span>
                  <span></span>
                </div>

                {/* Items */}
                <div className="max-h-[40vh] overflow-y-auto">
                  {(xmlData.itens || []).map((xi: any, idx: number) => {
                    const mapping = xmlItemMappings[idx];
                    if (!mapping) return null;

                    return (
                      <div key={idx} className="grid grid-cols-[1fr_1fr_70px_90px_70px_100px_100px_32px] gap-1 px-2 py-1.5 items-center border-t text-2xs">
                        {/* XML product info */}
                        <span className="truncate" title={`${xi.cProd} - ${xi.xProd} | NCM: ${xi.NCM} | CFOP: ${xi.CFOP}`}>
                          <span className="font-mono">{xi.cProd}</span> {xi.xProd}
                        </span>

                        {/* Item select - filtered by PO if linked */}
                        <div className="flex gap-0.5">
                          <Select value={mapping.item_id || ""} onValueChange={(v) => handleItemChange(idx, v)}>
                            <SelectTrigger className="h-6 text-2xs flex-1"><SelectValue placeholder="Vincular item..." /></SelectTrigger>
                            <SelectContent>{selectableItems.map(i => <SelectItem key={i.id} value={i.id} className="text-2xs">{i.codigo} - {i.descricao}</SelectItem>)}</SelectContent>
                          </Select>
                          {!mapping.item_id && !hasPO && (
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" title="Cadastrar item" onClick={() => { setQuickItemIndex(idx); setQuickItemOpen(true); }}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>

                        {/* Quantity */}
                        <Input className="h-6 text-2xs text-right p-1" type="number" min="0.001" step="0.01"
                          value={mapping.quantidade}
                          onChange={(e) => updateMapping(idx, "quantidade", e.target.value)}
                        />

                        {/* Unit price */}
                        <Input className="h-6 text-2xs text-right p-1" type="number" min="0" step="0.01"
                          value={mapping.valor_unitario}
                          onChange={(e) => updateMapping(idx, "valor_unitario", e.target.value)}
                        />

                        {/* Taxes */}
                        <Input className="h-6 text-2xs text-right p-1" type="number" value={mapping.impostos} readOnly />

                        {/* Natureza Financeira */}
                        <Select value={mapping.natureza_financeira_id || ""} onValueChange={(v) => updateMapping(idx, "natureza_financeira_id", v)}>
                          <SelectTrigger className="h-6 text-2xs"><SelectValue placeholder="Natureza" /></SelectTrigger>
                          <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.id} className="text-2xs">{n.codigo} - {n.descricao}</SelectItem>)}</SelectContent>
                        </Select>

                        {/* Centro de Custo */}
                        <Select value={mapping.centro_custo_id || ""} onValueChange={(v) => updateMapping(idx, "centro_custo_id", v)}>
                          <SelectTrigger className="h-6 text-2xs"><SelectValue placeholder="C.Custo" /></SelectTrigger>
                          <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id} className="text-2xs">{c.codigo} - {c.descricao}</SelectItem>)}</SelectContent>
                        </Select>

                        {/* Status indicator */}
                        <span className={`text-center ${mapping.item_id ? "text-green-600" : "text-muted-foreground"}`}>
                          {mapping.item_id ? "✓" : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="grid grid-cols-[1fr_1fr_70px_90px_70px_100px_100px_32px] gap-1 px-2 py-1.5 border-t bg-muted/30 text-2xs font-semibold">
                  <span>{xmlData.itens?.length || 0} item(ns) XML</span>
                  <span>{xmlItemMappings.filter(m => m.item_id).length} vinculado(s)</span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                  <span className="text-right">R$ {calcTotal.toFixed(2)}</span>
                  <span></span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={submitting || !form.fornecedor_id || !form.forma_pagamento_id || xmlItemMappings.filter(m => m.item_id).length === 0}
              >
                {submitting ? "Salvando..." : "Criar Documento"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Supplier */}
      <QuickSupplierDialog
        open={quickSupplierOpen}
        onOpenChange={setQuickSupplierOpen}
        defaultCnpj={(xmlData.emitente?.cnpj || "").replace(/\D/g, "")}
        defaultRazaoSocial={xmlData.emitente?.razao_social || ""}
        defaultNomeFantasia={xmlData.emitente?.nome_fantasia || ""}
        onCreated={(supplier) => {
          setLocalSuppliers(prev => [...prev, supplier]);
          setForm(prev => ({ ...prev, fornecedor_id: supplier.id }));
          queryClient.invalidateQueries({ queryKey: ["suppliers_select_active"] });
        }}
      />

      {/* Quick Item */}
      <QuickItemDialog
        open={quickItemOpen}
        onOpenChange={setQuickItemOpen}
        defaultDescricao={quickItemIndex >= 0 ? xmlData.itens?.[quickItemIndex]?.xProd || "" : ""}
        defaultCodigo={quickItemIndex >= 0 ? xmlData.itens?.[quickItemIndex]?.cProd || "" : ""}
        onCreated={(item) => {
          setLocalItems(prev => [...prev, item]);
          if (quickItemIndex >= 0) {
            const updated = [...xmlItemMappings];
            updated[quickItemIndex] = {
              ...updated[quickItemIndex],
              item_id: item.id,
              natureza_financeira_id: item.natureza_financeira_id || "",
              centro_custo_id: item.centro_custo_id || "",
            };
            setXmlItemMappings(updated);
          }
          queryClient.invalidateQueries({ queryKey: ["items_select_active"] });
        }}
      />
    </>
  );
}
