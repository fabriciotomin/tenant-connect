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

  // Purchase orders query - use direct table query instead of RPC
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase_orders_for_xml", tenant?.id],
    enabled: !!tenant?.id && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, numero_sequencial, status, fornecedor_id, condicao_pagamento_id, forma_pagamento_id, valor_frete, suppliers(razao_social)")
        .eq("tenant_id", tenant!.id)
        .eq("status", "ABERTO")
        .order("numero_sequencial", { ascending: false });
      if (error) throw error;
      return (data || []).map((po: any) => ({
        id: po.id,
        numero_sequencial: po.numero_sequencial,
        status: po.status,
        fornecedor_id: po.fornecedor_id,
        fornecedor_nome: po.suppliers?.razao_social || "",
        condicao_pagamento_id: po.condicao_pagamento_id,
        forma_pagamento_id: po.forma_pagamento_id,
        valor_frete: po.valor_frete,
      }));
    },
  });

  // PO items query
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

  useEffect(() => {
    if (open && xmlData) {
      initializeFromXml();
    }
  }, [open, xmlData]);

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

    setXmlItemMappings(prev => prev.map(m => ({ ...m, item_id: "", natureza_financeira_id: "", centro_custo_id: "" })));
  }

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

              <div className="space-y-1.5">
                <Label className="text-xs">Forma de Pagamento *</Label>
                <Select value={form.forma_pagamento_id} onValueChange={(v) => setForm({ ...form, forma_pagamento_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(pm => <SelectItem key={pm.id} value={pm.id} className="text-xs">{pm.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>

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
                <div className="grid grid-cols-12 gap-1 px-2 py-1 bg-muted text-2xs font-medium">
                  <div className="col-span-3">Item XML</div>
                  <div className="col-span-3">Item Sistema</div>
                  <div className="col-span-1">Qtd</div>
                  <div className="col-span-1">Vlr Unit</div>
                  <div className="col-span-1">Impostos</div>
                  <div className="col-span-1">Natureza</div>
                  <div className="col-span-1">CC</div>
                  <div className="col-span-1"></div>
                </div>
                {xmlItemMappings.map((mapping, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-1 px-2 py-1 border-t items-center">
                    <div className="col-span-3">
                      <p className="text-2xs truncate" title={mapping.xml_descricao}>
                        {mapping.xml_codigo && <span className="font-mono text-muted-foreground">[{mapping.xml_codigo}] </span>}
                        {mapping.xml_descricao}
                      </p>
                    </div>
                    <div className="col-span-3">
                      <Select value={mapping.item_id} onValueChange={(v) => handleItemChange(idx, v)}>
                        <SelectTrigger className="h-7 text-2xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                          {selectableItems.map(i => (
                            <SelectItem key={i.id} value={i.id} className="text-2xs">{i.codigo} - {i.descricao}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Input className="h-7 text-2xs" type="number" step="0.01" value={mapping.quantidade} onChange={(e) => updateMapping(idx, "quantidade", e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Input className="h-7 text-2xs" type="number" step="0.01" value={mapping.valor_unitario} onChange={(e) => updateMapping(idx, "valor_unitario", e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Input className="h-7 text-2xs" type="number" step="0.01" value={mapping.impostos} onChange={(e) => updateMapping(idx, "impostos", e.target.value)} />
                    </div>
                    <div className="col-span-1">
                      <Select value={mapping.natureza_financeira_id} onValueChange={(v) => updateMapping(idx, "natureza_financeira_id", v)}>
                        <SelectTrigger className="h-7 text-2xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.id} className="text-2xs">{n.codigo}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      <Select value={mapping.centro_custo_id} onValueChange={(v) => updateMapping(idx, "centro_custo_id", v)}>
                        <SelectTrigger className="h-7 text-2xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id} className="text-2xs">{c.codigo}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1">
                      {!mapping.item_id && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" title="Cadastrar item"
                          onClick={() => { setQuickItemIndex(idx); setQuickItemOpen(true); }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-xs font-medium">Total mapeado: R$ {calcTotal.toFixed(2)}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? "Importando..." : "Importar NF-e"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <QuickSupplierDialog
        open={quickSupplierOpen}
        onOpenChange={setQuickSupplierOpen}
        defaultCnpj={xmlData?.emitente?.cnpj}
        defaultRazaoSocial={xmlData?.emitente?.razao_social}
        onCreated={(s) => {
          setLocalSuppliers(prev => [...prev, { id: s.id, razao_social: s.razao_social, cnpj: s.cnpj }]);
          setForm(prev => ({ ...prev, fornecedor_id: s.id }));
        }}
      />

      <QuickItemDialog
        open={quickItemOpen}
        onOpenChange={setQuickItemOpen}
        defaultDescricao={quickItemIndex >= 0 ? xmlItemMappings[quickItemIndex]?.xml_descricao : ""}
        defaultCodigo={quickItemIndex >= 0 ? xmlItemMappings[quickItemIndex]?.xml_codigo : ""}
        onCreated={(item) => {
          setLocalItems(prev => [...prev, { id: item.id, codigo: item.codigo, descricao: item.descricao, unidade_medida: item.unidade_medida, natureza_financeira_id: item.natureza_financeira_id, centro_custo_id: item.centro_custo_id }]);
          if (quickItemIndex >= 0) {
            handleItemChange(quickItemIndex, item.id);
          }
          setQuickItemIndex(-1);
        }}
      />
    </>
  );
}
