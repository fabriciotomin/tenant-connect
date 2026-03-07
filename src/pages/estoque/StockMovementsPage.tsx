import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, parseISO } from "date-fns";
import { formatDateTimeBR } from "@/lib/dateUtils";
import { RefreshCw, Filter, X } from "lucide-react";
import { toast } from "sonner";

interface StockMovement {
  id: string;
  tipo: string;
  quantidade: number;
  custo_unitario: number;
  documento_origem: string | null;
  created_at: string;
  natureza_financeira_id: string | null;
  centro_custo_id: string | null;
  item_id: string;
  items?: { codigo: string; descricao: string; unidade_medida: string | null; tipo_item: string | null; custo_medio: number | null; category_id: string | null } | null;
  financial_natures?: { codigo: string; descricao: string } | null;
  cost_centers?: { codigo: string; descricao: string } | null;
}

const tipoColors: Record<string, string> = {
  ENTRADA: "bg-green-100 text-green-800",
  SAIDA: "bg-red-100 text-red-800",
  AJUSTE: "bg-yellow-100 text-yellow-800",
};

export default function StockMovementsPage() {
  const { tenant } = useTenant();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterDataInicio, setFilterDataInicio] = useState("");
  const [filterDataFim, setFilterDataFim] = useState("");
  const [filterCodigoItem, setFilterCodigoItem] = useState("");
  const [filterDescricaoItem, setFilterDescricaoItem] = useState("");
  const [filterGrupoItem, setFilterGrupoItem] = useState("all");
  const [filterNatureza, setFilterNatureza] = useState("all");

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock_movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, tipo, quantidade, custo_unitario, documento_origem, created_at, natureza_financeira_id, centro_custo_id, item_id, items(codigo, descricao, unidade_medida, tipo_item, custo_medio, category_id), financial_natures(codigo, descricao), cost_centers(codigo, descricao)")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as StockMovement[];
    },
  });

  const { data: itemGroups = [] } = useQuery({
    queryKey: ["item_categories_filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_categories")
        .select("id, nome")
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: financialNatures = [] } = useQuery({
    queryKey: ["financial_natures_filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_natures")
        .select("id, codigo, descricao")
        .is("deleted_at", null)
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const recalcMutation = useMutation({
    mutationFn: async () => {
      if (!tenant?.id) throw new Error("Tenant não identificado");
      const { error } = await supabase.rpc("recalc_inbound_costs", { _tenant_id: tenant.id });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Custos recalculados com sucesso"),
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  function getCustoUnitario(r: StockMovement): number {
    if (r.items?.tipo_item === "SERVICO") return r.items.custo_medio || 0;
    return r.custo_unitario || 0;
  }

  const hasActiveFilters = filterDataInicio || filterDataFim || filterCodigoItem || filterDescricaoItem || filterGrupoItem !== "all" || filterNatureza !== "all";

  function clearFilters() {
    setFilterDataInicio("");
    setFilterDataFim("");
    setFilterCodigoItem("");
    setFilterDescricaoItem("");
    setFilterGrupoItem("all");
    setFilterNatureza("all");
  }

  // Apply advanced filters
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      if (filterDataInicio) {
        const movDate = m.created_at.substring(0, 10);
        if (movDate < filterDataInicio) return false;
      }
      if (filterDataFim) {
        const movDate = m.created_at.substring(0, 10);
        if (movDate > filterDataFim) return false;
      }
      if (filterCodigoItem) {
        if (!(m.items?.codigo || "").toLowerCase().includes(filterCodigoItem.toLowerCase())) return false;
      }
      if (filterDescricaoItem) {
        if (!(m.items?.descricao || "").toLowerCase().includes(filterDescricaoItem.toLowerCase())) return false;
      }
      if (filterGrupoItem !== "all") {
        if (m.items?.category_id !== filterGrupoItem) return false;
      }
      if (filterNatureza !== "all") {
        if (m.natureza_financeira_id !== filterNatureza) return false;
      }
      return true;
    });
  }, [movements, filterDataInicio, filterDataFim, filterCodigoItem, filterDescricaoItem, filterGrupoItem, filterNatureza]);

  // Compute running balance PER ITEM (oldest first), then map each movement id to its balance
  const balanceMap = useMemo(() => {
    const map = new Map<string, number>();
    // Group by item_id
    const byItem = new Map<string, StockMovement[]>();
    for (const m of filteredMovements) {
      const key = m.item_id;
      if (!byItem.has(key)) byItem.set(key, []);
      byItem.get(key)!.push(m);
    }
    // For each item, sort chronologically and compute running balance
    for (const [, items] of byItem) {
      items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      let balance = 0;
      for (const m of items) {
        const qty = Number(m.quantidade);
        if (m.tipo === "ENTRADA" || m.tipo === "AJUSTE") {
          balance += qty;
        } else {
          balance -= qty;
        }
        map.set(m.id, balance);
      }
    }
    return map;
  }, [filteredMovements]);

  const columns = [
    { key: "created_at", label: "Data", render: (r: StockMovement) => formatDateTimeBR(r.created_at) },
    { key: "item", label: "Item", render: (r: StockMovement) => r.items ? `${r.items.codigo} - ${r.items.descricao}` : "—" },
    { key: "tipo", label: "Tipo", render: (r: StockMovement) => <Badge className={`text-2xs ${tipoColors[r.tipo] || ""}`}>{r.tipo}</Badge> },
    { key: "quantidade", label: "Qtd", render: (r: StockMovement) => {
      const qty = Number(r.quantidade);
      const isEntrada = r.tipo === "ENTRADA" || r.tipo === "AJUSTE";
      return (
        <span className={isEntrada ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
          {isEntrada ? `+${qty.toFixed(2)}` : `-${qty.toFixed(2)}`}
        </span>
      );
    }},
    { key: "unidade_medida", label: "U.M.", render: (r: StockMovement) => r.items?.unidade_medida || "UN" },
    { key: "saldo", label: "Saldo", render: (r: StockMovement) => {
      const saldo = balanceMap.get(r.id) ?? 0;
      return <span className="font-semibold">{saldo.toFixed(2)}</span>;
    }},
    { key: "custo_unitario", label: "Custo Unit.", render: (r: StockMovement) => `R$ ${getCustoUnitario(r).toFixed(2)}` },
    { key: "custo_total", label: "Custo Total", render: (r: StockMovement) => `R$ ${(getCustoUnitario(r) * Number(r.quantidade)).toFixed(2)}` },
    { key: "natureza", label: "Nat. Financeira", render: (r: StockMovement) => r.financial_natures ? `${r.financial_natures.codigo} - ${r.financial_natures.descricao}` : "—" },
    { key: "centro_custo", label: "Centro Custo", render: (r: StockMovement) => r.cost_centers ? `${r.cost_centers.codigo} - ${r.cost_centers.descricao}` : "—" },
    { key: "documento_origem", label: "Documento", render: (r: StockMovement) => r.documento_origem || "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Movimentações de Estoque</h1>
          <p className="text-xs text-muted-foreground">Histórico de entradas e saídas com custos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            <Filter className="h-3.5 w-3.5" />
            Filtros
            {hasActiveFilters && (
              <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-primary text-primary-foreground rounded-full">
                !
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => recalcMutation.mutate()}
            disabled={recalcMutation.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${recalcMutation.isPending ? "animate-spin" : ""}`} />
            Recalcular Custos
          </Button>
        </div>
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <CollapsibleContent>
          <div className="rounded-md border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Filtros Avançados</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={clearFilters}>
                  <X className="h-3 w-3" />
                  Limpar
                </Button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data Inicial</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={filterDataInicio}
                  onChange={(e) => setFilterDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Final</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={filterDataFim}
                  onChange={(e) => setFilterDataFim(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Código do Item</Label>
                <Input
                  placeholder="Ex: 001"
                  className="h-8 text-xs"
                  value={filterCodigoItem}
                  onChange={(e) => setFilterCodigoItem(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Descrição do Item</Label>
                <Input
                  placeholder="Ex: Parafuso"
                  className="h-8 text-xs"
                  value={filterDescricaoItem}
                  onChange={(e) => setFilterDescricaoItem(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Grupo do Item</Label>
                <Select value={filterGrupoItem} onValueChange={setFilterGrupoItem}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {itemGroups.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Nat. Financeira</Label>
                <Select value={filterNatureza} onValueChange={setFilterNatureza}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {financialNatures.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.codigo} - {n.descricao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <DataTable
        columns={columns}
        data={filteredMovements}
        loading={isLoading}
        searchPlaceholder="Buscar por código, descrição ou tipo..."
        filterFn={(r, s) =>
          (r.items?.codigo || "").toLowerCase().includes(s) ||
          (r.items?.descricao || "").toLowerCase().includes(s) ||
          r.tipo.toLowerCase().includes(s)
        }
      />
    </div>
  );
}
