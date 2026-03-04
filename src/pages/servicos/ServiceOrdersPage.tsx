import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import { useFinancialClassification } from "@/hooks/useFinancialClassification";
import { DataTable } from "@/components/DataTable";
import { ItemPickerDialog, PickedItem } from "@/components/ItemPickerDialog";
import { ServiceOrderDetailsDialog } from "@/components/servicos/ServiceOrderDetailsDialog";
import { ServiceOrderEditDialog } from "@/components/servicos/ServiceOrderEditDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, FileOutput, Copy, Eye, Pencil } from "lucide-react";
const statusColors: Record<string, string> = {
  RASCUNHO: "bg-yellow-100 text-yellow-800",
  CONFIRMADO: "bg-blue-100 text-blue-800",
  FATURADO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

interface ServiceOrder {
  id: string;
  valor_total: number;
  status: string;
  data_inicio_prevista: string | null;
  data_fim_prevista: string | null;
  created_at: string;
  customers?: { razao_social: string } | null;
  has_outbound_doc?: boolean;
}

export default function ServiceOrdersPage() {
  const { tenant } = useTenant();
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { natures, costCenters } = useFinancialClassification();
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [gerarDocId, setGerarDocId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_id: "", condicao_pagamento_id: "", data_inicio: "", hora_inicio: "", data_fim: "", hora_fim: "" });
  const [newItems, setNewItems] = useState<{ item_id: string; quantidade: string; valor_unitario: string; natureza_financeira_id: string; centro_custo_id: string }[]>([]);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["service_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_orders")
        .select("*, customers(razao_social)")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Check which orders have linked outbound documents
      const ids = data.map((d: any) => d.id);
      const { data: docs } = await supabase
        .from("outbound_documents")
        .select("service_order_id")
        .in("service_order_id", ids);

      const docSet = new Set((docs || []).map((d: any) => d.service_order_id));
      return data.map((d: any) => ({ ...d, has_outbound_doc: docSet.has(d.id) })) as ServiceOrder[];
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

  const { data: items = [] } = useQuery({
    queryKey: ["items_select_active"],
    queryFn: async () => {
      const { data, error } = await supabase.from("items").select("id, codigo, descricao, unidade_medida, tipo_item, preco_venda, natureza_financeira_id, centro_custo_id, natureza_venda_id, centro_custo_venda_id").eq("ativo", true).order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const handlePickerConfirm = (pickedItems: PickedItem[]) => {
    const added = pickedItems.map((p) => {
      const item = items.find(i => i.id === p.item_id);
      return {
        item_id: p.item_id,
        quantidade: String(p.quantidade),
        valor_unitario: String(p.valor_unitario),
        natureza_financeira_id: (item as any)?.natureza_venda_id || "",
        centro_custo_id: (item as any)?.centro_custo_venda_id || "",
      };
    });
    setNewItems((prev) => [...prev, ...added]);
    setPickerOpen(false);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.tenant_id) throw new Error("Sem tenant");
      if (!form.customer_id) throw new Error("Cliente obrigatório");
      const valorTotal = newItems.reduce((s, i) => s + parseFloat(i.quantidade || "0") * parseFloat(i.valor_unitario || "0"), 0);

      const { data: os, error } = await supabase.from("service_orders").insert({
        tenant_id: tenant!.id,
        customer_id: form.customer_id,
        condicao_pagamento_id: form.condicao_pagamento_id || null,
        data_inicio_prevista: form.data_inicio || null,
        data_fim_prevista: form.data_fim || null,
        data_inicio: form.data_inicio || null,
        hora_inicio: form.hora_inicio || null,
        data_fim: form.data_fim || null,
        hora_fim: form.hora_fim || null,
        valor_total: valorTotal,
        created_by: user?.id,
      } as any).select("id").single();
      if (error) throw error;

      if (newItems.length > 0) {
        const { error: ie } = await supabase.from("service_order_items").insert(
          newItems.map(i => ({
            service_order_id: os.id,
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
      setOpen(false);
      setForm({ customer_id: "", condicao_pagamento_id: "", data_inicio: "", hora_inicio: "", data_fim: "", hora_fim: "" });
      setNewItems([]);
      toast.success("Ordem de serviço criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const confirmMutation = useMutation({
    mutationFn: async (osId: string) => {
      const { error } = await supabase.rpc("confirmar_ordem_servico", { p_os_id: osId, p_user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
      setConfirmId(null);
      toast.success("OS confirmada com sucesso.");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const gerarDocMutation = useMutation({
    mutationFn: async (osId: string) => {
      const { error } = await supabase.rpc("gerar_documento_saida_os", { p_os_id: osId, p_user_id: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
      queryClient.invalidateQueries({ queryKey: ["outbound_documents"] });
      setGerarDocId(null);
      toast.success("Documento de saída gerado com sucesso!");
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (osId: string) => {
      if (!tenant?.id) throw new Error("Sem tenant");
      const { data: os, error: oe } = await supabase
        .from("service_orders")
        .select("*, service_order_items(*)")
        .eq("id", osId)
        .single();
      if (oe) throw oe;
      if (os.status === "CANCELADO") throw new Error("Não é possível duplicar OS cancelada");

      const { data: nos, error } = await supabase.from("service_orders").insert({
        tenant_id: tenant.id,
        customer_id: os.customer_id,
        condicao_pagamento_id: os.condicao_pagamento_id,
        data_inicio_prevista: os.data_inicio_prevista,
        data_fim_prevista: os.data_fim_prevista,
        valor_total: os.valor_total,
        created_by: user?.id,
      }).select("id").single();
      if (error) throw error;

      if (os.service_order_items?.length > 0) {
        const { error: ie } = await supabase.from("service_order_items").insert(
          os.service_order_items.map((i: any) => ({
            service_order_id: nos.id,
            item_id: i.item_id,
            quantidade: i.quantidade,
            valor_unitario: i.valor_unitario,
            natureza_financeira_id: i.natureza_financeira_id || null,
            centro_custo_id: i.centro_custo_id || null,
          }))
        );
        if (ie) throw ie;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service_orders"] });
      toast.success("Ordem de serviço duplicada com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canEdit = (r: ServiceOrder) => r.status === "RASCUNHO" && !r.has_outbound_doc;

  const columns = [
    { key: "id", label: "ID", render: (r: ServiceOrder) => r.id.slice(0, 8) + "..." },
    { key: "cliente", label: "Cliente", render: (r: ServiceOrder) => r.customers?.razao_social || "—" },
    { key: "status", label: "Status", render: (r: ServiceOrder) => <Badge className={`text-2xs ${statusColors[r.status] || ""}`}>{r.status}</Badge> },
    { key: "valor_total", label: "Valor", render: (r: ServiceOrder) => `R$ ${Number(r.valor_total).toFixed(2)}` },
    { key: "inicio", label: "Início", render: (r: ServiceOrder) => r.data_inicio_prevista ? format(new Date(r.data_inicio_prevista), "dd/MM/yyyy") : "—" },
    { key: "fim", label: "Fim", render: (r: ServiceOrder) => r.data_fim_prevista ? format(new Date(r.data_fim_prevista), "dd/MM/yyyy") : "—" },
    {
      key: "acoes", label: "Ações", render: (r: ServiceOrder) => {
        const isEditable = canEdit(r);
        const isDraft = r.status === "RASCUNHO";
        const isConfirmed = r.status === "CONFIRMADO";
        const canDuplicate = r.status !== "CANCELADO";
        return (
          <div className="flex gap-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Detalhes" onClick={(e) => { e.stopPropagation(); setDetailsId(r.id); }}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" disabled={!isEditable} onClick={(e) => { e.stopPropagation(); setEditId(r.id); }}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600" title="Confirmar" disabled={!isDraft} onClick={(e) => { e.stopPropagation(); setConfirmId(r.id); }}>
              <CheckCircle className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-green-600" title="Gerar Doc. Saída" disabled={!isConfirmed} onClick={(e) => { e.stopPropagation(); setGerarDocId(r.id); }}>
              <FileOutput className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicar" disabled={!canDuplicate} onClick={(e) => { e.stopPropagation(); duplicateMutation.mutate(r.id); }}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Ordens de Serviço</h1>
        <p className="text-xs text-muted-foreground">Confirmar OS altera status. O financeiro é gerado pelo Documento de Saída.</p>
      </div>

      <DataTable columns={columns} data={orders} loading={isLoading} searchPlaceholder="Buscar OS..." addLabel="Nova OS" onAdd={() => setOpen(true)}
        filterFn={(r, s) => (r.customers?.razao_social || "").toLowerCase().includes(s)} />

      {/* Dialog Nova OS */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader><DialogTitle className="text-sm">Nova Ordem de Serviço</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Cliente *</Label>
                <Select value={form.customer_id} onValueChange={(v) => setForm({ ...form, customer_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.razao_social}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cond. Pagamento</Label>
                <Select value={form.condicao_pagamento_id} onValueChange={(v) => setForm({ ...form, condicao_pagamento_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>{paymentConditions.map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.descricao}</SelectItem>)}</SelectContent>
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
              {newItems.map((ni, idx) => {
                const item = items.find(i => i.id === ni.item_id);
                return (
                  <div key={idx} className="space-y-1 border rounded-md p-2 bg-muted/10">
                     <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                       <span className="text-xs truncate block border rounded-md px-2 py-1.5 h-8 bg-muted/30">
                          {item ? `${item.codigo} - ${item.descricao}` : ni.item_id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="col-span-1">
                        <span className="text-xs block border rounded-md px-2 py-1.5 h-8 bg-muted/30 text-center text-muted-foreground">
                          {item?.unidade_medida || "UN"}
                        </span>
                      </div>
                      <div className="col-span-3">
                        <Input type="number" step="0.01" className="h-8 text-xs" placeholder="Qtd" value={ni.quantidade} onChange={(e) => { const u = [...newItems]; u[idx].quantidade = e.target.value; setNewItems(u); }} />
                      </div>
                      <div className="col-span-3">
                        <Input type="number" step="0.01" className="h-8 text-xs" placeholder="Vlr Unit" value={ni.valor_unitario} onChange={(e) => { const u = [...newItems]; u[idx].valor_unitario = e.target.value; setNewItems(u); }} />
                      </div>
                      <div className="col-span-1">
                        <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setNewItems(newItems.filter((_, i) => i !== idx))}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={ni.natureza_financeira_id} onValueChange={(v) => { const u = [...newItems]; u[idx].natureza_financeira_id = v; setNewItems(u); }}>
                        <SelectTrigger className="h-7 text-2xs"><SelectValue placeholder="Natureza Financeira" /></SelectTrigger>
                        <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.id} className="text-2xs">{n.codigo} - {n.descricao}</SelectItem>)}</SelectContent>
                      </Select>
                      <Select value={ni.centro_custo_id} onValueChange={(v) => { const u = [...newItems]; u[idx].centro_custo_id = v; setNewItems(u); }}>
                        <SelectTrigger className="h-7 text-2xs"><SelectValue placeholder="Centro de Custo" /></SelectTrigger>
                        <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id} className="text-2xs">{c.codigo} - {c.descricao}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>{createMutation.isPending ? "Salvando..." : "Salvar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ItemPickerDialog for new OS */}
      <ItemPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onConfirm={handlePickerConfirm} excludeIds={newItems.map(i => i.item_id)} />

      {/* Details Dialog */}
      <ServiceOrderDetailsDialog orderId={detailsId} open={!!detailsId} onOpenChange={(o) => { if (!o) setDetailsId(null); }} />

      {/* Edit Dialog */}
      <ServiceOrderEditDialog orderId={editId} open={!!editId} onOpenChange={(o) => { if (!o) setEditId(null); }} />

      {/* Confirm OS Dialog */}
      <AlertDialog open={!!confirmId} onOpenChange={() => setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Confirmar Ordem de Serviço</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Ao confirmar, a OS terá status CONFIRMADO. Para gerar o financeiro, utilize o botão "Gerar Doc. Saída" após a confirmação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmId && confirmMutation.mutate(confirmId)}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Gerar Doc. Saída Dialog */}
      <AlertDialog open={!!gerarDocId} onOpenChange={() => setGerarDocId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Gerar Documento de Saída</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Será criado um Documento de Saída (PENDENTE) com os itens desta OS. Ao confirmar o documento, o financeiro será gerado automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => gerarDocId && gerarDocMutation.mutate(gerarDocId)}>Gerar Documento</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
