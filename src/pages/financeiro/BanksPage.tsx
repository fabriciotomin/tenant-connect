import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Bank {
  id: string;
  codigo: string;
  nome: string;
  agencia: string | null;
  conta: string | null;
  tipo_conta: string;
  saldo_inicial: number;
  ativo: boolean;
  tenant_id: string;
}

const emptyForm = { codigo: "", nome: "", agencia: "", conta: "", tipo_conta: "corrente", saldo_inicial: "0", ativo: true };

export default function BanksPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<Bank | null>(null);

  const { data: banks = [], isLoading } = useQuery({
    queryKey: ["banks", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banks")
        .select("*")
        .order("codigo");
      if (error) throw error;
      return data as Bank[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        nome: form.nome,
        agencia: form.agencia || null,
        conta: form.conta || null,
        tipo_conta: form.tipo_conta,
        saldo_inicial: Number(form.saldo_inicial) || 0,
        ativo: form.ativo,
        tenant_id: tenant!.id,
      };
      if (editId) {
        const { error } = await supabase.from("banks").update({ ...payload, updated_by: user?.id }).eq("id", editId);
        if (error) throw error;
      } else {
        payload.codigo = form.codigo;
        const { error } = await supabase.from("banks").insert({ ...payload, created_by: user?.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banks"] });
      setDialogOpen(false);
      toast.success(editId ? "Banco atualizado" : "Banco criado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      // Check dependencies via RPC
      const { data: deps } = await supabase.rpc("check_entity_dependencies", { p_entity: "banks", p_id: id });
      if (deps && deps !== "") {
        throw new Error(`Cadastro possui movimentações vinculadas: ${deps}. Não pode ser excluído.`);
      }
      const { error } = await supabase.from("banks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["banks"] });
      setDeleteTarget(null);
      toast.success("Banco excluído");
    },
    onError: (e: any) => { setDeleteTarget(null); toast.error(e.message); },
  });

  const openNew = () => { setEditId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (b: Bank) => {
    setEditId(b.id);
    setForm({ codigo: b.codigo, nome: b.nome, agencia: b.agencia || "", conta: b.conta || "", tipo_conta: b.tipo_conta, saldo_inicial: String(b.saldo_inicial), ativo: b.ativo });
    setDialogOpen(true);
  };

  const columns = [
    { key: "codigo", label: "Código", render: (r: Bank) => r.codigo },
    { key: "nome", label: "Nome", render: (r: Bank) => r.nome },
    { key: "agencia", label: "Agência", render: (r: Bank) => r.agencia || "—" },
    { key: "conta", label: "Conta", render: (r: Bank) => r.conta || "—" },
    { key: "tipo_conta", label: "Tipo", render: (r: Bank) => r.tipo_conta === "corrente" ? "Corrente" : "Poupança" },
    { key: "ativo", label: "Status", render: (r: Bank) => <Badge className={r.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>{r.ativo ? "Ativo" : "Inativo"}</Badge> },
    {
      key: "acoes", label: "Ações", render: (r: Bank) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(r)}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Bancos</h1>
          <p className="text-xs text-muted-foreground">Cadastro de contas bancárias</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-1" />Novo Banco</Button>
      </div>

      <DataTable columns={columns} data={banks} loading={isLoading} searchPlaceholder="Buscar banco..." filterFn={(r, s) => r.nome.toLowerCase().includes(s) || r.codigo.toLowerCase().includes(s)} />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar Banco" : "Novo Banco"}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Código *</Label><Input value={form.codigo} onChange={e => setForm(p => ({ ...p, codigo: e.target.value }))} disabled={!!editId} /></div>
              <div><Label className="text-xs">Nome *</Label><Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs">Agência</Label><Input value={form.agencia} onChange={e => setForm(p => ({ ...p, agencia: e.target.value }))} /></div>
              <div><Label className="text-xs">Conta</Label><Input value={form.conta} onChange={e => setForm(p => ({ ...p, conta: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Tipo Conta</Label>
                <Select value={form.tipo_conta} onValueChange={v => setForm(p => ({ ...p, tipo_conta: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="corrente">Corrente</SelectItem>
                    <SelectItem value="poupanca">Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Saldo Inicial</Label><Input type="number" step="0.01" value={form.saldo_inicial} onChange={e => setForm(p => ({ ...p, saldo_inicial: e.target.value }))} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={() => saveMut.mutate()} disabled={!form.codigo || !form.nome || saveMut.isPending}>
              {saveMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Banco</AlertDialogTitle>
            <AlertDialogDescription>Deseja excluir o banco "{deleteTarget?.nome}"? Esta ação é irreversível.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
