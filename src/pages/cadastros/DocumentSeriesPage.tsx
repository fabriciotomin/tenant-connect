import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, Pencil, Star, Ban } from "lucide-react";

interface DocumentSeries {
  id: string;
  nome: string;
  modelo: string;
  serie: string;
  proximo_numero: number;
  padrao: boolean;
  ativo: boolean;
  created_at: string;
  doc_count?: number;
}

export default function DocumentSeriesPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocumentSeries | null>(null);
  const [confirmDefault, setConfirmDefault] = useState<string | null>(null);

  const [form, setForm] = useState({
    nome: "",
    modelo: "55",
    serie: "1",
    proximo_numero: "1",
    ativo: true,
    padrao: false,
  });

  const { data: series = [], isLoading } = useQuery({
    queryKey: ["document_series", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_series")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Check doc counts for each series
      const withCounts = await Promise.all(
        (data as DocumentSeries[]).map(async (s) => {
          const { count } = await supabase
            .from("outbound_documents")
            .select("id", { count: "exact", head: true })
            .eq("serie", s.serie);
          return { ...s, doc_count: count || 0 };
        })
      );
      return withCounts;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Sem tenant");
      if (!form.nome.trim()) throw new Error("Nome é obrigatório");
      if (!form.serie.trim()) throw new Error("Série é obrigatória");

      if (form.padrao) {
        await supabase
          .from("document_series")
          .update({ padrao: false } as any)
          .eq("padrao", true)
          .neq("id", editing?.id || "00000000-0000-0000-0000-000000000000");
      }

      if (editing) {
        const updateData: any = {
          nome: form.nome,
          ativo: form.ativo,
          padrao: form.padrao,
          updated_at: new Date().toISOString(),
        };
        // Only allow editing modelo/serie/proximo_numero if no docs emitted
        if ((editing.doc_count || 0) === 0) {
          updateData.modelo = form.modelo;
          updateData.serie = form.serie;
          updateData.proximo_numero = parseInt(form.proximo_numero) || 1;
        }
        const { error } = await supabase
          .from("document_series")
          .update(updateData)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("document_series").insert({
          tenant_id: tenant.id,
          nome: form.nome,
          modelo: form.modelo,
          serie: form.serie,
          proximo_numero: parseInt(form.proximo_numero) || 1,
          ativo: form.ativo,
          padrao: form.padrao,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document_series"] });
      setFormOpen(false);
      setEditing(null);
      toast.success(editing ? "Série atualizada" : "Série criada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (serieId: string) => {
      await supabase
        .from("document_series")
        .update({ padrao: false } as any)
        .eq("padrao", true);
      // Set this one
      const { error } = await supabase
        .from("document_series")
        .update({ padrao: true } as any)
        .eq("id", serieId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document_series"] });
      setConfirmDefault(null);
      toast.success("Série definida como padrão");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAtivoMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("document_series")
        .update({ ativo, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document_series"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  function openCreate() {
    setEditing(null);
    setForm({ nome: "", modelo: "55", serie: "1", proximo_numero: "1", ativo: true, padrao: false });
    setFormOpen(true);
  }

  function openEdit(s: DocumentSeries) {
    setEditing(s);
    setForm({
      nome: s.nome,
      modelo: s.modelo,
      serie: s.serie,
      proximo_numero: String(s.proximo_numero),
      ativo: s.ativo,
      padrao: s.padrao,
    });
    setFormOpen(true);
  }

  const columns = [
    { key: "nome", label: "Nome", render: (r: DocumentSeries) => r.nome },
    { key: "modelo", label: "Modelo", render: (r: DocumentSeries) => r.modelo },
    { key: "serie", label: "Série", render: (r: DocumentSeries) => r.serie },
    {
      key: "proximo_numero",
      label: "Próx. Número",
      render: (r: DocumentSeries) => String(r.proximo_numero).padStart(6, "0"),
    },
    {
      key: "padrao",
      label: "Padrão",
      render: (r: DocumentSeries) =>
        r.padrao ? (
          <Badge className="bg-primary/10 text-primary text-2xs">
            <Star className="h-3 w-3 mr-1" /> Padrão
          </Badge>
        ) : null,
    },
    {
      key: "ativo",
      label: "Status",
      render: (r: DocumentSeries) => (
        <Badge className={`text-2xs ${r.ativo ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
          {r.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
    {
      key: "docs",
      label: "Docs",
      render: (r: DocumentSeries) => r.doc_count || 0,
    },
    {
      key: "acoes",
      label: "Ações",
      render: (r: DocumentSeries) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-2xs px-2" onClick={() => openEdit(r)}>
            <Pencil className="h-3 w-3 mr-1" /> Editar
          </Button>
          {!r.padrao && r.ativo && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-2xs px-2"
              onClick={() => setConfirmDefault(r.id)}
            >
              <Star className="h-3 w-3 mr-1" /> Definir Padrão
            </Button>
          )}
          {!r.padrao && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-2xs px-2"
              onClick={() => toggleAtivoMutation.mutate({ id: r.id, ativo: !r.ativo })}
            >
              <Ban className="h-3 w-3 mr-1" /> {r.ativo ? "Inativar" : "Ativar"}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const hasDocsEmitted = (editing?.doc_count || 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Séries de Documento</h1>
          <p className="text-xs text-muted-foreground">
            Controle de numeração NF-e por série
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Nova Série
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={series}
        loading={isLoading}
        searchPlaceholder="Buscar por nome ou série..."
        filterFn={(r, s) =>
          r.nome.toLowerCase().includes(s) || r.serie.toLowerCase().includes(s)
        }
      />

      {/* Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">
              {editing ? "Editar Série" : "Nova Série"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Nome *</Label>
              <Input
                className="h-8 text-xs"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: NF-e Padrão"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Modelo</Label>
                <Input
                  className="h-8 text-xs"
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                  disabled={hasDocsEmitted}
                  placeholder="55"
                />
                {hasDocsEmitted && (
                  <p className="text-2xs text-muted-foreground mt-1">Bloqueado (docs emitidos)</p>
                )}
              </div>
              <div>
                <Label className="text-xs">Série</Label>
                <Input
                  className="h-8 text-xs"
                  value={form.serie}
                  onChange={(e) => setForm({ ...form, serie: e.target.value })}
                  disabled={hasDocsEmitted}
                  placeholder="1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Próximo Número</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min="1"
                value={form.proximo_numero}
                onChange={(e) => setForm({ ...form, proximo_numero: e.target.value })}
                disabled={hasDocsEmitted}
              />
              {hasDocsEmitted && (
                <p className="text-2xs text-muted-foreground mt-1">
                  Não editável — {editing?.doc_count} documento(s) emitido(s)
                </p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Ativo</Label>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Série Padrão</Label>
              <Switch
                checked={form.padrao}
                onCheckedChange={(v) => setForm({ ...form, padrao: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.nome.trim()}
            >
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Default Dialog */}
      <AlertDialog open={!!confirmDefault} onOpenChange={() => setConfirmDefault(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Definir como Padrão?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta série será usada automaticamente na numeração de novos documentos de saída confirmados.
              A série padrão anterior será desmarcada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDefault && setDefaultMutation.mutate(confirmDefault)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
