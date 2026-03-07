import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatDateBR } from "@/lib/dateUtils";
import { Plus, Trash2, CheckCircle, XCircle, Eye } from "lucide-react";
import { ItemPickerDialog, PickedItem } from "@/components/ItemPickerDialog";
import { usePaymentOptions } from "@/hooks/usePaymentOptions";
import { PaymentFieldsSelect } from "@/components/PaymentFieldsSelect";
import { useFinancialClassification } from "@/hooks/useFinancialClassification";

const statusColors: Record<string, string> = {
  PENDENTE: "bg-yellow-100 text-yellow-800",
  PROCESSADO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

interface OutboundDoc {
  id: string;
  numero_nf: number | null;
  serie: string | null;
  pedido_venda_id: string | null;
  service_order_id: string | null;
  valor_total: number;
  status: string;
  data_emissao: string;
  created_at: string;
  cliente_id: string;
  customers?: { razao_social: string } | null;
  sales_order_numero?: number | null;
  os_numero?: number | null;
}

interface DocItem {
  id?: string;
  item_id: string;
  quantidade: number;
  valor_unitario: number;
  natureza_financeira_id?: string | null;
  centro_custo_id?: string | null;
  items?: { codigo: string; descricao: string; saldo_estoque: number } | null;
}

export default function OutboundDocumentsPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [openCreate, setOpenCreate] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [openItemPicker, setOpenItemPicker] = useState(false);
  const [openDetailItemPicker, setOpenDetailItemPicker] = useState(false);
  const [confirmDialogId, setConfirmDialogId] = useState<string | null>(null);
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<OutboundDoc | null>(null);

  const { paymentConditions, paymentMethods } = usePaymentOptions();
  const { natures, costCenters } = useFinancialClassification();

  const [form, setForm] = useState({
    cliente_id: "",
    data_emissao: new Date().toISOString().split("T")[0],
    condicao_pagamento_id: "",
    forma_pagamento_id: "",
    serie: "",
    numero_nf: "",
  });

  // Load default series for auto-fill
  const { data: defaultSeries } = useQuery({
    queryKey: ["default_document_series", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_series")
        .select("id, serie, proximo_numero, nome")
        .eq("padrao", true)
        .eq("ativo", true)
        .is("deleted_at", null)
        .limit(1)
        .single();
      if (error) return null;
      return data;
    },
  });

  // Load all active series for dropdown
  const { data: seriesList = [] } = useQuery({
    queryKey: ["document_series_list", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_series")
        .select("id, serie, proximo_numero, nome, padrao")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const [newItems, setNewItems] = useState<
    { item_id: string; quantidade: string; valor_unitario: string; natureza_financeira_id: string; centro_custo_id: string }[]
  >([]);

  // ---- Queries ----
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["outbound_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_documents")
        .select("*, customers(razao_social)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      
      const soIds = (data || []).map(d => d.pedido_venda_id).filter(Boolean) as string[];
      let soMap: Record<string, number> = {};
      if (soIds.length > 0) {
        const { data: soData } = await supabase
          .from("sales_orders")
          .select("id, numero_sequencial")
          .in("id", soIds);
        soMap = (soData || []).reduce((acc, s) => ({ ...acc, [s.id]: s.numero_sequencial }), {} as Record<string, number>);
      }

      // Fetch linked service order numbers
      const osIds = (data || []).map(d => (d as any).service_order_id).filter(Boolean) as string[];
      let osMap: Record<string, number> = {};
      if (osIds.length > 0) {
        const { data: osData } = await supabase
          .from("service_orders")
          .select("id, numero_sequencial")
          .in("id", osIds);
        osMap = (osData || []).reduce((acc, s) => ({ ...acc, [s.id]: (s as any).numero_sequencial }), {} as Record<string, number>);
      }
      
      return (data || []).map(d => ({
        ...d,
        sales_order_numero: d.pedido_venda_id ? soMap[d.pedido_venda_id] || null : null,
        os_numero: (d as any).service_order_id ? osMap[(d as any).service_order_id] || null : null,
      })) as OutboundDoc[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers_select_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, razao_social")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items_select_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id, codigo, descricao, unidade_medida, saldo_estoque, custo_medio, preco_venda, natureza_venda_id, centro_custo_venda_id")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const { data: docItems = [] } = useQuery({
    queryKey: ["outbound_doc_items", selectedDoc?.id],
    enabled: !!selectedDoc,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_document_items")
        .select("id, item_id, quantidade, valor_unitario, outbound_document_id, natureza_financeira_id, centro_custo_id, items(codigo, descricao, saldo_estoque)")
        .eq("outbound_document_id", selectedDoc!.id)
        .is("deleted_at", null);
      if (error) throw error;
      return data as any as DocItem[];
    },
  });

  // ---- Mutations ----
  const createDocMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Sem tenant");
      if (!form.cliente_id) throw new Error("Cliente obrigatório");
      if (newItems.length === 0) throw new Error("Adicione ao menos um item");

      const valorTotal = newItems.reduce(
        (sum, i) =>
          sum +
          parseFloat(i.quantidade || "0") * parseFloat(i.valor_unitario || "0"),
        0
      );

      const { data: doc, error: docError } = await supabase
        .from("outbound_documents")
        .insert({
          tenant_id: tenant.id,
          cliente_id: form.cliente_id,
          data_emissao: form.data_emissao,
          valor_total: valorTotal,
          condicao_pagamento_id: form.condicao_pagamento_id || null,
          forma_pagamento_id: form.forma_pagamento_id || null,
          serie: form.serie || null,
          numero_nf: form.numero_nf ? parseInt(form.numero_nf) : null,
        } as any)
        .select("id")
        .single();
      if (docError) throw docError;

      const itemsToInsert = newItems.map((i) => ({
        outbound_document_id: doc.id,
        item_id: i.item_id,
        quantidade: parseFloat(i.quantidade),
        valor_unitario: parseFloat(i.valor_unitario),
        natureza_financeira_id: i.natureza_financeira_id || null,
        centro_custo_id: i.centro_custo_id || null,
      }));

      const { error: itemsError } = await supabase
        .from("outbound_document_items")
        .insert(itemsToInsert);
      if (itemsError) throw itemsError;

      return doc.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound_documents"] });
      queryClient.invalidateQueries({ queryKey: ["default_document_series"] });
      queryClient.invalidateQueries({ queryKey: ["document_series_list"] });
      setOpenCreate(false);
      resetForm();
      toast.success("Documento de saída criado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const confirmMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.rpc("process_outbound_document", {
        _doc_id: docId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound_documents"] });
      queryClient.invalidateQueries({ queryKey: ["items_select"] });
      queryClient.invalidateQueries({ queryKey: ["default_document_series"] });
      queryClient.invalidateQueries({ queryKey: ["document_series_list"] });
      setConfirmDialogId(null);
      toast.success("Documento confirmado! Estoque movimentado.");
    },
    onError: (e: any) => toast.error(`Erro ao confirmar: ${e.message}`),
  });

  const cancelMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.rpc("cancel_outbound_document" as any, {
        _doc_id: docId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound_documents"] });
      queryClient.invalidateQueries({ queryKey: ["items_select_active"] });
      setCancelDialogId(null);
      toast.success("Documento cancelado. Estoque e financeiro revertidos.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addItemToDoc = useMutation({
    mutationFn: async ({
      docId,
      item,
    }: {
      docId: string;
      item: { item_id: string; quantidade: number; valor_unitario: number };
    }) => {
      const { error } = await supabase.from("outbound_document_items").insert({
        outbound_document_id: docId,
        item_id: item.item_id,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        natureza_financeira_id: (item as any).natureza_financeira_id || null,
        centro_custo_id: (item as any).centro_custo_id || null,
      });
      if (error) throw error;

      const { data: allItemsData } = await supabase
        .from("outbound_document_items")
        .select("quantidade, valor_unitario")
        .eq("outbound_document_id", docId);

      const newTotal = (allItemsData || []).reduce(
        (sum, i: any) => sum + i.quantidade * i.valor_unitario,
        0
      );

      await supabase
        .from("outbound_documents")
        .update({ valor_total: newTotal })
        .eq("id", docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound_doc_items"] });
      queryClient.invalidateQueries({ queryKey: ["outbound_documents"] });
      toast.success("Item adicionado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeItemFromDoc = useMutation({
    mutationFn: async ({ itemId, docId }: { itemId: string; docId: string }) => {
      const { error } = await supabase
        .from("outbound_document_items")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", itemId);
      if (error) throw error;

      const { data: allItemsData2 } = await supabase
        .from("outbound_document_items")
        .select("quantidade, valor_unitario")
        .eq("outbound_document_id", docId)
        .is("deleted_at", null);

      const newTotal = (allItemsData2 || []).reduce(
        (sum, i: any) => sum + i.quantidade * i.valor_unitario,
        0
      );

      await supabase
        .from("outbound_documents")
        .update({ valor_total: newTotal })
        .eq("id", docId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["outbound_doc_items"] });
      queryClient.invalidateQueries({ queryKey: ["outbound_documents"] });
      toast.success("Item removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() {
    setForm({
      cliente_id: "",
      data_emissao: new Date().toISOString().split("T")[0],
      condicao_pagamento_id: "",
      forma_pagamento_id: "",
      serie: defaultSeries?.serie || "",
      numero_nf: defaultSeries?.proximo_numero ? String(defaultSeries.proximo_numero) : "",
    });
    setNewItems([]);
  }

  function handlePickedItems(picked: PickedItem[]) {
    const rows = picked.map((p) => {
      const item = items.find((i) => i.id === p.item_id);
      return {
        item_id: p.item_id,
        quantidade: p.quantidade > 0 ? String(p.quantidade) : "",
        valor_unitario: String(item?.preco_venda || 0),
        natureza_financeira_id: item?.natureza_venda_id || "",
        centro_custo_id: item?.centro_custo_venda_id || "",
      };
    });
    setNewItems((prev) => [...prev, ...rows]);
    setOpenItemPicker(false);
  }

  function handleDetailPickedItems(picked: PickedItem[]) {
    if (!selectedDoc) return;
    picked.forEach((p) => {
      const item = items.find((i) => i.id === p.item_id);
      addItemToDoc.mutate({
        docId: selectedDoc.id,
        item: {
          item_id: p.item_id,
          quantidade: p.quantidade > 0 ? p.quantidade : 1,
          valor_unitario: item?.preco_venda || 0,
          natureza_financeira_id: item?.natureza_venda_id || null,
          centro_custo_id: item?.centro_custo_venda_id || null,
        } as any,
      });
    });
    setOpenDetailItemPicker(false);
  }

  function updateNewItem(index: number, field: string, value: string) {
    const updated = [...newItems];
    (updated[index] as any)[field] = value;
    setNewItems(updated);
  }

  function removeNewItem(index: number) {
    setNewItems(newItems.filter((_, i) => i !== index));
  }

  const calcTotal = () =>
    newItems.reduce(
      (sum, i) =>
        sum +
        parseFloat(i.quantidade || "0") * parseFloat(i.valor_unitario || "0"),
      0
    );

  // ---- Table columns ----
  const columns = [
    {
      key: "numero_nf",
      label: "NF",
      render: (r: OutboundDoc) =>
        r.numero_nf
          ? `${r.serie || "1"} / ${String(r.numero_nf).padStart(6, "0")}`
          : r.status === "PENDENTE" ? "Pendente" : "—",
    },
    {
      key: "pedido_venda",
      label: "Origem",
      render: (r: OutboundDoc) => {
        if (r.os_numero) return `OS-${String(r.os_numero).padStart(3, "0")}`;
        if (r.sales_order_numero) return `PV-${r.sales_order_numero}`;
        return "—";
      },
    },
    {
      key: "cliente",
      label: "Cliente",
      render: (r: OutboundDoc) => r.customers?.razao_social || "—",
    },
    {
      key: "status",
      label: "Status",
      render: (r: OutboundDoc) => (
        <Badge className={`text-2xs ${statusColors[r.status] || ""}`}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "valor_total",
      label: "Valor Total",
      render: (r: OutboundDoc) => `R$ ${Number(r.valor_total).toFixed(2)}`,
    },
    {
      key: "data_emissao",
      label: "Emissão",
      render: (r: OutboundDoc) => formatDateBR(r.data_emissao),
    },
    {
      key: "acoes",
      label: "Ações",
      render: (r: OutboundDoc) => {
        const isPending = r.status === "PENDENTE";
        const canCancel = r.status !== "CANCELADO";
        return (
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Detalhes" onClick={(e) => { e.stopPropagation(); setSelectedDoc(r); setOpenDetail(true); }}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" title="Confirmar" disabled={!isPending} onClick={(e) => { e.stopPropagation(); setConfirmDialogId(r.id); }}>
              <CheckCircle className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Cancelar" disabled={!canCancel} onClick={(e) => { e.stopPropagation(); setCancelDialogId(r.id); }}>
              <XCircle className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Documentos de Saída (NF-e)</h1>
        <p className="text-xs text-muted-foreground">
          Ao confirmar: movimenta estoque (SAÍDA) automaticamente
        </p>
      </div>

      <DataTable
        columns={columns}
        data={docs}
        loading={isLoading}
        searchPlaceholder="Buscar documento..."
        addLabel="Novo Documento"
        onAdd={() => {
          setForm({
            cliente_id: "",
            data_emissao: new Date().toISOString().split("T")[0],
            condicao_pagamento_id: "",
            forma_pagamento_id: "",
            serie: defaultSeries?.serie || "",
            numero_nf: defaultSeries?.proximo_numero ? String(defaultSeries.proximo_numero) : "",
          });
          setNewItems([]);
          setOpenCreate(true);
        }}
        filterFn={(r, s) =>
          (r.customers?.razao_social || "").toLowerCase().includes(s) ||
          (r.numero_nf ? String(r.numero_nf) : "").includes(s) ||
          r.status.toLowerCase().includes(s)
        }
      />

      {/* CREATE DIALOG */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">Novo Documento de Saída</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createDocMutation.mutate();
            }}
            className="space-y-4 overflow-y-auto flex-1"
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente *</Label>
                <Select value={form.cliente_id} onValueChange={(v) => setForm({ ...form, cliente_id: v })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data Emissão</Label>
                <Input
                  className="h-8 text-xs"
                  type="date"
                  value={form.data_emissao}
                  onChange={(e) => setForm({ ...form, data_emissao: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Série</Label>
                <Select value={form.serie} onValueChange={(v) => {
                  const sel = seriesList.find(s => s.serie === v);
                  setForm({ ...form, serie: v, numero_nf: sel ? String(sel.proximo_numero) : "" });
                }}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Série" /></SelectTrigger>
                  <SelectContent>
                    {seriesList.map(s => (
                      <SelectItem key={s.id} value={s.serie || "1"} className="text-xs">
                        {s.nome} (Série {s.serie})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Número NF</Label>
                <Input
                  className="h-8 text-xs bg-muted/30"
                  type="number"
                  value={form.numero_nf}
                  disabled
                  readOnly
                />
                <p className="text-2xs text-muted-foreground">Gerado automaticamente pelo sistema</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PaymentFieldsSelect
                condicaoId={form.condicao_pagamento_id}
                formaId={form.forma_pagamento_id}
                onCondicaoChange={(v) => setForm({ ...form, condicao_pagamento_id: v })}
                onFormaChange={(v) => setForm({ ...form, forma_pagamento_id: v })}
                paymentConditions={paymentConditions}
                paymentMethods={paymentMethods}
              />
            </div>

            {/* Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Itens do Documento</Label>
                <Button type="button" variant="outline" size="sm" className="h-7 text-2xs" onClick={() => setOpenItemPicker(true)}>
                  <Plus className="h-3 w-3 mr-1" /> Selecionar Itens
                </Button>
              </div>
              {newItems.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center border rounded">
                  Nenhum item adicionado
                </p>
              )}
              {newItems.map((item, idx) => {
                const itemInfo = items.find(i => i.id === item.item_id);
                return (
                  <div key={idx} className="space-y-1 border rounded-md p-2 bg-muted/10">
                    <div className="grid grid-cols-[1fr_80px_100px_32px] sm:grid-cols-[1fr_50px_80px_100px_32px] gap-2 items-end">
                      <div>
                        <Label className="text-2xs">Item</Label>
                        <span className="text-2xs block border rounded-md px-2 py-1 h-7 bg-muted/30 text-muted-foreground leading-[1.75rem] truncate">
                          {itemInfo ? `${itemInfo.codigo} - ${itemInfo.descricao}` : item.item_id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="hidden sm:block">
                        <Label className="text-2xs">UN</Label>
                        <span className="text-2xs block border rounded-md px-2 py-1 h-7 bg-muted/30 text-center text-muted-foreground leading-[1.75rem]">
                          {itemInfo?.unidade_medida || "UN"}
                        </span>
                      </div>
                      <div>
                        <Label className="text-2xs">Qtd</Label>
                        <Input className="h-7 text-2xs" type="number" min="0.01" step="0.01" value={item.quantidade} onChange={(e) => updateNewItem(idx, "quantidade", e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-2xs">Vlr Unit</Label>
                        <Input className="h-7 text-2xs" type="number" min="0" step="0.01" value={item.valor_unitario} onChange={(e) => updateNewItem(idx, "valor_unitario", e.target.value)} />
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeNewItem(idx)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-2xs">Nat. Financeira</Label>
                        <Select value={item.natureza_financeira_id} onValueChange={(v) => updateNewItem(idx, "natureza_financeira_id", v)}>
                          <SelectTrigger className="h-7 text-2xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {natures.map(n => <SelectItem key={n.id} value={n.id} className="text-xs">{n.codigo} - {n.descricao}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-2xs">Centro de Custo</Label>
                        <Select value={item.centro_custo_id} onValueChange={(v) => updateNewItem(idx, "centro_custo_id", v)}>
                          <SelectTrigger className="h-7 text-2xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {costCenters.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.codigo} - {c.descricao}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
              {newItems.length > 0 && (
                <div className="text-right text-xs font-semibold pt-1">
                  Total: R$ {calcTotal().toFixed(2)}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => { setOpenCreate(false); resetForm(); }}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createDocMutation.isPending || !form.cliente_id || newItems.length === 0}
              >
                {createDocMutation.isPending ? "Salvando..." : "Criar Documento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* DETAIL DIALOG */}
      <Dialog open={openDetail} onOpenChange={(open) => { setOpenDetail(open); if (!open) setSelectedDoc(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              {selectedDoc?.numero_nf
                ? `NF ${selectedDoc.serie || "1"} / ${String(selectedDoc.numero_nf).padStart(6, "0")}`
                : `Documento ${selectedDoc?.id.slice(0, 8)}`}
              {selectedDoc && (
                <Badge className={`text-2xs ${statusColors[selectedDoc.status] || ""}`}>
                  {selectedDoc.status}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedDoc && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>{" "}
                  {selectedDoc.customers?.razao_social || "—"}
                </div>
                <div>
                  <span className="text-muted-foreground">Emissão:</span>{" "}
                  {format(new Date(selectedDoc.data_emissao), "dd/MM/yyyy")}
                </div>
                <div>
                  <span className="text-muted-foreground">Total:</span>{" "}
                  R$ {Number(selectedDoc.valor_total).toFixed(2)}
                </div>
              </div>

              {/* Items list */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Itens</Label>
                <div className="border rounded">
                  <table className="w-full text-2xs">
                    <thead className="bg-muted/50">
                      <tr>
                         <th className="text-left p-1.5">Item</th>
                         <th className="text-center p-1.5 w-12">UN</th>
                         <th className="text-right p-1.5">Qtd</th>
                        <th className="text-right p-1.5">Vlr Unit</th>
                        <th className="text-right p-1.5">Subtotal</th>
                        <th className="text-left p-1.5">Nat. Fin.</th>
                        <th className="text-left p-1.5">C. Custo</th>
                        {selectedDoc.status === "PENDENTE" && (
                          <th className="p-1.5 w-8"></th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {docItems.map((di) => {
                        const natCode = di.natureza_financeira_id ? natures.find(n => n.id === di.natureza_financeira_id) : null;
                        const ccCode = di.centro_custo_id ? costCenters.find(c => c.id === di.centro_custo_id) : null;
                        return (
                        <tr key={di.id} className="border-t">
                           <td className="p-1.5">
                             {di.items?.codigo} - {di.items?.descricao}
                           </td>
                           <td className="text-center p-1.5 text-muted-foreground">
                             {items.find(i => i.id === di.item_id)?.unidade_medida || "UN"}
                           </td>
                           <td className="text-right p-1.5">{di.quantidade}</td>
                          <td className="text-right p-1.5">
                            R$ {Number(di.valor_unitario).toFixed(2)}
                          </td>
                          <td className="text-right p-1.5">
                            R$ {(di.quantidade * di.valor_unitario).toFixed(2)}
                          </td>
                          <td className="p-1.5 text-muted-foreground">
                            {natCode ? `${natCode.codigo} - ${natCode.descricao}` : "—"}
                          </td>
                          <td className="p-1.5 text-muted-foreground">
                            {ccCode ? `${ccCode.codigo} - ${ccCode.descricao}` : "—"}
                          </td>
                          {selectedDoc.status === "PENDENTE" && (
                            <td className="p-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-destructive"
                                onClick={() =>
                                  removeItemFromDoc.mutate({
                                    itemId: di.id!,
                                    docId: selectedDoc.id,
                                  })
                                }
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                      })}
                      {docItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center p-4 text-muted-foreground">
                            Nenhum item
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add item via picker (only PENDENTE) */}
              {selectedDoc.status === "PENDENTE" && (
                <div className="space-y-2 border-t pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-2xs"
                    onClick={() => setOpenDetailItemPicker(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Selecionar Itens
                  </Button>
                </div>
              )}

              {/* Actions */}
              {(selectedDoc.status === "PENDENTE" || selectedDoc.status === "PROCESSADO") && (
                <div className="flex gap-2 pt-2 border-t">
                  {selectedDoc.status === "PENDENTE" && (
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => setConfirmDialogId(selectedDoc.id)}
                      disabled={docItems.length === 0}
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1" />
                      Confirmar Documento
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                    onClick={() => setCancelDialogId(selectedDoc.id)}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Cancelar Documento
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* CONFIRM DIALOG */}
      <AlertDialog open={!!confirmDialogId} onOpenChange={() => setConfirmDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Confirmar Documento de Saída?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Esta ação irá movimentar estoque (SAÍDA) para todos os itens.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDialogId && confirmMutation.mutate(confirmDialogId)}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CANCEL DIALOG */}
      <AlertDialog open={!!cancelDialogId} onOpenChange={() => setCancelDialogId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Cancelar Documento?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja cancelar este documento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => cancelDialogId && cancelMutation.mutate(cancelDialogId)}
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ITEM PICKER for Create */}
      <ItemPickerDialog
        open={openItemPicker}
        onOpenChange={setOpenItemPicker}
        onConfirm={handlePickedItems}
        excludeIds={newItems.map((i) => i.item_id)}
      />

      {/* ITEM PICKER for Detail */}
      <ItemPickerDialog
        open={openDetailItemPicker}
        onOpenChange={setOpenDetailItemPicker}
        onConfirm={handleDetailPickedItems}
        excludeIds={docItems.map((i) => i.item_id)}
      />
    </div>
  );
}
