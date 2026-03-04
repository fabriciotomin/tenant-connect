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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Supplier {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
}

export default function SuppliersPage() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ razao_social: "", nome_fantasia: "", cnpj: "", email: "", telefone: "", ativo: true });

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("razao_social");
      if (error) throw error;
      return data as Supplier[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        razao_social: form.razao_social,
        nome_fantasia: form.nome_fantasia || null,
        cnpj: form.cnpj || null,
        email: form.email || null,
        telefone: form.telefone || null,
        ativo: form.ativo,
      };
      if (editingId) {
        const { error } = await supabase.from("suppliers").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("suppliers").insert({ ...payload, tenant_id: tenant!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      closeDialog();
      toast.success(editingId ? "Fornecedor atualizado" : "Fornecedor cadastrado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openEdit(s: Supplier) {
    setEditingId(s.id);
    setForm({ razao_social: s.razao_social, nome_fantasia: s.nome_fantasia || "", cnpj: s.cnpj || "", email: s.email || "", telefone: s.telefone || "", ativo: s.ativo });
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditingId(null);
    setForm({ razao_social: "", nome_fantasia: "", cnpj: "", email: "", telefone: "", ativo: true });
  }

  const columns = [
    { key: "razao_social", label: "Razão Social" },
    { key: "nome_fantasia", label: "Nome Fantasia", render: (r: Supplier) => r.nome_fantasia || "—" },
    { key: "cnpj", label: "CNPJ", render: (r: Supplier) => r.cnpj || "—" },
    { key: "email", label: "E-mail", render: (r: Supplier) => r.email || "—" },
    { key: "ativo", label: "Status", render: (r: Supplier) => <Badge variant={r.ativo ? "default" : "secondary"} className="text-2xs">{r.ativo ? "Ativo" : "Inativo"}</Badge> },
    { key: "acoes", label: "", render: (r: Supplier) => <Button variant="ghost" size="sm" className="h-6 text-2xs" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Editar</Button> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Fornecedores</h1>
        <p className="text-xs text-muted-foreground">Cadastro de fornecedores</p>
      </div>

      <DataTable
        columns={columns}
        data={suppliers}
        loading={isLoading}
        searchPlaceholder="Buscar fornecedor..."
        addLabel="Novo Fornecedor"
        onAdd={() => { setEditingId(null); setForm({ razao_social: "", nome_fantasia: "", cnpj: "", email: "", telefone: "", ativo: true }); setOpen(true); }}
        filterFn={(r, s) => r.razao_social.toLowerCase().includes(s) || (r.cnpj || "").includes(s)}
      />

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Razão Social *</Label>
              <Input className="h-8 text-xs" value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nome Fantasia</Label>
              <Input className="h-8 text-xs" value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">CNPJ</Label>
                <Input className="h-8 text-xs" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input className="h-8 text-xs" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail</Label>
              <Input className="h-8 text-xs" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
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
