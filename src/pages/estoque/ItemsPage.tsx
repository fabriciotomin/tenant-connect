import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Plus } from "lucide-react";

const tipoItemLabels: Record<string, string> = {
  REVENDA: "Revenda",
  MATERIA_PRIMA: "Matéria Prima",
  SERVICO: "Serviço",
};

interface Item {
  id: string;
  codigo: string;
  descricao: string;
  tipo_item: string;
  saldo_estoque: number;
  custo_medio: number;
  preco_venda: number;
  ativo: boolean;
  unidade_medida: string;
  category_id: string | null;
}

export default function ItemsPage() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newUnidade, setNewUnidade] = useState("");
  const [showNewUnidade, setShowNewUnidade] = useState(false);

  const emptyForm = {
    codigo: "", descricao: "", tipo_item: "REVENDA", unidade_medida: "UN",
    preco_venda: "0", ativo: true, category_id: "",
  };
  const [form, setForm] = useState(emptyForm);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id, codigo, descricao, tipo_item, saldo_estoque, custo_medio, unidade_medida, preco_venda, ativo, category_id")
        .order("codigo");
      if (error) throw error;
      return data as Item[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["item_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_categories")
        .select("id, nome")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ["unidades_medida", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades_medida")
        .select("id, codigo, descricao")
        .eq("ativo", true)
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const addUnidadeMutation = useMutation({
    mutationFn: async (codigo: string) => {
      if (!tenant?.id) throw new Error("Tenant não encontrado");
      const { data, error } = await supabase
        .from("unidades_medida")
        .insert({ tenant_id: tenant.id, codigo: codigo.toUpperCase().trim(), descricao: codigo.toUpperCase().trim() })
        .select("id, codigo, descricao")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["unidades_medida"] });
      setForm({ ...form, unidade_medida: data.codigo });
      setNewUnidade("");
      setShowNewUnidade(false);
      toast.success("Unidade criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.codigo.trim()) throw new Error("Código é obrigatório");
      if (!form.descricao.trim()) throw new Error("Descrição é obrigatória");

      const payload: any = {
        descricao: form.descricao,
        tipo_item: form.tipo_item as any,
        unidade_medida: form.unidade_medida || "UN",
        preco_venda: parseFloat(form.preco_venda) || 0,
        ativo: form.ativo,
        category_id: form.category_id || null,
      };
      if (editingId) {
        const { error } = await supabase.from("items").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        payload.codigo = form.codigo;
        const { error } = await supabase.from("items").insert({ ...payload, tenant_id: tenant!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["items"] });
      closeDialog();
      toast.success(editingId ? "Item atualizado" : "Item cadastrado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function handleDuplicate(item: Item) {
    setEditingId(null);
    setForm({
      codigo: item.codigo + "-COPIA",
      descricao: item.descricao,
      tipo_item: item.tipo_item,
      unidade_medida: item.unidade_medida || "UN",
      preco_venda: String(item.preco_venda || 0),
      ativo: true,
      category_id: item.category_id || "",
    });
    setOpen(true);
  }

  function openEdit(item: Item) {
    setEditingId(item.id);
    setForm({
      codigo: item.codigo,
      descricao: item.descricao,
      tipo_item: item.tipo_item,
      unidade_medida: item.unidade_medida || "UN",
      preco_venda: String(item.preco_venda || 0),
      ativo: item.ativo,
      category_id: item.category_id || "",
    });
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setShowNewUnidade(false);
    setNewUnidade("");
  }

  const columns = [
    { key: "codigo", label: "Código" },
    { key: "descricao", label: "Descrição" },
    { key: "unidade_medida", label: "UN", render: (r: Item) => r.unidade_medida || "UN" },
    { key: "tipo_item", label: "Tipo", render: (r: Item) => <Badge variant="outline" className="text-2xs">{tipoItemLabels[r.tipo_item] || r.tipo_item}</Badge> },
    { key: "preco_venda", label: "Preço Venda", render: (r: Item) => `R$ ${Number(r.preco_venda).toFixed(2)}` },
    { key: "saldo_estoque", label: "Saldo", render: (r: Item) => r.tipo_item === "SERVICO" ? "—" : <span className={r.saldo_estoque <= 0 ? "text-destructive" : ""}>{Number(r.saldo_estoque).toFixed(2)}</span> },
    { key: "custo", label: "Custo Médio", render: (r: Item) => `R$ ${Number(r.custo_medio).toFixed(2)}` },
    { key: "ativo", label: "Status", render: (r: Item) => <Badge variant={r.ativo ? "default" : "secondary"} className="text-2xs">{r.ativo ? "Ativo" : "Inativo"}</Badge> },
    { key: "acoes", label: "", render: (r: Item) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="h-6 text-2xs" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Editar</Button>
        <Button variant="ghost" size="sm" className="h-6 text-2xs px-2" onClick={(e) => { e.stopPropagation(); handleDuplicate(r); }}>
          <Copy className="h-3 w-3 mr-1" />Duplicar
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Itens</h1>
        <p className="text-xs text-muted-foreground">Cadastro de produtos e serviços</p>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        searchPlaceholder="Buscar item..."
        addLabel="Novo Item"
        onAdd={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}
        filterFn={(r, s) => r.codigo.toLowerCase().includes(s) || r.descricao.toLowerCase().includes(s)}
      />

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingId ? "Editar Item" : "Novo Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Código *</Label>
                <Input className="h-8 text-xs" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required disabled={!!editingId} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo *</Label>
                <Select value={form.tipo_item} onValueChange={(v) => setForm({ ...form, tipo_item: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(tipoItemLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-3 space-y-1.5">
                <Label className="text-xs">Descrição *</Label>
                <Input className="h-8 text-xs" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Unidade</Label>
                {showNewUnidade ? (
                  <div className="flex gap-1">
                    <Input className="h-8 text-xs" value={newUnidade} onChange={(e) => setNewUnidade(e.target.value.toUpperCase())} placeholder="Ex: KG" maxLength={10} />
                    <Button type="button" size="sm" className="h-8 px-2" onClick={() => { if (newUnidade.trim()) addUnidadeMutation.mutate(newUnidade); }}>OK</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={() => setShowNewUnidade(false)}>✕</Button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <Select value={form.unidade_medida} onValueChange={(v) => setForm({ ...form, unidade_medida: v })}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="UN" /></SelectTrigger>
                      <SelectContent>
                        {unidades.length === 0 && <SelectItem value="UN" className="text-xs">UN</SelectItem>}
                        {unidades.map(u => <SelectItem key={u.id} value={u.codigo} className="text-xs">{u.codigo}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="outline" size="sm" className="h-8 px-2" onClick={() => setShowNewUnidade(true)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhuma" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Preço de Venda (R$)</Label>
                <Input className="h-8 text-xs" type="number" step="0.01" min="0" value={form.preco_venda} onChange={(e) => setForm({ ...form, preco_venda: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm({ ...form, ativo: v })} />
              <Label className="text-xs">Ativo</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
