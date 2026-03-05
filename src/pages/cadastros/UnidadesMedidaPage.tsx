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
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Unidade {
  id: string;
  codigo: string;
  descricao: string;
  ativo: boolean;
  created_at: string;
}

export default function UnidadesMedidaPage() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const emptyForm = { codigo: "", descricao: "", ativo: true };
  const [form, setForm] = useState(emptyForm);

  const { data: unidades = [], isLoading } = useQuery({
    queryKey: ["unidades_medida", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades_medida")
        .select("id, codigo, descricao, ativo, created_at")
        .is("deleted_at", null)
        .order("codigo");
      if (error) throw error;
      return data as Unidade[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Tenant não encontrado");
      if (!form.codigo.trim()) throw new Error("Código é obrigatório");

      const codigo = form.codigo.toUpperCase().trim();
      const descricao = form.descricao.trim() || codigo;

      if (editingId) {
        const { error } = await supabase
          .from("unidades_medida")
          .update({ codigo, descricao, ativo: form.ativo })
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("unidades_medida")
          .insert({ tenant_id: tenant.id, codigo, descricao, ativo: form.ativo });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades_medida"] });
      closeDialog();
      toast.success(editingId ? "Unidade atualizada" : "Unidade cadastrada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      // If trying to inactivate, check if linked to items
      if (!ativo) {
        const unidade = unidades.find(u => u.id === id);
        if (unidade) {
          const { count, error } = await supabase
            .from("items")
            .select("id", { count: "exact", head: true })
            .eq("unidade_medida", unidade.codigo);
          if (error) throw error;
          if (count && count > 0) {
            throw new Error(`Não é possível inativar: ${count} item(ns) vinculado(s) a esta unidade`);
          }
        }
      }
      const { error } = await supabase
        .from("unidades_medida")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unidades_medida"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openEdit(u: Unidade) {
    setEditingId(u.id);
    setForm({ codigo: u.codigo, descricao: u.descricao, ativo: u.ativo });
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  const columns = [
    { key: "codigo", label: "Código" },
    { key: "descricao", label: "Descrição" },
    {
      key: "ativo", label: "Status", render: (r: Unidade) => (
        <Badge variant={r.ativo ? "default" : "secondary"} className="text-2xs">
          {r.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "acoes", label: "", render: (r: Unidade) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-2xs" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-2xs"
            onClick={(e) => { e.stopPropagation(); toggleAtivoMutation.mutate({ id: r.id, ativo: !r.ativo }); }}
          >
            {r.ativo ? "Inativar" : "Ativar"}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Unidades de Medida</h1>
        <p className="text-xs text-muted-foreground">Cadastro de unidades utilizadas nos itens</p>
      </div>

      <DataTable
        columns={columns}
        data={unidades}
        loading={isLoading}
        searchPlaceholder="Buscar unidade..."
        addLabel="Nova Unidade"
        onAdd={() => { setEditingId(null); setForm(emptyForm); setOpen(true); }}
        filterFn={(r, s) => r.codigo.toLowerCase().includes(s) || r.descricao.toLowerCase().includes(s)}
      />

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingId ? "Editar Unidade" : "Nova Unidade"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Código *</Label>
              <Input
                className="h-8 text-xs uppercase"
                value={form.codigo}
                onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                placeholder="Ex: KG, CX, M"
                maxLength={10}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input
                className="h-8 text-xs"
                value={form.descricao}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                placeholder="Ex: Quilograma"
              />
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
