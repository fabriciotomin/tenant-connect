import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTimeBR } from "@/lib/dateUtils";
import { RefreshCw } from "lucide-react";
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
  items?: { codigo: string; descricao: string; unidade_medida: string | null; tipo_item: string | null; custo_medio: number | null } | null;
  financial_natures?: { codigo: string; descricao: string } | null;
  cost_centers?: { codigo: string; descricao: string } | null;
}

interface StockMovementWithSaldo extends StockMovement {
  saldo: number;
}

const tipoColors: Record<string, string> = {
  ENTRADA: "bg-green-100 text-green-800",
  SAIDA: "bg-red-100 text-red-800",
  AJUSTE: "bg-yellow-100 text-yellow-800",
};

export default function StockMovementsPage() {
  const { tenant } = useTenant();

  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock_movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, tipo, quantidade, custo_unitario, documento_origem, created_at, natureza_financeira_id, centro_custo_id, items(codigo, descricao, unidade_medida, tipo_item, custo_medio), financial_natures(codigo, descricao), cost_centers(codigo, descricao)")
        .is("deleted_at", null)
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) throw error;
      return data as unknown as StockMovement[];
    },
  });

  // Calculate running saldo (always chronological ascending for correctness)
  const movementsWithSaldo = useMemo(() => {
    let saldo = 0;
    return movements.map(m => {
      if (m.tipo === "ENTRADA" || m.tipo === "AJUSTE") saldo += m.quantidade;
      else saldo -= m.quantidade;
      return { ...m, saldo } as StockMovementWithSaldo;
    });
  }, [movements]);

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

  const fmt = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const columns = [
    {
      key: "created_at",
      label: "Data",
      sortable: true,
      sortValue: (r: StockMovementWithSaldo) => r.created_at || "",
      render: (r: StockMovementWithSaldo) => formatDateTimeBR(r.created_at),
    },
    { key: "item", label: "Item", render: (r: StockMovementWithSaldo) => r.items ? `${r.items.codigo} - ${r.items.descricao}` : "—" },
    { key: "tipo", label: "Tipo", render: (r: StockMovementWithSaldo) => <Badge className={`text-2xs ${tipoColors[r.tipo] || ""}`}>{r.tipo}</Badge> },
    {
      key: "quantidade",
      label: "Qtd",
      render: (r: StockMovementWithSaldo) => {
        const isEntrada = r.tipo === "ENTRADA" || r.tipo === "AJUSTE";
        return (
          <span className={isEntrada ? "text-green-700" : "text-red-700"}>
            {isEntrada ? "+" : "-"}{fmt(r.quantidade)}
          </span>
        );
      },
    },
    { key: "unidade_medida", label: "U.M.", render: (r: StockMovementWithSaldo) => r.items?.unidade_medida || "UN" },
    { key: "custo_unitario", label: "Custo Unit.", render: (r: StockMovementWithSaldo) => `R$ ${fmt(getCustoUnitario(r))}` },
    { key: "custo_total", label: "Custo Total", render: (r: StockMovementWithSaldo) => `R$ ${fmt(getCustoUnitario(r) * Number(r.quantidade))}` },
    {
      key: "saldo",
      label: "Saldo",
      render: (r: StockMovementWithSaldo) => (
        <span className={`font-mono font-semibold ${r.saldo >= 0 ? "text-foreground" : "text-red-700"}`}>
          {fmt(r.saldo)}
        </span>
      ),
    },
    { key: "natureza", label: "Nat. Financeira", render: (r: StockMovementWithSaldo) => r.financial_natures ? `${r.financial_natures.codigo} - ${r.financial_natures.descricao}` : "—" },
    { key: "centro_custo", label: "Centro Custo", render: (r: StockMovementWithSaldo) => r.cost_centers ? `${r.cost_centers.codigo} - ${r.cost_centers.descricao}` : "—" },
    { key: "documento_origem", label: "Documento", render: (r: StockMovementWithSaldo) => r.documento_origem || "—" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Movimentações de Estoque</h1>
          <p className="text-xs text-muted-foreground">Histórico de entradas e saídas com custos e saldo acumulado</p>
        </div>
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
      <DataTable
        columns={columns}
        data={movementsWithSaldo}
        loading={isLoading}
        searchPlaceholder="Buscar movimentação..."
        filterFn={(r, s) =>
          (r.items?.codigo || "").toLowerCase().includes(s) ||
          (r.items?.descricao || "").toLowerCase().includes(s) ||
          r.tipo.toLowerCase().includes(s)
        }
      />
    </div>
  );
}
