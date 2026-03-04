import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { useFinancialClassification } from "@/hooks/useFinancialClassification";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface QuickItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDescricao?: string;
  defaultCodigo?: string;
  onCreated: (item: { id: string; codigo: string; descricao: string; unidade_medida: string; natureza_financeira_id: string | null; centro_custo_id: string | null; natureza_venda_id: string | null; centro_custo_venda_id: string | null; custo_servico?: number }) => void;
}

export function QuickItemDialog({
  open,
  onOpenChange,
  defaultDescricao = "",
  defaultCodigo = "",
  onCreated,
}: QuickItemDialogProps) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { natures, costCenters } = useFinancialClassification();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    codigo: defaultCodigo,
    descricao: defaultDescricao,
    unidade_medida: "UN",
    custo_medio: "0",
  });

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setForm({
        codigo: defaultCodigo,
        descricao: defaultDescricao,
        unidade_medida: "UN",
        custo_medio: "0",
      });
    }
    onOpenChange(v);
  };

  async function handleSave() {
    if (!tenant?.id) return;
    if (!form.codigo.trim()) { toast.error("Código é obrigatório"); return; }
    if (!form.descricao.trim()) { toast.error("Descrição é obrigatória"); return; }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("items")
        .insert({
          tenant_id: tenant.id,
          codigo: form.codigo.trim(),
          descricao: form.descricao.trim(),
          unidade_medida: form.unidade_medida || "UN",
          custo_medio: parseFloat(form.custo_medio) || 0,
        })
        .select("id, codigo, descricao, unidade_medida")
        .single();
      if (error) throw error;
      toast.success("Item criado com sucesso");
      onCreated({
        ...data,
        unidade_medida: data.unidade_medida || "UN",
        natureza_financeira_id: null,
        centro_custo_id: null,
        natureza_venda_id: null,
        centro_custo_venda_id: null,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm">Cadastrar Item</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Código Interno *</Label>
              <Input className="h-8 text-xs" value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Unidade</Label>
              <Input className="h-8 text-xs" value={form.unidade_medida} onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Descrição *</Label>
            <Input className="h-8 text-xs" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Preço de Custo</Label>
            <Input className="h-8 text-xs" type="number" min="0" step="0.01" value={form.custo_medio} onChange={(e) => setForm({ ...form, custo_medio: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar Item"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
