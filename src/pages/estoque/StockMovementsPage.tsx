import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
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
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as StockMovement[];
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
    // For services, use manual cost from item registration
    if (r.items?.tipo_item === "SERVICO") return r.items.custo_medio || 0;
    return r.custo_unitario || 0;
  }

  // Compute running balance (oldest first, then reverse for display)
  const sortedAsc = [...movements].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let runningBalance = 0;
  const balanceMap = new Map<string, number>();
  for (const m of sortedAsc) {
    const qty = Number(m.quantidade);
    if (m.tipo === "ENTRADA" || m.tipo === "AJUSTE") {
      runningBalance += qty;
    } else {
      runningBalance -= qty;
    }
    balanceMap.set(m.id, runningBalance);
  }

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
        data={movements}
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
