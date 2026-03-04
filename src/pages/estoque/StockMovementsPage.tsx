import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface StockMovement {
  id: string;
  tipo: string;
  quantidade: number;
  custo_unitario: number;
  saldo_resultante: number;
  documento_origem: string | null;
  created_at: string;
  items?: { codigo: string; descricao: string } | null;
}

const tipoColors: Record<string, string> = {
  ENTRADA: "bg-green-100 text-green-800",
  SAIDA: "bg-red-100 text-red-800",
  AJUSTE: "bg-yellow-100 text-yellow-800",
};

export default function StockMovementsPage() {
  const { data: movements = [], isLoading } = useQuery({
    queryKey: ["stock_movements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("id, tipo, quantidade, custo_unitario, saldo_resultante, documento_origem, created_at, items(codigo, descricao)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as StockMovement[];
    },
  });

  const columns = [
    { key: "created_at", label: "Data", render: (r: StockMovement) => format(new Date(r.created_at), "dd/MM/yyyy HH:mm") },
    { key: "item", label: "Item", render: (r: StockMovement) => r.items ? `${r.items.codigo} - ${r.items.descricao}` : "—" },
    { key: "tipo", label: "Tipo", render: (r: StockMovement) => <Badge className={`text-2xs ${tipoColors[r.tipo] || ""}`}>{r.tipo}</Badge> },
    { key: "quantidade", label: "Qtd", render: (r: StockMovement) => Number(r.quantidade).toFixed(2) },
    { key: "custo_unitario", label: "Custo Unit.", render: (r: StockMovement) => `R$ ${Number(r.custo_unitario).toFixed(2)}` },
    { key: "saldo_resultante", label: "Saldo", render: (r: StockMovement) => Number(r.saldo_resultante).toFixed(2) },
    { key: "documento_origem", label: "Documento", render: (r: StockMovement) => r.documento_origem || "—" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Movimentações de Estoque</h1>
        <p className="text-xs text-muted-foreground">Kardex — extrato de movimentações</p>
      </div>

      <DataTable
        columns={columns}
        data={movements}
        loading={isLoading}
        searchPlaceholder="Buscar por item ou documento..."
        filterFn={(r, s) => (r.items?.descricao || "").toLowerCase().includes(s) || (r.documento_origem || "").toLowerCase().includes(s)}
      />
    </div>
  );
}
