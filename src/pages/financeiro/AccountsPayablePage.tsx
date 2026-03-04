import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FinancialFilters, applyFinancialFilters, emptyFilters, type FinancialFilterValues } from "@/components/FinancialFilters";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { Plus, Download } from "lucide-react";

const statusColors: Record<string, string> = {
  ABERTO: "bg-blue-100 text-blue-800",
  PAGO: "bg-green-100 text-green-800",
  CANCELADO: "bg-red-100 text-red-800",
};

interface AP {
  id: string;
  documento_origem: string | null;
  descricao: string | null;
  data_vencimento: string;
  data_baixa: string | null;
  data_lancamento: string;
  competencia: string;
  valor: number;
  valor_pago: number | null;
  status: string;
  juros: number;
  multa: number;
  desconto: number;
  fornecedor_id: string;
  suppliers?: { razao_social: string } | null;
}

export default function AccountsPayablePage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [newDialog, setNewDialog] = useState(false);
  const [baixaDialog, setBaixaDialog] = useState(false);
  const [baixaTarget, setBaixaTarget] = useState<AP | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchBaixaDialog, setBatchBaixaDialog] = useState(false);
  const [filters, setFilters] = useState<FinancialFilterValues>(emptyFilters);

  // New entry form
  const [form, setForm] = useState({
    fornecedor_id: "", descricao: "", natureza_financeira_id: "", centro_custo_id: "",
    forma_pagamento_id: "", valor_total: "", competencia: format(new Date(), "yyyy-MM"),
    data_lancamento: format(new Date(), "yyyy-MM-dd"),
    data_vencimento: "", observacao: "", parcelado: false, num_parcelas: "1", intervalo_dias: "30",
  });

  // Baixa form
  const [baixaForm, setBaixaForm] = useState({
    banco_id: "", data_baixa: format(new Date(), "yyyy-MM-dd"), juros: "0", multa: "0", desconto: "0", observacao: "",
  });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["accounts_payable", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .select("id, documento_origem, descricao, data_vencimento, data_baixa, data_lancamento, competencia, valor, valor_pago, status, juros, multa, desconto, fornecedor_id, suppliers(razao_social)")
        .order("data_vencimento", { ascending: true });
      if (error) throw error;
      return data as AP[];
    },
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers_list", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("suppliers").select("id, razao_social").order("razao_social");
      return data || [];
    },
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["banks", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("banks").select("id, nome, codigo").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  const { data: natures = [] } = useQuery({
    queryKey: ["financial_natures", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("financial_natures").select("id, codigo, descricao").eq("tipo", "ANALITICO").order("codigo");
      return data || [];
    },
  });

  const { data: costCenters = [] } = useQuery({
    queryKey: ["cost_centers", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("cost_centers").select("id, codigo, descricao").eq("tipo", "ANALITICO").order("codigo");
      return data || [];
    },
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["formas_pagamento", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("formas_pagamento").select("id, nome").eq("ativo", true).order("nome");
      return data || [];
    },
  });

  // Parcelas preview
  const parcelas = useMemo(() => {
    if (!form.data_vencimento || !form.valor_total) return [];
    const n = form.parcelado ? Math.max(1, Number(form.num_parcelas) || 1) : 1;
    const interval = Number(form.intervalo_dias) || 30;
    const valorParcela = Math.round((Number(form.valor_total) / n) * 100) / 100;
    const base = new Date(form.data_vencimento + "T12:00:00");
    return Array.from({ length: n }, (_, i) => ({
      numero: i + 1,
      data: format(addDays(base, i * interval), "yyyy-MM-dd"),
      valor: i === n - 1 ? Math.round((Number(form.valor_total) - valorParcela * (n - 1)) * 100) / 100 : valorParcela,
    }));
  }, [form.data_vencimento, form.valor_total, form.parcelado, form.num_parcelas, form.intervalo_dias]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!tenant?.id || !form.fornecedor_id || !form.valor_total) throw new Error("Preencha os campos obrigatórios");
      for (const p of parcelas) {
        const { error } = await supabase.from("accounts_payable").insert({
          tenant_id: tenant.id,
          fornecedor_id: form.fornecedor_id,
          descricao: form.descricao || null,
          natureza_financeira_id: form.natureza_financeira_id || null,
          centro_custo_id: form.centro_custo_id || null,
          forma_pagamento_id: form.forma_pagamento_id || null,
          valor: p.valor,
          competencia: form.competencia + "-01",
          data_lancamento: form.data_lancamento,
          data_emissao: format(new Date(), "yyyy-MM-dd"),
          data_vencimento: p.data,
          documento_origem: form.parcelado ? `MANUAL-P${p.numero}` : "MANUAL",
          observacao: form.observacao || null,
          created_by: user?.id,
        } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts_payable"] });
      setNewDialog(false);
      toast.success("Lançamento criado com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const baixaMut = useMutation({
    mutationFn: async (tituloId: string) => {
      const { error } = await supabase.rpc("baixar_titulo_pagar", {
        p_titulo_id: tituloId,
        p_banco_id: baixaForm.banco_id,
        p_user_id: user?.id,
        p_juros: Number(baixaForm.juros) || 0,
        p_multa: Number(baixaForm.multa) || 0,
        p_desconto: Number(baixaForm.desconto) || 0,
        p_data_baixa: baixaForm.data_baixa,
        p_observacao: baixaForm.observacao || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts_payable"] });
      setBaixaDialog(false);
      setBaixaTarget(null);
      toast.success("Baixa realizada com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const batchBaixaMut = useMutation({
    mutationFn: async () => {
      for (const id of selectedIds) {
        const { error } = await supabase.rpc("baixar_titulo_pagar", {
          p_titulo_id: id,
          p_banco_id: baixaForm.banco_id,
          p_user_id: user?.id,
          p_juros: Number(baixaForm.juros) || 0,
          p_multa: Number(baixaForm.multa) || 0,
          p_desconto: Number(baixaForm.desconto) || 0,
          p_data_baixa: baixaForm.data_baixa,
          p_observacao: baixaForm.observacao || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts_payable"] });
      setBatchBaixaDialog(false);
      setSelectedIds(new Set());
      toast.success("Baixa em lote realizada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const openBaixa = (r: AP) => {
    setBaixaTarget(r);
    setBaixaForm({ banco_id: "", data_baixa: format(new Date(), "yyyy-MM-dd"), juros: "0", multa: "0", desconto: "0", observacao: "" });
    setBaixaDialog(true);
  };

  const openBatchBaixa = () => {
    setBaixaForm({ banco_id: "", data_baixa: format(new Date(), "yyyy-MM-dd"), juros: "0", multa: "0", desconto: "0", observacao: "" });
    setBatchBaixaDialog(true);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const baixaValorFinal = baixaTarget
    ? baixaTarget.valor + Number(baixaForm.juros || 0) + Number(baixaForm.multa || 0) - Number(baixaForm.desconto || 0)
    : 0;

  const openAccounts = accounts.filter(a => a.status === "ABERTO");
  const filteredAccounts = useMemo(() => applyFinancialFilters(accounts, filters, "fornecedor_id"), [accounts, filters]);
  const selectedCount = [...selectedIds].filter(id => openAccounts.some(a => a.id === id)).length;

  const columns = [
    {
      key: "select", label: "", render: (r: AP) => r.status === "ABERTO" ? (
        <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
      ) : null,
    },
    { key: "fornecedor", label: "Fornecedor", render: (r: AP) => r.suppliers?.razao_social || "—" },
    { key: "descricao", label: "Descrição", render: (r: AP) => r.descricao || r.documento_origem || "—" },
    { key: "data_vencimento", label: "Vencimento", render: (r: AP) => format(new Date(r.data_vencimento), "dd/MM/yyyy") },
    { key: "valor", label: "Valor", render: (r: AP) => `R$ ${Number(r.valor).toFixed(2)}` },
    { key: "valor_pago", label: "Valor Pago", render: (r: AP) => r.valor_pago ? `R$ ${Number(r.valor_pago).toFixed(2)}` : "—" },
    { key: "status", label: "Status", render: (r: AP) => <Badge className={`text-2xs ${statusColors[r.status] || ""}`}>{r.status}</Badge> },
    { key: "data_baixa", label: "Baixa", render: (r: AP) => r.data_baixa ? format(new Date(r.data_baixa), "dd/MM/yyyy") : "—" },
    {
      key: "acoes", label: "Ações", render: (r: AP) => r.status === "ABERTO" ? (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openBaixa(r)}>
          <Download className="h-3 w-3 mr-1" />Baixar
        </Button>
      ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Contas a Pagar</h1>
          <p className="text-xs text-muted-foreground">Gestão de contas a pagar</p>
        </div>
        <div className="flex gap-2">
          {selectedCount > 0 && (
            <Button size="sm" variant="secondary" onClick={openBatchBaixa}>
              <Download className="h-4 w-4 mr-1" />Baixar {selectedCount} selecionados
            </Button>
          )}
          <Button size="sm" onClick={() => {
            setForm({ fornecedor_id: "", descricao: "", natureza_financeira_id: "", centro_custo_id: "", forma_pagamento_id: "", valor_total: "", competencia: format(new Date(), "yyyy-MM"), data_lancamento: format(new Date(), "yyyy-MM-dd"), data_vencimento: "", observacao: "", parcelado: false, num_parcelas: "1", intervalo_dias: "30" });
            setNewDialog(true);
          }}>
            <Plus className="h-4 w-4 mr-1" />Novo Lançamento
          </Button>
        </div>
      </div>

      <FinancialFilters
        filters={filters}
        onFiltersChange={setFilters}
        entities={suppliers.map(s => ({ id: s.id, label: s.razao_social }))}
        entityLabel="Fornecedor"
        natures={natures}
        costCenters={costCenters}
      />

      <DataTable columns={columns} data={filteredAccounts} loading={isLoading} searchPlaceholder="Buscar por fornecedor ou descrição..."
        filterFn={(r, s) => (r.suppliers?.razao_social || "").toLowerCase().includes(s) || (r.descricao || r.documento_origem || "").toLowerCase().includes(s)} />

      {/* New Entry Dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Lançamento Manual</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Fornecedor *</Label>
              <Select value={form.fornecedor_id} onValueChange={v => setForm(p => ({ ...p, fornecedor_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.razao_social}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Descrição</Label><Input value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Natureza Financeira</Label>
                <Select value={form.natureza_financeira_id} onValueChange={v => setForm(p => ({ ...p, natureza_financeira_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.id}>{n.codigo} - {n.descricao}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Centro de Custo</Label>
                <Select value={form.centro_custo_id} onValueChange={v => setForm(p => ({ ...p, centro_custo_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.descricao}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Forma de Pagamento</Label>
                <Select value={form.forma_pagamento_id} onValueChange={v => setForm(p => ({ ...p, forma_pagamento_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{paymentMethods.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Valor Total *</Label><Input type="number" step="0.01" value={form.valor_total} onChange={e => setForm(p => ({ ...p, valor_total: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Data Lançamento *</Label><Input type="date" value={form.data_lancamento} onChange={e => setForm(p => ({ ...p, data_lancamento: e.target.value }))} /></div>
              <div><Label className="text-xs">Competência (MM/AAAA) *</Label><Input type="month" value={form.competencia} onChange={e => setForm(p => ({ ...p, competencia: e.target.value }))} /></div>
              <div><Label className="text-xs">Data 1º Vencimento *</Label><Input type="date" value={form.data_vencimento} onChange={e => setForm(p => ({ ...p, data_vencimento: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={form.parcelado} onCheckedChange={v => setForm(p => ({ ...p, parcelado: !!v }))} id="parcelado" />
              <Label htmlFor="parcelado" className="text-xs">Parcelado</Label>
            </div>
            {form.parcelado && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Nº Parcelas</Label><Input type="number" min="2" value={form.num_parcelas} onChange={e => setForm(p => ({ ...p, num_parcelas: e.target.value }))} /></div>
                <div><Label className="text-xs">Intervalo (dias)</Label><Input type="number" min="1" value={form.intervalo_dias} onChange={e => setForm(p => ({ ...p, intervalo_dias: e.target.value }))} /></div>
              </div>
            )}
            {parcelas.length > 0 && (
              <div className="border rounded p-2 space-y-1 max-h-40 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground">Parcelas</p>
                {parcelas.map(p => (
                  <div key={p.numero} className="flex justify-between text-xs">
                    <span>P{p.numero} - {format(new Date(p.data + "T12:00:00"), "dd/MM/yyyy")}</span>
                    <span>R$ {p.valor.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
            <div><Label className="text-xs">Observação</Label><Textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate()} disabled={!form.fornecedor_id || !form.valor_total || !form.data_vencimento || createMut.isPending}>
              {createMut.isPending ? "Salvando..." : `Criar ${parcelas.length} título(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Baixa Dialog */}
      <Dialog open={baixaDialog} onOpenChange={setBaixaDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Baixar Título</DialogTitle></DialogHeader>
          {baixaTarget && (
            <div className="grid gap-3">
              <div className="bg-muted p-3 rounded text-xs space-y-1">
                <p><span className="font-medium">Fornecedor:</span> {baixaTarget.suppliers?.razao_social}</p>
                <p><span className="font-medium">Valor Original:</span> R$ {Number(baixaTarget.valor).toFixed(2)}</p>
                <p><span className="font-medium">Vencimento:</span> {format(new Date(baixaTarget.data_vencimento), "dd/MM/yyyy")}</p>
              </div>
              <div>
                <Label className="text-xs">Banco *</Label>
                <Select value={baixaForm.banco_id} onValueChange={v => setBaixaForm(p => ({ ...p, banco_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                  <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.codigo} - {b.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Data da Baixa</Label><Input type="date" value={baixaForm.data_baixa} onChange={e => setBaixaForm(p => ({ ...p, data_baixa: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Juros</Label><Input type="number" step="0.01" value={baixaForm.juros} onChange={e => setBaixaForm(p => ({ ...p, juros: e.target.value }))} /></div>
                <div><Label className="text-xs">Multa</Label><Input type="number" step="0.01" value={baixaForm.multa} onChange={e => setBaixaForm(p => ({ ...p, multa: e.target.value }))} /></div>
                <div><Label className="text-xs">Desconto</Label><Input type="number" step="0.01" value={baixaForm.desconto} onChange={e => setBaixaForm(p => ({ ...p, desconto: e.target.value }))} /></div>
              </div>
              <div className="bg-primary/5 p-3 rounded text-sm font-semibold text-center">
                Valor Final: R$ {baixaValorFinal.toFixed(2)}
              </div>
              <div><Label className="text-xs">Observação</Label><Textarea value={baixaForm.observacao} onChange={e => setBaixaForm(p => ({ ...p, observacao: e.target.value }))} rows={2} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaDialog(false)}>Cancelar</Button>
            <Button onClick={() => baixaTarget && baixaMut.mutate(baixaTarget.id)} disabled={!baixaForm.banco_id || baixaMut.isPending}>
              {baixaMut.isPending ? "Processando..." : "Confirmar Baixa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Baixa Dialog */}
      <Dialog open={batchBaixaDialog} onOpenChange={setBatchBaixaDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Baixa em Lote ({selectedCount} títulos)</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Banco *</Label>
              <Select value={baixaForm.banco_id} onValueChange={v => setBaixaForm(p => ({ ...p, banco_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
                <SelectContent>{banks.map(b => <SelectItem key={b.id} value={b.id}>{b.codigo} - {b.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Data da Baixa</Label><Input type="date" value={baixaForm.data_baixa} onChange={e => setBaixaForm(p => ({ ...p, data_baixa: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label className="text-xs">Juros (cada)</Label><Input type="number" step="0.01" value={baixaForm.juros} onChange={e => setBaixaForm(p => ({ ...p, juros: e.target.value }))} /></div>
              <div><Label className="text-xs">Multa (cada)</Label><Input type="number" step="0.01" value={baixaForm.multa} onChange={e => setBaixaForm(p => ({ ...p, multa: e.target.value }))} /></div>
              <div><Label className="text-xs">Desconto (cada)</Label><Input type="number" step="0.01" value={baixaForm.desconto} onChange={e => setBaixaForm(p => ({ ...p, desconto: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Observação</Label><Textarea value={baixaForm.observacao} onChange={e => setBaixaForm(p => ({ ...p, observacao: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchBaixaDialog(false)}>Cancelar</Button>
            <Button onClick={() => batchBaixaMut.mutate()} disabled={!baixaForm.banco_id || batchBaixaMut.isPending}>
              {batchBaixaMut.isPending ? "Processando..." : `Baixar ${selectedCount} títulos`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
