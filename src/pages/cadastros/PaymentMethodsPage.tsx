import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface FormaPagamento {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
}

export default function PaymentMethodsPage() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "" });

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ["formas_pagamento"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formas_pagamento")
        .select("id, nome, ativo, created_at")
        .order("nome");
      if (error) throw error;
      return data as FormaPagamento[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Sem tenant");
      const { error } = await supabase.from("formas_pagamento").insert({
        tenant_id: tenant.id,
        nome: form.nome,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formas_pagamento"] });
      setOpen(false);
      setForm({ nome: "" });
      toast.success("Forma de pagamento criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase.from("formas_pagamento").update({ ativo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["formas_pagamento"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: "nome", label: "Nome", render: (r: FormaPagamento) => r.nome },
    {
      key: "ativo", label: "Ativo", render: (r: FormaPagamento) => (
        <Switch checked={r.ativo} onCheckedChange={(v) => toggleMutation.mutate({ id: r.id, ativo: v })} />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Formas de Pagamento</h1>
        <p className="text-xs text-muted-foreground">Gerenciar formas de pagamento disponíveis</p>
      </div>

      <DataTable
        columns={columns} data={methods} loading={isLoading}
        searchPlaceholder="Buscar forma..."
        addLabel="Nova Forma"
        onAdd={() => setOpen(true)}
        filterFn={(r, s) => r.nome.toLowerCase().includes(s)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Nova Forma de Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome *</Label>
              <Input className="h-8 text-xs" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: PIX Banco X" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending || !form.nome}>
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
