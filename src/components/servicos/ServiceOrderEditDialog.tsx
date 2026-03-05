import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ItemPickerDialog, PickedItem } from "@/components/ItemPickerDialog";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

interface ItemRow {
  id?: string;
  item_id: string;
  quantidade: string;
  valor_unitario: string;
  natureza_financeira_id: string;
  centro_custo_id: string;
  _deleted?: boolean;
}

interface Props {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceOrderEditDialog({ orderId, open, onOpenChange }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [pickerOpen, setPickerOpen] = useState(false);
  const [form, setForm] = useState({ customer_id: "", condicao_pagamento_id: "", data_inicio: "", hora_inicio: "", data_fim: "", hora_fim: "" });
  const [editItems, setEditItems] = useState<ItemRow[]>([]);

  const { data: order } = useQuery({
    queryKey: ["service_order_edit", orderId],
    enabled: !!orderId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*")
        .eq("id", orderId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ["service_order_items_edit", orderId],
    enabled: !!orderId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_order_items")
        .select("id, item_id, quantidade, valor_unitario, natureza_financeira_id, centro_custo_id")
        .eq("service_order_id", orderId!);
      if (error) throw error;
      return data;
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

  const { data: paymentConditions = [] } = useQuery({
    queryKey: ["payment_conditions_select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_conditions").select("id, descricao").order("descricao");
      if (error) throw error;
      return data;
    },
  });

  const { data: allItems = [] } = useQuery({
    queryKey: ["items_select_active_with_classification"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id, codigo, descricao, tipo_item, preco_venda, natureza_venda_id, centro_custo_venda_id").eq("ativo", true).order("codigo");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (order && open) {
      setForm({
        customer_id: order.customer_id || "",
        condicao_pagamento_id: order.condicao_pagamento_id || "",
        data_inicio: order.data_inicio || "",
        hora_inicio: order.hora_inicio || "",
        data_fim: order.data_fim || "",
        hora_fim: order.hora_fim || "",
      });
    }
  }, [order, open]);

  useEffect(() => {
    if (orderItems.length > 0 && open) {
      setEditItems(
        orderItems.map((i) => ({
          id: i.id,
          item_id: i.item_id || "",
          quantidade: String(i.quantidade),
          valor_unitario: String(i.valor_unitario),
          natureza_financeira_id: i.natureza_financeira_id || "",
          centro_custo_id: i.centro_custo_id || "",
        }))
      );
    } else if (open) {
      setEditItems([]);
    }
  }, [orderItems, open]);

  const handlePickerConfirm = (pickedItems: PickedItem[]) => {
    const added = pickedItems.map((p) => {
      const itemData = allItems.find(i => i.id === p.item_id);
      return {
        item_id: p.item_id,
        quantidade: String(p.quantidade),
        valor_unitario: String(p.valor_unitario),
        natureza_financeira_id: itemData?.natureza_venda_id || "",
        centro_custo_id: itemData?.centro_custo_venda_id || "",
      };
    });
    setEditItems((prev) => [...prev, ...added]);
    setPickerOpen(false);
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error("Sem OS");
      if (!form.customer_id) throw new Error("Cliente obrigatório");

      const activeItems = editItems.filter((i) => !i._deleted);
      const valorTotal = activeItems.reduce(
        (s, i) => s + parseFloat(i.quantidade || "0") * parseFloat(i.valor_unitario || "0"),
        0
      );

      const { error } = await supabase
        .from("service_orders")
        .update({
          customer_id: form.customer_id,
          condicao_pagamento_id: form.condicao_pagamento_id || null,
          data_inicio: form.data_inicio || null,
          hora_inicio: form.hora_inicio || null,
          data_fim: form.data_fim || null,
          hora_fim: form.hora_fim || null,
          data_inicio_prevista: form.data_inicio || null,
          data_fim_prevista: form.data_fim || null,
          valor_total: valorTotal,
        })
        .eq("id", orderId);
      if (error) throw error;

      const deletedIds = editItems.filter((i) => i._deleted && i.id).map((i) => i.id!);
      if (deletedIds.length > 0) {
        const { error: de } = await supabase.from("service_order_items").delete().in("id", deletedIds);
        if (de) throw de;
      }

      for (const item of activeItems.filter((i) => i.id)) {
        const { error: ue } = await supabase
          .from("service_order_items")
          .update({
            quantidade: parseFloat(item.quantidade),
            valor_unitario: parseFloat(item.valor_unitario),
            natureza_financeira_id: item.natureza_financeira_id || null,
            centro_custo_id: item.centro_custo_id || null,
          })
          .eq("id", item.id!);
        if (ue) throw ue;
      }

      const newItems = activeItems.filter((i) => !i.id);
      if (newItems.length > 0) {
        const { error: ie } = await supabase.from("service_order_items").insert(
          newItems.map((i) => ({
            service_order_id: orderId,
            item_id: i.item_id,
            quantidade: parseFloat(i.quantidade),
            valor_unitario: parseFloat(i.valor_unitario),
            natureza_financeira_id: i.natureza_financeira_id || null,
            centro_custo_id: i.centro_custo_id || null,
          }))
        );
        if (ie) throw ie;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
      queryClient.invalidateQueries({ queryKey: ["service_order_edit", orderId] });
      queryClient.invalidateQueries({ queryKey: ["service_order_items_edit", orderId] });
      onOpenChange(false);
      toast.success("Ordem de Serviço atualizada com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const activeEditItems = editItems.filter((i) => !i._deleted);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Editar Ordem de Serviço</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente *</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{customers.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cond. Pagamento</Label>
                <Select value={form.condicao_pagamento_id} onValueChange={(v) => setForm({ ...form, condicao_pagamento_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>{paymentConditions.map((p) => <SelectItem key={p.id} value={p.id} className="text-xs">{p.descricao}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data Início</Label>
                <Input type="date" className="h-8 text-xs" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora Início</Label>
                <Input type="time" className="h-8 text-xs" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Data Fim</Label>
                <Input type="date" className="h-8 text-xs" value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Hora Fim</Label>
                <Input type="time" className="h-8 text-xs" value={form.hora_fim} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Itens / Serviços</Label>
                <Button type="button" variant="outline" size="sm" className="h-6 text-2xs" onClick={() => setPickerOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" />Adicionar Itens
                </Button>
              </div>
              {activeEditItems.map((ni, idx) => {
                const realIdx = editItems.indexOf(ni);
                const item = allItems.find((i) => i.id === ni.item_id);
                return (
                  <div key={realIdx} className="space-y-1 border rounded-md p-2 bg-muted/10">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <span className="text-xs truncate block border rounded-md px-2 py-1.5 h-8 bg-muted/30">
                          {item ? `${item.codigo} - ${item.descricao}` : ni.item_id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <Input type="number" step="0.01" className="h-8 text-xs" placeholder="Qtd" value={ni.quantidade}
                          onChange={(e) => { const u = [...editItems]; u[realIdx] = { ...u[realIdx], quantidade: e.target.value }; setEditItems(u); }} />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" step="0.01" className="h-8 text-xs" placeholder="Vlr Unit" value={ni.valor_unitario}
                          onChange={(e) => { const u = [...editItems]; u[realIdx] = { ...u[realIdx], valor_unitario: e.target.value }; setEditItems(u); }} />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0"
                          onClick={() => { const u = [...editItems]; u[realIdx] = { ...u[realIdx], _deleted: true }; setEditItems(u); }}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ItemPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onConfirm={handlePickerConfirm}
        excludeIds={activeEditItems.map((i) => i.item_id)}
      />
    </>
  );
}
