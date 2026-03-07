import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { useFinancialClassification } from "@/hooks/useFinancialClassification";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { formatDateBR } from "@/lib/dateUtils";
import { Search, ArrowDownCircle, ArrowUpCircle, Plus } from "lucide-react";

interface Bank {
  id: string;
  codigo: string;
  nome: string;
  saldo_inicial: number;
}

interface Movement {
  id: string;
  data: string;
  tipo: string;
  valor: number;
  referencia: string | null;
  natureza_financeira_id: string | null;
  centro_custo_id: string | null;
  financial_natures?: { codigo: string; descricao: string } | null;
  cost_centers?: { codigo: string; descricao: string } | null;
}

export default function BankStatementPage() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { natures, costCenters } = useFinancialClassification();
  const [selectedBank, setSelectedBank] = useState<string>("");
  const [dataInicial, setDataInicial] = useState("");
  const [dataFinal, setDataFinal] = useState("");
  const [filterNatureza, setFilterNatureza] = useState("");
  const [filterCC, setFilterCC] = useState("");
  const [filters, setFilters] = useState<{ bankId: string; di: string; df: string }>({ bankId: "", di: "", df: "" });
  const [openNew, setOpenNew] = useState(false);
  const [newForm, setNewForm] = useState({
    tipo: "ENTRADA" as string,
    valor: "",
    data: format(new Date(), "yyyy-MM-dd"),
    referencia: "",
    natureza_financeira_id: "",
    centro_custo_id: "",
  });

  const { data: banks = [] } = useQuery({
    queryKey: ["banks_active", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banks")
        .select("id, codigo, nome, saldo_inicial")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("codigo");
      if (error) throw error;
      return data as Bank[];
    },
  });

  const selectedBankObj = banks.find(b => b.id === filters.bankId);

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["bank_movements_statement", filters],
    enabled: !!filters.bankId && !!tenant?.id,
    queryFn: async () => {
      let q = supabase
        .from("bank_movements")
        .select("id, data_movimento, tipo, valor, descricao, banco_id")
        .eq("banco_id", filters.bankId)
        .is("deleted_at", null)
        .order("data_movimento", { ascending: true })
        .order("created_at", { ascending: true });
      if (filters.di) q = q.gte("data_movimento", filters.di);
      if (filters.df) q = q.lte("data_movimento", filters.df);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map((d: any) => ({
        id: d.id,
        data: d.data_movimento,
        tipo: d.tipo,
        valor: d.valor || 0,
        referencia: d.descricao,
        natureza_financeira_id: null,
        centro_custo_id: null,
        financial_natures: null,
        cost_centers: null,
      })) as Movement[];
    },
  });

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (filterNatureza && m.natureza_financeira_id !== filterNatureza) return false;
      if (filterCC && m.centro_custo_id !== filterCC) return false;
      return true;
    });
  }, [movements, filterNatureza, filterCC]);

  const rows = useMemo(() => {
    if (!selectedBankObj) return [];
    let saldo = selectedBankObj.saldo_inicial;
    return filteredMovements.map(m => {
      if (m.tipo === "ENTRADA") saldo += m.valor;
      else saldo -= m.valor;
      return { ...m, saldo };
    });
  }, [filteredMovements, selectedBankObj]);

  const createMut = useMutation({
    mutationFn: async () => {
      if (!tenant?.id || !filters.bankId || !newForm.valor) throw new Error("Preencha os campos obrigatórios");
      const { error } = await supabase.from("bank_movements").insert({
        tenant_id: tenant.id,
        banco_id: filters.bankId,
        tipo: newForm.tipo,
        valor: parseFloat(newForm.valor),
        data_movimento: newForm.data,
        descricao: newForm.referencia || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_movements_statement"] });
      setOpenNew(false);
      setNewForm({ tipo: "ENTRADA", valor: "", data: format(new Date(), "yyyy-MM-dd"), referencia: "", natureza_financeira_id: "", centro_custo_id: "" });
      toast.success("Movimentação registrada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleFilter = () => {
    setFilters({ bankId: selectedBank, di: dataInicial, df: dataFinal });
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Movimentação Bancária</h1>
          <p className="text-xs text-muted-foreground">Extrato de movimentações por conta bancária</p>
        </div>
        {filters.bankId && (
          <Button size="sm" onClick={() => setOpenNew(true)}>
            <Plus className="h-4 w-4 mr-1" />Nova Movimentação
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 p-3 border rounded-lg bg-muted/30">
        <div className="w-56">
          <Label className="text-xs">Banco *</Label>
          <Select value={selectedBank} onValueChange={setSelectedBank}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione o banco" /></SelectTrigger>
            <SelectContent>
              {banks.map(b => (
                <SelectItem key={b.id} value={b.id} className="text-xs">{b.codigo} - {b.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-36">
          <Label className="text-xs">Data Inicial</Label>
          <Input type="date" className="h-8 text-xs" value={dataInicial} onChange={e => setDataInicial(e.target.value)} />
        </div>
        <div className="w-36">
          <Label className="text-xs">Data Final</Label>
          <Input type="date" className="h-8 text-xs" value={dataFinal} onChange={e => setDataFinal(e.target.value)} />
        </div>
        <div className="w-48">
          <Label className="text-xs">Natureza Financeira</Label>
          <Select value={filterNatureza} onValueChange={setFilterNatureza}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todas" /></SelectTrigger>
            <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.id} className="text-xs">{n.codigo} - {n.descricao}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Label className="text-xs">Centro de Custo</Label>
          <Select value={filterCC} onValueChange={setFilterCC}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.codigo} - {c.descricao}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={handleFilter} disabled={!selectedBank}>
          <Search className="h-3.5 w-3.5 mr-1" />Filtrar
        </Button>
      </div>

      {filters.bankId && selectedBankObj && (
        <div className="flex items-center gap-4 text-xs p-2 border rounded bg-muted/20">
          <span className="font-medium">{selectedBankObj.codigo} - {selectedBankObj.nome}</span>
          <span className="text-muted-foreground">Saldo inicial: {fmt(selectedBankObj.saldo_inicial)}</span>
          {rows.length > 0 && (
            <span className="ml-auto font-semibold">
              Saldo atual: {fmt(rows[rows.length - 1].saldo)}
            </span>
          )}
        </div>
      )}

      {filters.bankId ? (
        isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhuma movimentação encontrada no período.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="text-xs w-24">Data</TableHead>
                  <TableHead className="text-xs w-24">Tipo</TableHead>
                  <TableHead className="text-xs">Referência</TableHead>
                  <TableHead className="text-xs">Natureza</TableHead>
                  <TableHead className="text-xs">Centro Custo</TableHead>
                  <TableHead className="text-xs text-right w-36">Valor</TableHead>
                  <TableHead className="text-xs text-right w-36">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, idx) => {
                  const isEntrada = r.tipo === "ENTRADA";
                  const valorDisplay = isEntrada ? r.valor : -r.valor;
                  return (
                    <TableRow key={r.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <TableCell className="text-xs font-mono">{formatDateBR(r.data)}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5">
                          {isEntrada ? (
                            <ArrowDownCircle className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <ArrowUpCircle className="h-3.5 w-3.5 text-red-600" />
                          )}
                          <Badge variant="outline" className={`text-2xs ${isEntrada ? "border-green-300 text-green-700" : "border-red-300 text-red-700"}`}>
                            {isEntrada ? "Entrada" : "Saída"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.referencia || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.financial_natures ? `${r.financial_natures.codigo} - ${r.financial_natures.descricao}` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.cost_centers ? `${r.cost_centers.codigo} - ${r.cost_centers.descricao}` : "—"}
                      </TableCell>
                      <TableCell className={`text-xs text-right font-mono font-semibold ${isEntrada ? "text-green-700" : "text-red-700"}`}>
                        {fmt(valorDisplay)}
                      </TableCell>
                      <TableCell className={`text-xs text-right font-mono font-bold ${r.saldo >= 0 ? "text-foreground" : "text-red-700"}`}>
                        {fmt(r.saldo)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <p className="text-xs text-muted-foreground text-center py-8">Selecione um banco e clique em Filtrar para visualizar o extrato.</p>
      )}

      {/* New Movement Dialog */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nova Movimentação Manual</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Tipo *</Label>
              <Select value={newForm.tipo} onValueChange={v => setNewForm(p => ({ ...p, tipo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ENTRADA">Entrada</SelectItem>
                  <SelectItem value="SAIDA">Saída</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Valor *</Label>
                <Input type="number" step="0.01" value={newForm.valor} onChange={e => setNewForm(p => ({ ...p, valor: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Data *</Label>
                <Input type="date" value={newForm.data} onChange={e => setNewForm(p => ({ ...p, data: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Referência</Label>
              <Input value={newForm.referencia} onChange={e => setNewForm(p => ({ ...p, referencia: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Natureza Financeira</Label>
                <Select value={newForm.natureza_financeira_id} onValueChange={v => setNewForm(p => ({ ...p, natureza_financeira_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{natures.map(n => <SelectItem key={n.id} value={n.id}>{n.codigo} - {n.descricao}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Centro de Custo</Label>
                <Select value={newForm.centro_custo_id} onValueChange={v => setNewForm(p => ({ ...p, centro_custo_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{costCenters.map(c => <SelectItem key={c.id} value={c.id}>{c.codigo} - {c.descricao}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNew(false)}>Cancelar</Button>
            <Button onClick={() => createMut.mutate()} disabled={!newForm.valor || createMut.isPending}>
              {createMut.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
