import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface StockMovement {
  id: string;
  tipo: string;
  quantidade: number;
  custo_unitario: number;
  documento_origem: string | null;
  created_at: string;
  items?: { codigo: string; descricao: string; unidade_medida: string | null; tipo_item: string | null; custo_medio: number | null } | null;
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
        .select("id, tipo, quantidade, custo_unitario, documento_origem, created_at, items(codigo, descricao, unidade_medida, tipo_item, custo_medio)")
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

  const columns = [
    { key: "created_at", label: "Data", render: (r: StockMovement) => format(new Date(r.created_at), "dd/MM/yyyy HH:mm") },
    { key: "item", label: "Item", render: (r: StockMovement) => r.items ? `${r.items.codigo} - ${r.items.descricao}` : "—" },
    { key: "tipo", label: "Tipo", render: (r: StockMovement) => <Badge className={`text-2xs ${tipoColors[r.tipo] || ""}`}>{r.tipo}</Badge> },
    { key: "quantidade", label: "Qtd", render: (r: StockMovement) => Number(r.quantidade).toFixed(2) },
    { key: "unidade_medida", label: "U.M.", render: (r: StockMovement) => r.items?.unidade_medida || "UN" },
    { key: "custo_unitario", label: "Custo Unit.", render: (r: StockMovement) => `R$ ${getCustoUnitario(r).toFixed(2)}` },
    { key: "custo_total", label: "Custo Total", render: (r: StockMovement) => `R$ ${(getCustoUnitario(r) * Number(r.quantidade)).toFixed(2)}` },
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
