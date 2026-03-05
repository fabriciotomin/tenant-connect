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

interface Customer {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
}

export default function CustomersPage() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ razao_social: "", nome_fantasia: "", cnpj: "", email: "", telefone: "", ativo: true });

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id, razao_social, nome_fantasia, cnpj, telefone, email, ativo").is("deleted_at", null).order("razao_social");
      if (error) throw error;
      return data as Customer[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        razao_social: form.razao_social,
        nome_fantasia: form.nome_fantasia || null,
        cnpj: form.cnpj || null,
        email: form.email || null,
        telefone: form.telefone || null,
        ativo: form.ativo,
      };
      if (editingId) {
        const { error } = await supabase.from("customers").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("customers").insert({ ...payload, tenant_id: tenant!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      closeDialog();
      toast.success(editingId ? "Cliente atualizado" : "Cliente cadastrado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openEdit(c: Customer) {
    setEditingId(c.id);
    setForm({ razao_social: c.razao_social, nome_fantasia: c.nome_fantasia || "", cnpj: c.cnpj || "", email: c.email || "", telefone: c.telefone || "", ativo: c.ativo });
    setOpen(true);
  }

  function closeDialog() {
    setOpen(false);
    setEditingId(null);
    setForm({ razao_social: "", nome_fantasia: "", cnpj: "", email: "", telefone: "", ativo: true });
  }

  const columns = [
    { key: "razao_social", label: "Razão Social" },
    { key: "nome_fantasia", label: "Nome Fantasia", render: (r: Customer) => r.nome_fantasia || "—" },
    { key: "cnpj", label: "CNPJ", render: (r: Customer) => r.cnpj || "—" },
    { key: "ativo", label: "Status", render: (r: Customer) => <Badge variant={r.ativo ? "default" : "secondary"} className="text-2xs">{r.ativo ? "Ativo" : "Inativo"}</Badge> },
    { key: "acoes", label: "", render: (r: Customer) => <Button variant="ghost" size="sm" className="h-6 text-2xs" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>Editar</Button> },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Clientes</h1>
        <p className="text-xs text-muted-foreground">Cadastro de clientes</p>
      </div>

      <DataTable
        columns={columns} data={customers} loading={isLoading}
        searchPlaceholder="Buscar cliente..."
        addLabel="Novo Cliente"
        onAdd={() => { setEditingId(null); setForm({ razao_social: "", nome_fantasia: "", cnpj: "", email: "", telefone: "", ativo: true }); setOpen(true); }}
        filterFn={(r, s) => r.razao_social.toLowerCase().includes(s) || (r.cnpj || "").includes(s)}
      />

      <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">{editingId ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Razão Social *</Label>
                <Input className="h-8 text-xs" value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nome Fantasia</Label>
                <Input className="h-8 text-xs" value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">CNPJ</Label>
                <Input className="h-8 text-xs" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">E-mail</Label>
                <Input className="h-8 text-xs" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input className="h-8 text-xs" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
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
