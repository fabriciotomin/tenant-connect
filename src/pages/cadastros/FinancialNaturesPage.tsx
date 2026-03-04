import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface FN {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  tipo_natureza: string;
  ordem: number;
  ativo: boolean;
}

function getLevel(codigo: string) {
  return codigo.split(".").length;
}

export default function FinancialNaturesPage() {
  const { tenant } = useTenant();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<FN | null>(null);
  const [deleting, setDeleting] = useState<FN | null>(null);
  const [form, setForm] = useState({
    codigo: "", descricao: "", tipo: "ANALITICO", tipo_natureza: "DESPESA", ordem: "0", ativo: true,
  });

  const { data: natures = [], isLoading } = useQuery({
    queryKey: ["financial_natures_all", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_natures")
        .select("id, codigo, descricao, tipo, tipo_natureza, ordem, ativo")
        .order("ordem");
      if (error) throw error;
      return data as FN[];
    },
  });

  const openNew = () => {
    setEditing(null);
    setForm({ codigo: "", descricao: "", tipo: "ANALITICO", tipo_natureza: "DESPESA", ordem: "0", ativo: true });
    setDialog(true);
  };

  const openEdit = (n: FN) => {
    setEditing(n);
    setForm({
      codigo: n.codigo, descricao: n.descricao, tipo: n.tipo, tipo_natureza: n.tipo_natureza,
      ordem: String(n.ordem), ativo: n.ativo,
    });
    setDialog(true);
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("financial_natures").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial_natures_all"] });
      toast.success("Natureza excluída");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Tenant inválido");
      const payload: any = {
        tenant_id: tenant.id,
        descricao: form.descricao,
        tipo: form.tipo as any,
        tipo_natureza: form.tipo_natureza,
        ordem: Number(form.ordem) || 0,
        ativo: form.ativo,
      };
      if (editing) {
        const { error } = await supabase.from("financial_natures").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        payload.codigo = form.codigo;
        const { error } = await supabase.from("financial_natures").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["financial_natures_all"] });
      setDialog(false);
      toast.success(editing ? "Natureza atualizada" : "Natureza criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Naturezas Financeiras</h1>
          <p className="text-xs text-muted-foreground">Plano de contas hierárquico para classificação financeira e DRE</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova Natureza</Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : natures.length === 0 ? (
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground text-center">Nenhuma natureza cadastrada</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 w-24">Código</th>
                <th className="text-left p-2">Descrição</th>
                <th className="text-left p-2 w-20">Tipo</th>
                <th className="text-left p-2 w-24">Classificação</th>
                <th className="text-left p-2 w-16">Status</th>
                <th className="text-left p-2 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {natures.map(n => {
                const level = getLevel(n.codigo);
                const isSintetico = n.tipo === "SINTETICO";
                return (
                  <tr
                    key={n.id}
                    className={cn(
                      "border-t hover:bg-muted/30 transition-colors",
                      level === 1 && "bg-muted/40 font-semibold",
                      level === 2 && "bg-muted/20",
                    )}
                  >
                    <td className="p-2 font-mono text-muted-foreground">{n.codigo}</td>
                    <td className="p-2">
                      <div className="flex items-center" style={{ paddingLeft: `${(level - 1) * 16}px` }}>
                        {level > 1 && <ChevronRight className="h-3 w-3 mr-1 text-muted-foreground/50 shrink-0" />}
                        <span className={cn(isSintetico && "font-semibold uppercase", !n.ativo && "text-muted-foreground line-through")}>
                          {n.descricao}
                        </span>
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className={cn("text-2xs", n.tipo_natureza === "RECEITA" ? "border-green-500/50 text-green-700" : "border-destructive/50 text-destructive")}>
                        {n.tipo_natureza === "RECEITA" ? "Receita" : "Despesa"}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge variant={isSintetico ? "secondary" : "default"} className="text-2xs">
                        {isSintetico ? "Sintética" : "Analítica"}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge className={cn("text-2xs", n.ativo ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground")}>
                        {n.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openEdit(n)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => setDeleting(n)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{editing ? "Editar" : "Nova"} Natureza Financeira</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Código *</Label>
                <Input className="h-8 text-xs" placeholder="Ex: 3.1.1" value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} disabled={!!editing} />
              </div>
              <div>
                <Label className="text-xs">Ordem</Label>
                <Input className="h-8 text-xs" type="number" value={form.ordem} onChange={e => setForm(p => ({ ...p, ordem: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Descrição *</Label>
              <Input className="h-8 text-xs" value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Classificação</Label>
                <Select value={form.tipo} onValueChange={v => setForm(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SINTETICO" className="text-xs">Sintética (Grupo)</SelectItem>
                    <SelectItem value="ANALITICO" className="text-xs">Analítica (Lançamento)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo_natureza} onValueChange={v => setForm(p => ({ ...p, tipo_natureza: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RECEITA" className="text-xs">Receita</SelectItem>
                    <SelectItem value="DESPESA" className="text-xs">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Excluir natureza financeira?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              "{deleting?.codigo} - {deleting?.descricao}" será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
            <AlertDialogAction className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleting) deleteMut.mutate(deleting.id); setDeleting(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
