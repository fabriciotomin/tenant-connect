import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface PaymentCondition {
  id: string;
  descricao: string;
  numero_parcelas: number;
  dias_entre_parcelas: number;
}

export default function PaymentConditionsPage() {
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ descricao: "", numero_parcelas: "1", dias_entre_parcelas: "30" });

  const { data: conditions = [], isLoading } = useQuery({
    queryKey: ["payment_conditions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_conditions")
        .select("id, descricao, numero_parcelas, dias_entre_parcelas")
        .order("descricao");
      if (error) throw error;
      return data as PaymentCondition[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Sem tenant");
      const payload = {
        descricao: form.descricao,
        numero_parcelas: parseInt(form.numero_parcelas) || 1,
        dias_entre_parcelas: parseInt(form.dias_entre_parcelas) || 0,
      };

      if (editId) {
        const { error } = await supabase.from("payment_conditions").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payment_conditions").insert({
          ...payload,
          tenant_id: tenant.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment_conditions"] });
      setOpen(false);
      resetForm();
      toast.success(editId ? "Condição atualizada" : "Condição criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function resetForm() {
    setForm({ descricao: "", numero_parcelas: "1", dias_entre_parcelas: "30" });
    setEditId(null);
  }

  function handleEdit(c: PaymentCondition) {
    setForm({
      descricao: c.descricao,
      numero_parcelas: String(c.numero_parcelas),
      dias_entre_parcelas: String(c.dias_entre_parcelas),
    });
    setEditId(c.id);
    setOpen(true);
  }

  // Generate preview of installment dates
  function getInstallmentPreview() {
    const parcelas = parseInt(form.numero_parcelas) || 1;
    const intervalo = parseInt(form.dias_entre_parcelas) || 0;
    const result: string[] = [];
    for (let i = 1; i <= Math.min(parcelas, 12); i++) {
      result.push(`${intervalo * i} dias`);
    }
    return result;
  }

  const columns = [
    { key: "descricao", label: "Descrição", render: (r: PaymentCondition) => r.descricao },
    { key: "numero_parcelas", label: "Parcelas", render: (r: PaymentCondition) => r.numero_parcelas },
    { key: "dias_entre_parcelas", label: "Intervalo (dias)", render: (r: PaymentCondition) => r.dias_entre_parcelas },
    {
      key: "prazos", label: "Prazos", render: (r: PaymentCondition) => {
        const prazos = Array.from({ length: Math.min(r.numero_parcelas, 6) }, (_, i) => r.dias_entre_parcelas * (i + 1));
        return <span className="text-xs text-muted-foreground">{prazos.join(" / ")} dias</span>;
      },
    },
    {
      key: "acoes", label: "Ações", render: (r: PaymentCondition) => (
        <Button variant="ghost" size="sm" className="h-6 text-2xs" onClick={(e) => { e.stopPropagation(); handleEdit(r); }}>Editar</Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Condições de Pagamento</h1>
        <p className="text-xs text-muted-foreground">
          Configure parcelas e intervalos. Ex: À vista = 1 parcela, 0 dias. 30/60/90 = 3 parcelas, 30 dias.
        </p>
      </div>

      <DataTable
        columns={columns}
        data={conditions}
        loading={isLoading}
        searchPlaceholder="Buscar condição..."
        addLabel="Nova Condição"
        onAdd={() => { resetForm(); setOpen(true); }}
        filterFn={(r, s) => r.descricao.toLowerCase().includes(s)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">{editId ? "Editar" : "Nova"} Condição de Pagamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição *</Label>
              <Input className="h-8 text-xs" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: 30/60/90 dias" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Nº Parcelas</Label>
                <Input className="h-8 text-xs" type="number" min="1" value={form.numero_parcelas} onChange={(e) => setForm({ ...form, numero_parcelas: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Intervalo (dias)</Label>
                <Input className="h-8 text-xs" type="number" min="0" value={form.dias_entre_parcelas} onChange={(e) => setForm({ ...form, dias_entre_parcelas: e.target.value })} />
              </div>
            </div>
            {/* Preview */}
            <div className="bg-muted/50 rounded p-2">
              <p className="text-2xs text-muted-foreground mb-1">Prazos gerados:</p>
              <p className="text-xs font-mono">
                {getInstallmentPreview().join(" → ")}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={saveMutation.isPending || !form.descricao}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
