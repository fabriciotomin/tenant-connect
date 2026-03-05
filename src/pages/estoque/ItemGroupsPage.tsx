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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";

interface ItemGroup {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  codigo_pai: string | null;
  ativo: boolean;
}

export default function ItemGroupsPage() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ codigo: "", descricao: "", tipo: "ANALITICO", codigo_pai: "", ativo: true });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteBlockedMsg, setDeleteBlockedMsg] = useState<string | null>(null);

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ["item_groups"],
    queryFn: async () => {
      const { data, error } = await supabase.from("item_groups").select("*").order("codigo");
      if (error) throw error;
      return data as ItemGroup[];
    },
  });

  const parentGroups = groups.filter((g) => g.tipo === "SINTETICO");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        descricao: form.descricao,
        tipo: form.tipo as any,
        codigo_pai: form.codigo_pai === "none" ? null : (form.codigo_pai || null),
        ativo: form.ativo,
      };
      if (editingId) {
        const { error } = await supabase.from("item_groups").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        payload.codigo = form.codigo;
        const { error } = await supabase.from("item_groups").insert({ ...payload, tenant_id: tenant!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item_groups"] });
      closeDialog();
      toast.success(editingId ? "Grupo atualizado" : "Grupo criado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Check for child groups
      const { count: childCount } = await supabase
        .from("item_groups")
        .select("id", { count: "exact", head: true })
        .eq("codigo_pai", id);
      if (childCount && childCount > 0) {
        throw new Error(`Este grupo possui ${childCount} subgrupo(s) vinculado(s). Remova-os antes de excluir.`);
      }

      const { error } = await supabase.from("item_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item_groups"] });
      setDeleteId(null);
      toast.success("Grupo excluído com sucesso");
    },
    onError: (e: any) => {
      setDeleteId(null);
      toast.error(e.message);
    },
  });

  async function handleDeleteClick(id: string) {
    // Check for child groups
    const { count: childCount } = await supabase
      .from("item_groups")
      .select("id", { count: "exact", head: true })
      .eq("codigo_pai", id);

    if (childCount && childCount > 0) {
      setDeleteBlockedMsg(`Este grupo possui ${childCount} subgrupo(s) vinculado(s). Remova-os antes de excluir.`);
      return;
    }

    setDeleteId(id);
  }

  function openEdit(g: ItemGroup) {
    setEditingId(g.id);
    setForm({ codigo: g.codigo, descricao: g.descricao, tipo: g.tipo, codigo_pai: g.codigo_pai || "", ativo: g.ativo });
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditingId(null);
    setForm({ codigo: "", descricao: "", tipo: "ANALITICO", codigo_pai: "", ativo: true });
  }

  const columns = [
    { key: "codigo", label: "Código" },
    { key: "descricao", label: "Descrição" },
    { key: "tipo", label: "Tipo", render: (r: ItemGroup) => (
      <Badge variant={r.tipo === "SINTETICO" ? "secondary" : "default"} className="text-2xs">
        {r.tipo === "SINTETICO" ? "Sintético" : "Analítico"}
      </Badge>
    )},
    { key: "ativo", label: "Status", render: (r: ItemGroup) => <Badge variant={r.ativo ? "default" : "secondary"} className="text-2xs">{r.ativo ? "Ativo" : "Inativo"}</Badge> },
    { key: "acoes", label: "", render: (r: ItemGroup) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="sm" className="h-6 text-2xs" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Editar</Button>
        <Button variant="ghost" size="sm" className="h-6 text-2xs text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteClick(r.id); }}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Grupos de Itens</h1>
        <p className="text-xs text-muted-foreground">Estrutura hierárquica de grupos</p>
      </div>

      <DataTable
        columns={columns}
        data={groups}
        loading={isLoading}
        searchPlaceholder="Buscar grupo..."
        addLabel="Novo Grupo"
        onAdd={() => { setEditingId(null); setForm({ codigo: "", descricao: "", tipo: "ANALITICO", codigo_pai: "", ativo: true }); setOpen(true); }}
        filterFn={(r, s) => r.codigo.toLowerCase().includes(s) || r.descricao.toLowerCase().includes(s)}
      />

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingId ? "Editar Grupo" : "Novo Grupo"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Código *</Label>
              <Input className="h-8 text-xs" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} required disabled={!!editingId} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição *</Label>
              <Input className="h-8 text-xs" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINTETICO" className="text-xs">Sintético</SelectItem>
                  <SelectItem value="ANALITICO" className="text-xs">Analítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Grupo Pai (Sintético)</Label>
              <Select value={form.codigo_pai || "none"} onValueChange={(v) => setForm({ ...form, codigo_pai: v === "none" ? "" : v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
                  {parentGroups.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-xs">{g.codigo} - {g.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Excluir Grupo</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && deleteMutation.mutate(deleteId)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blocked delete info */}
      <AlertDialog open={!!deleteBlockedMsg} onOpenChange={(v) => { if (!v) setDeleteBlockedMsg(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Exclusão Bloqueada</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">{deleteBlockedMsg}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Entendi</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
