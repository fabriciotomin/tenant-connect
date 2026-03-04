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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, FileOutput, Pencil, Copy, Eye, XCircle } from "lucide-react";
import { useFinancialClassification } from "@/hooks/useFinancialClassification";

const statusColors: Record<string, string> = {
  RASCUNHO: "bg-yellow-100 text-yellow-800",
  CONFIRMADO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

interface SalesOrder {
  id: string;
  numero_sequencial: number;
  valor_total: number;
  status: string;
  created_at: string;
  customer_id: string;
  customers?: { razao_social: string } | null;
}

interface SOItem {
  item_id: string;
  quantidade: string;
  valor_unitario: string;
}

export default function SalesOrdersPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_id: "" });
  const [orderItems, setOrderItems] = useState<SOItem[]>([]);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [viewDoc, setViewDoc] = useState<SalesOrder | null>(null);
  const [viewItems, setViewItems] = useState<SOItem[]>([]);
  const [cancelDialogId, setCancelDialogId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["sales_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales_orders")
        .select("*, customers(razao_social)")
        .order("numero_sequencial", { ascending: false });
      if (error) throw error;
      return data as SalesOrder[];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers_select_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, razao_social").eq("ativo", true).order("razao_social");
      if (error) throw error;
      return data;
    },
  });

  const { data: items = [] } = useQuery({
    queryKey: ["items_select_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id, codigo, descricao, unidade_medida, preco_venda").eq("ativo", true).order("codigo");
      if (error) throw error;
      return data;
    },
  });

  function handleAddSelectedItems(pickedItems: PickedItem[]) {
    const newItems: SOItem[] = pickedItems
      .filter((p) => !orderItems.some((oi) => oi.item_id === p.item_id))
      .map((p) => ({
        item_id: p.item_id,
        quantidade: String(p.quantidade),
        valor_unitario: String(p.valor_unitario),
      }));
    setOrderItems([...orderItems, ...newItems]);
  }

  async function handleEdit(order: SalesOrder) {
    // Use sale_items table
    const { data: soItems, error } = await supabase
      .from("sale_items")
      .select("item_id, quantidade, preco_unitario")
      .eq("sale_id", order.id);
    if (error) { toast.error(error.message); return; }

    setEditingId(order.id);
    setForm({ customer_id: order.customer_id || "" });
    setOrderItems((soItems || []).map(i => ({
      item_id: i.item_id || "",
      quantidade: String(i.quantidade),
      valor_unitario: String(i.preco_unitario),
    })));
    setOpen(true);
  }

  function handleClose() {
    setOpen(false);
    setEditingId(null);
    setForm({ customer_id: "" });
    setOrderItems([]);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Sem tenant");
      if (!form.customer_id) throw new Error("Cliente obrigatório");
      if (orderItems.length === 0) throw new Error("Adicione ao menos um item");
      const valorTotal = orderItems.reduce((s, i) => s + parseFloat(i.quantidade || "0") * parseFloat(i.valor_unitario || "0"), 0);

      if (editingId) {
        // Check status directly
        const { data: existing } = await supabase.from("sales_orders").select("status").eq("id", editingId).single();
        if (existing?.status !== "RASCUNHO") throw new Error("Apenas pedidos em RASCUNHO podem ser editados");

        const { error } = await supabase.from("sales_orders").update({
          customer_id: form.customer_id,
          valor_total: valorTotal,
        }).eq("id", editingId);
        if (error) throw error;

        const { error: de } = await supabase.from("sale_items").delete().eq("sale_id", editingId);
        if (de) throw de;

        const { error: ie } = await supabase.from("sale_items").insert(
          orderItems.map(i => ({
            sale_id: editingId,
            tenant_id: tenant.id,
            item_id: i.item_id,
            quantidade: parseFloat(i.quantidade),
            preco_unitario: parseFloat(i.valor_unitario),
            total_item: parseFloat(i.quantidade) * parseFloat(i.valor_unitario),
          }))
        );
        if (ie) throw ie;
      } else {
        const { data: so, error } = await supabase.from("sales_orders").insert({
          tenant_id: tenant.id,
          customer_id: form.customer_id,
          valor_total: valorTotal,
        } as any).select("id").single();
        if (error) throw error;

        const { error: ie } = await supabase.from("sale_items").insert(
          orderItems.map(i => ({
            sale_id: so.id,
            tenant_id: tenant.id,
            item_id: i.item_id,
            quantidade: parseFloat(i.quantidade),
            preco_unitario: parseFloat(i.valor_unitario),
            total_item: parseFloat(i.quantidade) * parseFloat(i.valor_unitario),
          }))
        );
        if (ie) throw ie;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_orders"] });
      handleClose();
      toast.success(editingId ? "Pedido atualizado" : "Pedido de venda criado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const generateOutbound = useMutation({
    mutationFn: async (orderId: string) => {
      if (!tenant?.id) throw new Error("Sem tenant");
      const { data: so, error: oe } = await supabase
        .from("sales_orders")
        .select("*, sale_items(*)")
        .eq("id", orderId)
        .single();
      if (oe) throw oe;

      const { data: doc, error: de } = await supabase.from("outbound_documents").insert({
        tenant_id: tenant.id,
        cliente_id: so.customer_id,
        pedido_venda_id: orderId,
        valor_total: so.valor_total,
      } as any).select("id").single();
      if (de) throw de;

      const saleItems = (so as any).sale_items as any[] || [];
      if (saleItems.length > 0) {
        await supabase.from("outbound_document_items").insert(
          saleItems.map((i: any) => ({
            outbound_document_id: doc.id,
            item_id: i.item_id,
            quantidade: i.quantidade,
            valor_unitario: i.preco_unitario,
          }))
        );
      }

      await supabase.from("sales_orders").update({ status: "CONFIRMADO" as any }).eq("id", orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_orders"] });
      queryClient.invalidateQueries({ queryKey: ["outbound_documents"] });
      toast.success("Documento de saída gerado a partir do pedido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getItemLabel = (id: string) => {
    const item = items.find((i) => i.id === id);
    return item ? `${item.codigo} - ${item.descricao}` : id.slice(0, 8);
  };
  const getItemUnit = (id: string) => {
    const item = items.find((i) => i.id === id);
    return item?.unidade_medida || "UN";
  };

  const duplicateMutation = useMutation({
    mutationFn: async (orderId: string) => {
      if (!tenant?.id) throw new Error("Sem tenant");
      const { data: so, error: oe } = await supabase
        .from("sales_orders")
        .select("*, sale_items(*)")
        .eq("id", orderId)
        .single();
      if (oe) throw oe;
      if (so.status === "CANCELADO") throw new Error("Não é possível duplicar pedido cancelado");

      const { data: nso, error } = await supabase.from("sales_orders").insert({
        tenant_id: tenant.id,
        customer_id: so.customer_id,
        valor_total: so.valor_total,
      } as any).select("id").single();
      if (error) throw error;

      const saleItems = (so as any).sale_items as any[] || [];
      if (saleItems.length > 0) {
        const { error: ie } = await supabase.from("sale_items").insert(
          saleItems.map((i: any) => ({
            sale_id: nso.id,
            tenant_id: tenant.id,
            item_id: i.item_id,
            quantidade: i.quantidade,
            preco_unitario: i.preco_unitario,
            total_item: i.total_item,
          }))
        );
        if (ie) throw ie;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_orders"] });
      toast.success("Pedido de venda duplicado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sales_orders")
        .update({ status: "CANCELADO" as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_orders"] });
      setCancelDialogId(null);
      toast.success("Pedido de venda cancelado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function handleView(order: SalesOrder) {
    const { data: soItems } = await supabase
      .from("sale_items")
      .select("item_id, quantidade, preco_unitario")
      .eq("sale_id", order.id);
    setViewDoc(order);
    setViewItems((soItems || []).map(i => ({
      item_id: i.item_id || "",
      quantidade: String(i.quantidade),
      valor_unitario: String(i.preco_unitario),
    })));
  }

  const columns = [
    { key: "numero", label: "Nº", render: (r: SalesOrder) => `PV-${r.numero_sequencial}` },
    { key: "cliente", label: "Cliente", render: (r: SalesOrder) => r.customers?.razao_social || "—" },
    { key: "status", label: "Status", render: (r: SalesOrder) => <Badge className={`text-2xs ${statusColors[r.status]}`}>{r.status}</Badge> },
    { key: "valor_total", label: "Valor", render: (r: SalesOrder) => `R$ ${Number(r.valor_total).toFixed(2)}` },
    { key: "created_at", label: "Criado", render: (r: SalesOrder) => format(new Date(r.created_at), "dd/MM/yyyy") },
    {
      key: "acoes", label: "Ações", render: (r: SalesOrder) => {
        const isDraft = r.status === "RASCUNHO";
        const canDuplicate = r.status !== "CANCELADO";
        const canCancel = r.status !== "CANCELADO";
        return (
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Ver" onClick={(e) => { e.stopPropagation(); handleView(r); }}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" disabled={!isDraft} onClick={(e) => { e.stopPropagation(); handleEdit(r); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Gerar NF-e" disabled={!isDraft} onClick={(e) => { e.stopPropagation(); generateOutbound.mutate(r.id); }}>
              <FileOutput className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" disabled={!canDuplicate} onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate(r.id); }}>
              <Copy className="h-3.5 w-3.5" />
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
        <h1 className="text-lg font-semibold">Pedidos de Venda</h1>
        <p className="text-xs text-muted-foreground">Confirmar pedido gera documento de saída</p>
      </div>

      <DataTable columns={columns} data={orders} loading={isLoading} searchPlaceholder="Buscar pedido..." addLabel="Novo Pedido" onAdd={() => { setEditingId(null); setOpen(true); }}
        filterFn={(r, s) => (r.customers?.razao_social || "").toLowerCase().includes(s)} />

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
         <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle className="text-sm">{editingId ? "Editar Pedido de Venda" : "Novo Pedido de Venda"}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3 overflow-y-auto flex-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente *</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.razao_social}</SelectItem>)}</SelectContent>
                </Select>
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
                        <th className="text-right p-1.5 w-20">Qtd</th>
                        <th className="text-right p-1.5 w-24">Vlr Unit</th>
                        <th className="text-right p-1.5 w-24">Subtotal</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderItems.map((oi, idx) => (
                        <tr key={idx} className="border-t">
                           <td className="p-1.5 text-xs truncate max-w-[140px]">{getItemLabel(oi.item_id)}</td>
                           <td className="p-1.5 text-center text-xs text-muted-foreground">{getItemUnit(oi.item_id)}</td>
                          <td className="p-1">
                            <Input type="number" step="0.01" className="h-7 text-xs text-right" value={oi.quantidade}
                              onChange={(e) => { const u = [...orderItems]; u[idx].quantidade = e.target.value; setOrderItems(u); }} />
                          </td>
                          <td className="p-1">
                            <Input type="number" step="0.01" className="h-7 text-xs text-right" value={oi.valor_unitario}
                              onChange={(e) => { const u = [...orderItems]; u[idx].valor_unitario = e.target.value; setOrderItems(u); }} />
                          </td>
                          <td className="p-1.5 text-right">
                            R$ {(parseFloat(oi.quantidade || "0") * parseFloat(oi.valor_unitario || "0")).toFixed(2)}
                          </td>
                          <td className="p-1">
                            <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setOrderItems(orderItems.filter((_, i) => i !== idx))}>
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
                Total: R$ {orderItems.reduce((s, i) => s + parseFloat(i.quantidade || "0") * parseFloat(i.valor_unitario || "0"), 0).toFixed(2)}
              </span>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
                <Button type="submit" size="sm" disabled={saveMutation.isPending || !form.customer_id || orderItems.length === 0}>
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ItemPickerDialog
        open={itemPickerOpen}
        onOpenChange={setItemPickerOpen}
        onConfirm={handleAddSelectedItems}
        excludeIds={orderItems.map((oi) => oi.item_id)}
      />

      {/* View Detail Dialog */}
      <Dialog open={!!viewDoc} onOpenChange={(v) => { if (!v) { setViewDoc(null); setViewItems([]); } }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle className="text-sm">Pedido de Venda - PV-{viewDoc?.numero_sequencial}</DialogTitle></DialogHeader>
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div><span className="text-muted-foreground">Cliente:</span> {viewDoc?.customers?.razao_social || "—"}</div>
              <div><span className="text-muted-foreground">Status:</span> <Badge className={`text-2xs ${statusColors[viewDoc?.status || ""]}`}>{viewDoc?.status}</Badge></div>
              <div><span className="text-muted-foreground">Valor Total:</span> R$ {Number(viewDoc?.valor_total || 0).toFixed(2)}</div>
            </div>
            {viewItems.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-1.5">Item</th>
                      <th className="text-right p-1.5">Qtd</th>
                      <th className="text-right p-1.5">Vlr Unit</th>
                      <th className="text-right p-1.5">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewItems.map((oi, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-1.5">{getItemLabel(oi.item_id)}</td>
                        <td className="p-1.5 text-right">{oi.quantidade}</td>
                        <td className="p-1.5 text-right">R$ {parseFloat(oi.valor_unitario).toFixed(2)}</td>
                        <td className="p-1.5 text-right">R$ {(parseFloat(oi.quantidade) * parseFloat(oi.valor_unitario)).toFixed(2)}</td>
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
            <AlertDialogTitle>Cancelar Pedido de Venda</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
