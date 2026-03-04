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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent as AlertContent, AlertDialogDescription, AlertDialogFooter as AlertFoot, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface CC {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  ativo: boolean;
  codigo_pai: string | null;
}

export default function CostCentersPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<CC | null>(null);
  const [form, setForm] = useState({ codigo: "", descricao: "", tipo: "ANALITICO", codigo_pai: "none" });

  const { data: centers = [], isLoading } = useQuery({
    queryKey: ["cost_centers_all", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("id, codigo, descricao, tipo, ativo, codigo_pai")
        .order("codigo");
      if (error) throw error;
      return data as CC[];
    },
  });

  const sinteticos = centers.filter(c => c.tipo === "SINTETICO");

  const openNew = () => {
    setEditing(null);
    setForm({ codigo: "", descricao: "", tipo: "ANALITICO", codigo_pai: "none" });
    setDialog(true);
  };

  const openEdit = (c: CC) => {
    setEditing(c);
    setForm({ codigo: c.codigo, descricao: c.descricao, tipo: c.tipo, codigo_pai: c.codigo_pai || "none" });
    setDialog(true);
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Tenant inválido");
      const payload: any = {
        tenant_id: tenant.id,
        descricao: form.descricao,
        tipo: form.tipo as any,
        codigo_pai: form.codigo_pai === "none" ? null : (form.codigo_pai || null),
        updated_by: user?.id,
      };
      if (editing) {
        const { error } = await supabase.from("cost_centers").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        payload.codigo = form.codigo;
        const { error } = await supabase.from("cost_centers").insert({ ...payload, created_by: user?.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost_centers_all"] });
      setDialog(false);
      toast.success(editing ? "Centro atualizado" : "Centro criado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_cost_center_safe" as any, { p_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cost_centers_all"] });
      toast.success("Centro de custo excluído");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: "codigo", label: "Código" },
    { key: "descricao", label: "Descrição" },
    { key: "tipo", label: "Tipo", render: (r: CC) => <Badge variant={r.tipo === "SINTETICO" ? "secondary" : "default"} className="text-2xs">{r.tipo === "SINTETICO" ? "Sintético" : "Analítico"}</Badge> },
    { key: "ativo", label: "Status", render: (r: CC) => <Badge className={`text-2xs ${r.ativo ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>{r.ativo ? "Ativo" : "Inativo"}</Badge> },
    {
      key: "acoes", label: "", render: (r: CC) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-2xs" onClick={() => openEdit(r)}>Editar</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 text-2xs text-destructive hover:text-destructive">Excluir</Button>
            </AlertDialogTrigger>
            <AlertContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-sm">Excluir centro de custo?</AlertDialogTitle>
                <AlertDialogDescription className="text-xs">
                  "{r.codigo} - {r.descricao}" será excluído permanentemente. Só é possível excluir se não possuir filhos nem vínculos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertFoot>
                <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
                <AlertDialogAction className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMut.mutate(r.id)}>Excluir</AlertDialogAction>
              </AlertFoot>
            </AlertContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Centros de Custo</h1>
        <p className="text-xs text-muted-foreground">Classificação por centro de custo</p>
      </div>

      <DataTable
        columns={columns} data={centers} loading={isLoading}
        searchPlaceholder="Buscar centro de custo..."
        addLabel="Novo Centro" onAdd={openNew}
        filterFn={(r, s) => r.codigo.toLowerCase().includes(s) || r.descricao.toLowerCase().includes(s)}
      />

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="text-sm">{editing ? "Editar" : "Novo"} Centro de Custo</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Código *</Label>
              <Input className="h-8 text-xs" value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} disabled={!!editing} />
            </div>
            <div>
              <Label className="text-xs">Descrição *</Label>
              <Input className="h-8 text-xs" value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SINTETICO" className="text-xs">Sintético (agrupamento)</SelectItem>
                  <SelectItem value="ANALITICO" className="text-xs">Analítico (lançamento)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Centro Pai</Label>
              <Select value={form.codigo_pai} onValueChange={v => setForm(p => ({ ...p, codigo_pai: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhum (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">Nenhum (raiz)</SelectItem>
                  {sinteticos.filter(s => s.id !== editing?.id).map(s => (
                    <SelectItem key={s.id} value={s.id} className="text-xs">{s.codigo} - {s.descricao}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialog(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => saveMut.mutate()} disabled={!form.codigo || !form.descricao || saveMut.isPending}>
              {saveMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
