import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, ChevronRight, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface FN {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  tipo_natureza: string;
  codigo_pai: string | null;
  ordem: number;
  ativo: boolean;
}

function buildTree(items: FN[], parentId: string | null = null): (FN & { children: any[] })[] {
  return items
    .filter(i => i.codigo_pai === parentId)
    .sort((a, b) => a.ordem - b.ordem || a.codigo.localeCompare(b.codigo))
    .map(i => ({ ...i, children: buildTree(items, i.id) }));
}

function TreeNode({ node, level, onEdit, onDelete }: { node: FN & { children: any[] }; level: number; onEdit: (n: FN) => void; onDelete: (n: FN) => void }) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSintetico = node.tipo === "SINTETICO";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 text-xs",
          !node.ativo && "opacity-50"
        )}
        style={{ paddingLeft: `${level * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button onClick={() => setOpen(!open)} className="p-0.5">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        ) : (
          <span className="w-4" />
        )}
        <span className="font-mono text-muted-foreground w-12">{node.codigo}</span>
        <span className={cn("flex-1", isSintetico && "font-semibold")}>{node.descricao}</span>
        <Badge variant="outline" className="text-2xs">
          {node.tipo_natureza === "RECEITA" ? "Receita" : "Despesa"}
        </Badge>
        <Badge variant={isSintetico ? "secondary" : "default"} className="text-2xs">
          {isSintetico ? "Sintética" : "Analítica"}
        </Badge>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onEdit(node)}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(node)}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      {open && node.children.map((child: any) => (
        <TreeNode key={child.id} node={child} level={level + 1} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

export default function FinancialNaturesPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<FN | null>(null);
  const [deleting, setDeleting] = useState<FN | null>(null);
  const [form, setForm] = useState({
    codigo: "", descricao: "", tipo: "ANALITICO", tipo_natureza: "DESPESA", codigo_pai: "none", ordem: "0", ativo: true,
  });

  const { data: natures = [], isLoading } = useQuery({
    queryKey: ["financial_natures_all", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_natures")
        .select("id, codigo, descricao, tipo, tipo_natureza, codigo_pai, ordem, ativo")
        .order("ordem");
      if (error) throw error;
      return data as FN[];
    },
  });

  const tree = buildTree(natures);
  const sinteticas = natures.filter(n => n.tipo === "SINTETICO");

  const openNew = () => {
    setEditing(null);
    setForm({ codigo: "", descricao: "", tipo: "ANALITICO", tipo_natureza: "DESPESA", codigo_pai: "none", ordem: "0", ativo: true });
    setDialog(true);
  };

  const openEdit = (n: FN) => {
    setEditing(n);
    setForm({
      codigo: n.codigo, descricao: n.descricao, tipo: n.tipo, tipo_natureza: n.tipo_natureza,
      codigo_pai: n.codigo_pai || "none", ordem: String(n.ordem), ativo: n.ativo,
    });
    setDialog(true);
  };

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("delete_financial_nature_safe" as any, { p_id: id });
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
        codigo_pai: form.codigo_pai === "none" ? null : (form.codigo_pai || null),
        ordem: Number(form.ordem) || 0,
        ativo: form.ativo,
        updated_by: user?.id,
      };
      if (editing) {
        const { error } = await supabase.from("financial_natures").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        payload.codigo = form.codigo;
        const { error } = await supabase.from("financial_natures").insert({ ...payload, created_by: user?.id } as any);
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
          <p className="text-xs text-muted-foreground">Estrutura hierárquica para DRE e classificação financeira</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nova Natureza</Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : (
        <div className="border rounded-lg p-2">
          {tree.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma natureza cadastrada</p>
          ) : (
            tree.map(node => <TreeNode key={node.id} node={node} level={0} onEdit={openEdit} onDelete={(n) => setDeleting(n)} />)
          )}
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
                <Input className="h-8 text-xs" value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} disabled={!!editing} />
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
                    <SelectItem value="SINTETICO" className="text-xs">Sintética (agrupamento)</SelectItem>
                    <SelectItem value="ANALITICO" className="text-xs">Analítica (lançamento)</SelectItem>
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
            <div>
              <Label className="text-xs">Natureza Pai</Label>
              <Select value={form.codigo_pai} onValueChange={v => setForm(p => ({ ...p, codigo_pai: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Nenhuma (raiz)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-xs">Nenhuma (raiz)</SelectItem>
                  {sinteticas.filter(s => s.id !== editing?.id).map(s => (
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

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Excluir natureza financeira?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              "{deleting?.codigo} - {deleting?.descricao}" será excluída permanentemente. Só é possível excluir se não possuir filhos nem vínculos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs h-8">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs h-8 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleting) deleteMut.mutate(deleting.id);
                setDeleting(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
