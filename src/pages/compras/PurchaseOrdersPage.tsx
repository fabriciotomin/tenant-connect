import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { DataTable } from "@/components/DataTable";
import { ItemPickerDialog, PickedItem } from "@/components/ItemPickerDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { Plus, Trash2, Pencil, Copy, Eye, XCircle } from "lucide-react";
import { useFinancialClassification } from "@/hooks/useFinancialClassification";

const statusColors: Record<string, string> = {
  ABERTO: "bg-blue-100 text-blue-800",
  PARCIAL: "bg-yellow-100 text-yellow-800",
  ATENDIDO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

interface PurchaseOrder {
  id: string;
  numero_sequencial: number;
  status: string;
  data_entrega: string | null;
  valor_frete: number;
  created_at: string;
  fornecedor_id: string;
  condicao_pagamento_id: string | null;
  forma_pagamento_id: string | null;
  suppliers?: { razao_social: string } | null;
}

interface POItem {
  item_id: string;
  quantidade: string;
  valor_unitario: string;
  impostos: string;
  frete_unitario: string;
  frete_total_item: string;
  natureza_financeira_id: string;
  centro_custo_id: string;
}

export default function PurchaseOrdersPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    fornecedor_id: "",
    data_entrega: "",
    valor_frete: "0",
    condicao_pagamento_id: "",
    forma_pagamento_id: "",
    frete_tipo: "GLOBAL" as "GLOBAL" | "POR_ITEM",
  });
  const [orderItems, setOrderItems] = useState<POItem[]>([]);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<PurchaseOrder | null>(null);
  const [viewItems, setViewItems] = useState<POItem[]>([]);
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, numero_sequencial, status, data_entrega, valor_frete, created_at, fornecedor_id, condicao_pagamento_id, forma_pagamento_id, suppliers(razao_social)")
        .is("deleted_at", null)
        .order("numero_sequencial", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PurchaseOrder[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers_select_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("id, razao_social").eq("ativo", true).is("deleted_at", null).order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items_select_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id, codigo, descricao, unidade_medida").eq("ativo", true).is("deleted_at", null).order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const { natures, costCenters } = useFinancialClassification();

  const { data: paymentConditions = [] } = useQuery({
    queryKey: ["payment_conditions_select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_conditions").select("id, descricao").is("deleted_at", null).order("descricao");
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["formas_pagamento_select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("formas_pagamento").select("id, nome").eq("ativo", true).is("deleted_at", null).order("nome");
      if (error) throw error;
      return data;
    },
  });

  function distributeFreight(items: POItem[], totalFreight: number): POItem[] {
    const totalValue = items.reduce((s, i) => s + parseFloat(i.quantidade || "0") * parseFloat(i.valor_unitario || "0"), 0);
    if (totalValue === 0) return items;
    return items.map((i) => {
      const itemValue = parseFloat(i.quantidade || "0") * parseFloat(i.valor_unitario || "0");
      const proportion = itemValue / totalValue;
      const itemFreight = totalFreight * proportion;
      const qty = parseFloat(i.quantidade || "1") || 1;
      return { ...i, frete_total_item: itemFreight.toFixed(2), frete_unitario: (itemFreight / qty).toFixed(2) };
    });
  }

  function handleAddSelectedItems(pickedItems: PickedItem[]) {
    const newItems: POItem[] = pickedItems
      .filter((p) => !orderItems.some((oi) => oi.item_id === p.item_id))
      .map((p) => ({
        item_id: p.item_id, quantidade: String(p.quantidade), valor_unitario: String(p.valor_unitario),
        impostos: "0", frete_unitario: "0", frete_total_item: "0",
        natureza_financeira_id: "", centro_custo_id: "",
      }));
    const updated = [...orderItems, ...newItems];
    const totalFreight = parseFloat(form.valor_frete) || 0;
    setOrderItems(form.frete_tipo === "GLOBAL" ? distributeFreight(updated, totalFreight) : updated);
  }

  function handleFreightChange(value: string) {
    setForm({ ...form, valor_frete: value });
    if (form.frete_tipo === "GLOBAL") {
      setOrderItems(distributeFreight(orderItems, parseFloat(value) || 0));
    }
  }

  async function handleEdit(order: PurchaseOrder) {
    const { data: poItems, error } = await supabase
      .from("purchase_order_items")
      .select("item_id, quantidade, valor_unitario, impostos, frete_unitario, frete_total_item, natureza_financeira_id, centro_custo_id")
      .eq("purchase_order_id", order.id);
    if (error) { toast.error(error.message); return; }

    setEditingId(order.id);
    setForm({
      fornecedor_id: order.fornecedor_id || "",
      data_entrega: order.data_entrega || "",
      valor_frete: String(order.valor_frete || 0),
      condicao_pagamento_id: order.condicao_pagamento_id || "",
      forma_pagamento_id: order.forma_pagamento_id || "",
      frete_tipo: "GLOBAL",
    });
    setOrderItems((poItems || []).map(i => ({
      item_id: i.item_id || "",
      quantidade: String(i.quantidade),
      valor_unitario: String(i.valor_unitario),
      impostos: String(i.impostos),
      frete_unitario: String(i.frete_unitario),
      frete_total_item: String(i.frete_total_item),
      natureza_financeira_id: i.natureza_financeira_id || "",
      centro_custo_id: i.centro_custo_id || "",
    })));
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setEditingId(null);
    setForm({ fornecedor_id: "", data_entrega: "", valor_frete: "0", condicao_pagamento_id: "", forma_pagamento_id: "", frete_tipo: "GLOBAL" });
    setOrderItems([]);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Sem tenant");
      if (!form.fornecedor_id) throw new Error("Fornecedor obrigatório");
      if (orderItems.length === 0) throw new Error("Adicione ao menos um item");

      if (editingId) {
        // Validate editable: check status directly
        const { data: existing } = await supabase
          .from("purchase_orders")
          .select("status")
          .eq("id", editingId)
          .single();
        if (existing && existing.status !== "ABERTO") {
          throw new Error("Este pedido não pode mais ser editado (status: " + existing.status + ")");
        }

        const { error } = await supabase.from("purchase_orders").update({
          fornecedor_id: form.fornecedor_id,
          data_entrega: form.data_entrega || null,
          valor_frete: parseFloat(form.valor_frete) || 0,
          condicao_pagamento_id: form.condicao_pagamento_id || null,
          forma_pagamento_id: form.forma_pagamento_id || null,
        }).eq("id", editingId);
        if (error) throw error;

        const { error: de } = await supabase.from("purchase_order_items").delete().eq("purchase_order_id", editingId);
        if (de) throw de;

        const { error: ie } = await supabase.from("purchase_order_items").insert(
          orderItems.map((i) => ({
            purchase_order_id: editingId,
            tenant_id: tenant.id,
            item_id: i.item_id,
            quantidade: parseFloat(i.quantidade),
            valor_unitario: parseFloat(i.valor_unitario),
            impostos: parseFloat(i.impostos || "0"),
            frete_unitario: parseFloat(i.frete_unitario || "0"),
            frete_total_item: parseFloat(i.frete_total_item || "0"),
            natureza_financeira_id: i.natureza_financeira_id || null,
            centro_custo_id: i.centro_custo_id || null,
          }))
        );
        if (ie) throw ie;
      } else {
        const { data: po, error } = await supabase
          .from("purchase_orders")
          .insert({
            tenant_id: tenant.id,
            fornecedor_id: form.fornecedor_id,
            data_entrega: form.data_entrega || null,
            valor_frete: parseFloat(form.valor_frete) || 0,
            condicao_pagamento_id: form.condicao_pagamento_id || null,
            forma_pagamento_id: form.forma_pagamento_id || null,
            created_by: user?.id,
          } as any)
          .select("id")
          .single();
        if (error) throw error;

        const { error: ie } = await supabase.from("purchase_order_items").insert(
          orderItems.map((i) => ({
            purchase_order_id: po.id,
            tenant_id: tenant.id,
            item_id: i.item_id,
            quantidade: parseFloat(i.quantidade),
            valor_unitario: parseFloat(i.valor_unitario),
            impostos: parseFloat(i.impostos || "0"),
            frete_unitario: parseFloat(i.frete_unitario || "0"),
            frete_total_item: parseFloat(i.frete_total_item || "0"),
            natureza_financeira_id: i.natureza_financeira_id || null,
            centro_custo_id: i.centro_custo_id || null,
          }))
        );
        if (ie) throw ie;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      handleClose();
      toast.success(editingId ? "Pedido atualizado" : "Pedido de compra criado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (!tenant?.id) throw new Error("Sem tenant");
      const { data: po, error: oe } = await supabase
        .from("purchase_orders")
        .select("*, purchase_order_items(*)")
        .eq("id", orderId)
        .single();
      if (oe) throw oe;
      if (po.status === "CANCELADO") throw new Error("Não é possível duplicar pedido cancelado");

      const { data: npo, error } = await supabase.from("purchase_orders").insert({
        tenant_id: tenant.id,
        fornecedor_id: po.fornecedor_id,
        data_entrega: po.data_entrega,
        valor_frete: po.valor_frete,
        condicao_pagamento_id: po.condicao_pagamento_id,
        forma_pagamento_id: po.forma_pagamento_id,
        created_by: user?.id,
      } as any).select("id").single();
      if (error) throw error;

      if (po.purchase_order_items?.length > 0) {
        const { error: ie } = await supabase.from("purchase_order_items").insert(
          po.purchase_order_items.map((i: any) => ({
            purchase_order_id: npo.id,
            tenant_id: tenant.id,
            item_id: i.item_id,
            quantidade: i.quantidade,
            valor_unitario: i.valor_unitario,
            impostos: i.impostos,
            frete_unitario: i.frete_unitario,
            frete_total_item: i.frete_total_item,
            natureza_financeira_id: i.natureza_financeira_id || null,
            centro_custo_id: i.centro_custo_id || null,
          }))
        );
        if (ie) throw ie;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      toast.success("Pedido de compra duplicado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("purchase_orders")
        .update({ status: "CANCELADO" })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      queryClient.invalidateQueries({ queryKey: ["inbound_documents"] });
      setCancelDialogId(null);
      toast.success("Pedido de compra cancelado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function handleView(order: PurchaseOrder) {
    const { data: poItems } = await supabase
      .from("purchase_order_items")
      .select("item_id, quantidade, valor_unitario, impostos, frete_unitario, frete_total_item, natureza_financeira_id, centro_custo_id")
      .eq("purchase_order_id", order.id);
    setViewDoc(order);
    setViewItems((poItems || []).map(i => ({
      item_id: i.item_id || "",
      quantidade: String(i.quantidade),
      valor_unitario: String(i.valor_unitario),
      impostos: String(i.impostos),
      frete_unitario: String(i.frete_unitario),
      frete_total_item: String(i.frete_total_item),
      natureza_financeira_id: i.natureza_financeira_id || "",
      centro_custo_id: i.centro_custo_id || "",
    })));
  }

  const columns = [
    { key: "numero", label: "Nº", render: (r: PurchaseOrder) => `PC-${r.numero_sequencial}` },
    { key: "fornecedor", label: "Fornecedor", render: (r: PurchaseOrder) => r.suppliers?.razao_social || "—" },
    { key: "status", label: "Status", render: (r: PurchaseOrder) => <Badge className={`text-2xs ${statusColors[r.status] || ""}`}>{r.status}</Badge> },
    { key: "data_entrega", label: "Entrega", render: (r: PurchaseOrder) => r.data_entrega ? format(new Date(r.data_entrega), "dd/MM/yyyy") : "—" },
    { key: "valor_frete", label: "Frete", render: (r: PurchaseOrder) => `R$ ${Number(r.valor_frete).toFixed(2)}` },
    { key: "created_at", label: "Criado em", render: (r: PurchaseOrder) => format(new Date(r.created_at), "dd/MM/yyyy") },
    {
      key: "acoes", label: "Ações", render: (r: PurchaseOrder) => {
        const canEdit = r.status === "ABERTO";
        const canDuplicate = r.status !== "CANCELADO";
        const canCancel = r.status !== "CANCELADO";
        return (
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver" onClick={(e) => { e.stopPropagation(); handleView(r); }}><Eye className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" disabled={!canEdit} onClick={(e) => { e.stopPropagation(); handleEdit(r); }}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" disabled={!canDuplicate} onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate(r.id); }}><Copy className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Cancelar" disabled={!canCancel} onClick={(e) => { e.stopPropagation(); setCancelDialogId(r.id); }}><XCircle className="h-3.5 w-3.5" /></Button>
          </div>
        );
      },
    },
  ];

  const getItemLabel = (id: string) => {
    const item = items.find((i) => i.id === id);
    return item ? `${item.codigo} - ${item.descricao}` : id.slice(0, 8);
  };
  const getItemUnit = (id: string) => {
    const item = items.find((i) => i.id === id);
    return item?.unidade_medida || "UN";
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Pedidos de Compra</h1>
        <p className="text-xs text-muted-foreground">Gestão de pedidos de compra</p>
      </div>

      <DataTable
        columns={columns}
        data={orders}
        loading={isLoading}
        searchPlaceholder="Buscar pedido..."
        addLabel="Novo Pedido"
        onAdd={() => { setEditingId(null); setOpen(true); }}
        filterFn={(r, s) => (r.suppliers?.razao_social || "").toLowerCase().includes(s) || r.status.toLowerCase().includes(s)}
      />

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingId ? "Editar Pedido de Compra" : "Novo Pedido de Compra"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Fornecedor *</Label>
                <Select value={form.fornecedor_id} onValueChange={(v) => setForm({ ...form, fornecedor_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id} className="text-xs">{s.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Data de Entrega</Label>
                <Input className="h-8 text-xs" type="date" value={form.data_entrega} onChange={(e) => setForm({ ...form, data_entrega: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cond. Pagamento</Label>
                <Select value={form.condicao_pagamento_id} onValueChange={(v) => setForm({ ...form, condicao_pagamento_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>{paymentConditions.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.descricao}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Forma Pagamento</Label>
                <Select value={form.forma_pagamento_id} onValueChange={(v) => setForm({ ...form, forma_pagamento_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>{paymentMethods.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Valor Frete (Global)</Label>
                <Input className="h-8 text-xs" type="number" step="0.01" value={form.valor_frete} onChange={(e) => handleFreightChange(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Itens ({orderItems.length})</Label>
                <Button type="button" variant="outline" size="sm" className="h-6 text-2xs" onClick={() => setItemPickerOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />Adicionar Itens
                </Button>
              </div>
              {orderItems.length > 0 && (
                <div className="border rounded-md overflow-hidden overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-1.5">Item</th>
                        <th className="text-center p-1.5 w-12">UN</th>
                        <th className="text-left p-1.5 w-36">Nat. Financeira</th>
                        <th className="text-left p-1.5 w-36">Centro Custo</th>
                        <th className="text-right p-1.5 w-20">Qtd</th>
                        <th className="text-right p-1.5 w-20">Vlr Unit</th>
                        <th className="text-right p-1.5 w-20">Impostos</th>
                        <th className="text-right p-1.5 w-20">Frete</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((oi, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-1.5 text-xs truncate max-w-[120px]">{getItemLabel(oi.item_id)}</td>
                          <td className="p-1.5 text-center text-xs text-muted-foreground">{getItemUnit(oi.item_id)}</td>
                          <td className="p-1">
                            <Select value={oi.natureza_financeira_id} onValueChange={(v) => { const u = [...orderItems]; u[idx].natureza_financeira_id = v; setOrderItems(u); }}>
                              <SelectTrigger className="h-7 text-2xs"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.id} className="text-2xs">{n.codigo} - {n.descricao}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="p-1">
                            <Select value={oi.centro_custo_id} onValueChange={(v) => { const u = [...orderItems]; u[idx].centro_custo_id = v; setOrderItems(u); }}>
                              <SelectTrigger className="h-7 text-2xs"><SelectValue placeholder="—" /></SelectTrigger>
                              <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id} className="text-2xs">{c.codigo} - {c.descricao}</SelectItem>)}</SelectContent>
                            </Select>
                          </td>
                          <td className="p-1">
                            <Input type="number" step="0.01" className="h-7 text-xs text-right" value={oi.quantidade}
                              onChange={(e) => {
                                const u = [...orderItems]; u[idx].quantidade = e.target.value;
                                setOrderItems(form.frete_tipo === "GLOBAL" ? distributeFreight(u, parseFloat(form.valor_frete) || 0) : u);
                              }} />
                          </td>
                          <td className="p-1">
                            <Input type="number" step="0.01" className="h-7 text-xs text-right" value={oi.valor_unitario}
                              onChange={(e) => {
                                const u = [...orderItems]; u[idx].valor_unitario = e.target.value;
                                setOrderItems(form.frete_tipo === "GLOBAL" ? distributeFreight(u, parseFloat(form.valor_frete) || 0) : u);
                              }} />
                          </td>
                          <td className="p-1">
                            <Input type="number" step="0.01" className="h-7 text-xs text-right" value={oi.impostos}
                              onChange={(e) => { const u = [...orderItems]; u[idx].impostos = e.target.value; setOrderItems(u); }} />
                          </td>
                          <td className="p-1.5 text-right text-xs text-muted-foreground">
                            R$ {parseFloat(oi.frete_total_item || "0").toFixed(2)}
                          </td>
                          <td className="p-1">
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0"
                              onClick={() => {
                                const u = orderItems.filter((_, i) => i !== idx);
                                setOrderItems(form.frete_tipo === "GLOBAL" ? distributeFreight(u, parseFloat(form.valor_frete) || 0) : u);
                              }}>
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs font-medium">
                Total: R$ {orderItems.reduce((s, i) => s + parseFloat(i.quantidade || "0") * parseFloat(i.valor_unitario || "0") + parseFloat(i.impostos || "0"), 0).toFixed(2)}
                {parseFloat(form.valor_frete) > 0 && ` + Frete R$ ${parseFloat(form.valor_frete).toFixed(2)}`}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={saveMutation.isPending || !form.fornecedor_id || orderItems.length === 0}>
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ItemPickerDialog open={itemPickerOpen} onOpenChange={setItemPickerOpen} onConfirm={handleAddSelectedItems} excludeIds={orderItems.map((oi) => oi.item_id)} />

      {/* View Detail Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={(v) => { if (!v) { setViewDoc(null); setViewItems([]); } }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle className="text-sm">Pedido de Compra - PC-{viewDoc?.numero_sequencial}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">Fornecedor:</span> {viewDoc?.suppliers?.razao_social || "—"}</div>
              <div><span className="text-muted-foreground">Status:</span> <Badge className={`text-2xs ${statusColors[viewDoc?.status || ""]}`}>{viewDoc?.status}</Badge></div>
              <div><span className="text-muted-foreground">Entrega:</span> {viewDoc?.data_entrega ? format(new Date(viewDoc.data_entrega), "dd/MM/yyyy") : "—"}</div>
              <div><span className="text-muted-foreground">Frete:</span> R$ {Number(viewDoc?.valor_frete || 0).toFixed(2)}</div>
            </div>
            {viewItems.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-1.5">Item</th>
                      <th className="text-right p-1.5">Qtd</th>
                      <th className="text-right p-1.5">Vlr Unit</th>
                      <th className="text-right p-1.5">Impostos</th>
                      <th className="text-right p-1.5">Frete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewItems.map((oi, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1.5">{getItemLabel(oi.item_id)}</td>
                        <td className="p-1.5 text-right">{oi.quantidade}</td>
                        <td className="p-1.5 text-right">R$ {parseFloat(oi.valor_unitario).toFixed(2)}</td>
                        <td className="p-1.5 text-right">R$ {parseFloat(oi.impostos).toFixed(2)}</td>
                        <td className="p-1.5 text-right">R$ {parseFloat(oi.frete_total_item).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelDialogId} onOpenChange={(v) => { if (!v) setCancelDialogId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Pedido de Compra</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => cancelDialogId && cancelMutation.mutate(cancelDialogId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
