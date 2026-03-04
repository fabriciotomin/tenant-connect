import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface Empresa {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  plano: string;
  status: string;
  slug: string;
  created_at: string;
}

const statusLabels: Record<string, string> = { ativo: "Ativo", inativo: "Inativo", suspenso: "Suspenso" };
const statusColors: Record<string, string> = {
  ativo: "bg-green-100 text-green-800",
  inativo: "bg-muted text-muted-foreground",
  suspenso: "bg-yellow-100 text-yellow-800",
};

function generateSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getBaseUrl(): string {
  return window.location.origin;
}

function copyLink(slug: string) {
  const url = `${getBaseUrl()}/t/${slug}/auth`;
  navigator.clipboard.writeText(url).then(() => {
    toast.success("Link copiado!");
  });
}

export default function EmpresasPage() {
  const { isAdminGlobal } = useUserProfile();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    razao_social: "",
    nome_fantasia: "",
    cnpj: "",
    plano: "basico",
  });

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ["empresas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("*")
        .order("razao_social");
      if (error) throw error;
      return data as Empresa[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const baseSlug = generateSlug(form.razao_social);
      // Check uniqueness
      let slug = baseSlug;
      let suffix = 1;
      while (true) {
        const { data } = await supabase.from("empresas").select("id").eq("slug", slug).maybeSingle();
        if (!data) break;
        slug = `${baseSlug}-${suffix}`;
        suffix++;
      }
      const { error } = await supabase.from("empresas").insert({
        razao_social: form.razao_social,
        nome_fantasia: form.nome_fantasia || null,
        cnpj: form.cnpj || null,
        plano: form.plano as any,
        slug,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      setOpen(false);
      setForm({ razao_social: "", nome_fantasia: "", cnpj: "", plano: "basico" });
      toast.success("Empresa criada com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      const { error } = await supabase
        .from("empresas")
        .update({ status: newStatus as any })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["empresas"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const columns = [
    { key: "razao_social", label: "Razão Social" },
    { key: "nome_fantasia", label: "Nome Fantasia", render: (r: Empresa) => r.nome_fantasia || "—" },
    { key: "cnpj", label: "CNPJ", render: (r: Empresa) => r.cnpj || "—" },
    {
      key: "link",
      label: "Link de Cadastro",
      render: (r: Empresa) => (
        <div className="flex items-center gap-1">
          <span className="text-2xs text-muted-foreground truncate max-w-[200px]">
            /t/{r.slug}/auth
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => { e.stopPropagation(); copyLink(r.slug); }}
            title="Copiar link"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    { key: "plano", label: "Plano", render: (r: Empresa) => <Badge variant="outline" className="text-2xs capitalize">{r.plano}</Badge> },
    {
      key: "status",
      label: "Status",
      render: (r: Empresa) => (
        <Badge className={`text-2xs ${statusColors[r.status] || ""}`}>
          {statusLabels[r.status] || r.status}
        </Badge>
      ),
    },
    ...(isAdminGlobal
      ? [{
          key: "acoes",
          label: "Ações",
          render: (r: Empresa) => (
            <div className="flex gap-1">
              {r.status === "ativo" ? (
                <Button variant="ghost" size="sm" className="h-6 text-2xs px-2"
                  onClick={(e) => { e.stopPropagation(); toggleStatusMutation.mutate({ id: r.id, newStatus: "inativo" }); }}>
                  Inativar
                </Button>
              ) : (
                <Button variant="ghost" size="sm" className="h-6 text-2xs px-2"
                  onClick={(e) => { e.stopPropagation(); toggleStatusMutation.mutate({ id: r.id, newStatus: "ativo" }); }}>
                  Ativar
                </Button>
              )}
            </div>
          ),
        }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Empresas</h1>
        <p className="text-xs text-muted-foreground">Gestão de empresas (tenants)</p>
      </div>

      <DataTable
        columns={columns}
        data={empresas}
        loading={isLoading}
        searchPlaceholder="Buscar empresa..."
        addLabel={isAdminGlobal ? "Nova Empresa" : undefined}
        onAdd={isAdminGlobal ? () => setOpen(true) : undefined}
        filterFn={(r, s) =>
          r.razao_social.toLowerCase().includes(s) ||
          (r.nome_fantasia || "").toLowerCase().includes(s) ||
          (r.cnpj || "").includes(s)
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Nova Empresa</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }}
            className="space-y-3"
          >
            <div className="space-y-1.5">
              <Label className="text-xs">Razão Social *</Label>
              <Input className="h-8 text-xs" value={form.razao_social} onChange={(e) => setForm({ ...form, razao_social: e.target.value })} required />
              {form.razao_social && (
                <p className="text-2xs text-muted-foreground">
                  Slug: {generateSlug(form.razao_social)}
                </p>
              )}
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
              <Label className="text-xs">Plano *</Label>
              <Select value={form.plano} onValueChange={(v) => setForm({ ...form, plano: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico" className="text-xs">Básico</SelectItem>
                  <SelectItem value="profissional" className="text-xs">Profissional</SelectItem>
                  <SelectItem value="enterprise" className="text-xs">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
