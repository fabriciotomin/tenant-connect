import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface QuickSupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCnpj?: string;
  defaultRazaoSocial?: string;
  defaultNomeFantasia?: string;
  onCreated: (supplier: { id: string; razao_social: string; cnpj: string | null }) => void;
}

export function QuickSupplierDialog({
  open,
  onOpenChange,
  defaultCnpj = "",
  defaultRazaoSocial = "",
  defaultNomeFantasia = "",
  onCreated,
}: QuickSupplierDialogProps) {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    razao_social: defaultRazaoSocial,
    nome_fantasia: defaultNomeFantasia,
    cnpj: defaultCnpj,
    email: "",
    telefone: "",
  });

  // Reset form when dialog opens with new defaults
  const handleOpenChange = (v: boolean) => {
    if (v) {
      setForm({
        razao_social: defaultRazaoSocial,
        nome_fantasia: defaultNomeFantasia,
        cnpj: defaultCnpj,
        email: "",
        telefone: "",
      });
    }
    onOpenChange(v);
  };

  async function handleSave() {
    if (!tenant?.id) return;
    if (!form.razao_social.trim()) {
      toast.error("Razão social é obrigatória");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({
          tenant_id: tenant.id,
          razao_social: form.razao_social.trim(),
          nome_fantasia: form.nome_fantasia.trim() || null,
          cnpj: form.cnpj.trim() || null,
          email: form.email.trim() || null,
          telefone: form.telefone.trim() || null,
          created_by: user?.id,
        })
        .select("id, razao_social, cnpj")
        .single();
      if (error) throw error;
      toast.success("Fornecedor criado com sucesso");
      onCreated(data);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Cadastrar Fornecedor</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Razão Social *</Label>
            <Input className="h-8 text-xs" value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nome Fantasia</Label>
            <Input className="h-8 text-xs" value={form.nome_fantasia} onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">CNPJ</Label>
            <Input className="h-8 text-xs" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} readOnly={!!defaultCnpj} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input className="h-8 text-xs" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Telefone</Label>
              <Input className="h-8 text-xs" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !form.razao_social.trim()}>
              {saving ? "Salvando..." : "Salvar Fornecedor"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
