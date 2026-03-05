import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function DREPage() {
  const { tenant } = useTenant();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));

  const selectedYear = parseInt(year);
  const selectedMonth = parseInt(month);
  const isCurrentMonth = selectedYear === currentYear && selectedMonth === currentMonth;

  const startDate = `${year}-${String(selectedMonth).padStart(2, "0")}-01`;
  const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split("T")[0];

  // ==================== RECEITA (outbound_documents PROCESSADO) ====================
  const { data: receitaData = [] } = useQuery({
    queryKey: ["dre_receita", startDate, endDate, tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_document_items")
        .select(`
          quantidade, valor_unitario,
          item_id,
          outbound_documents!inner(status, data_emissao, tenant_id)
        `)
        .eq("outbound_documents.status", "PROCESSADO")
        .gte("outbound_documents.data_emissao", startDate)
        .lte("outbound_documents.data_emissao", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // ==================== STOCK MOVEMENTS (SAIDA) for historical cost ====================
  const { data: saidaMovements = [] } = useQuery({
    queryKey: ["dre_saida_movements", startDate, endDate, tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("item_id, quantidade, custo_unitario")
        .eq("tipo", "SAIDA")
        .is("deleted_at", null)
        .gte("created_at", startDate)
        .lte("created_at", endDate + "T23:59:59");
      if (error) throw error;
      return data || [];
    },
  });

  // ==================== ITEMS (tipo_item + custo_medio for current month) ====================
  const { data: itemsMap = {} } = useQuery({
    queryKey: ["dre_items", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id, tipo_item, custo_medio")
        .is("deleted_at", null);
      if (error) throw error;
      const map: Record<string, { tipo_item: string; custo_medio: number }> = {};
      (data || []).forEach((i: any) => {
        map[i.id] = { tipo_item: i.tipo_item || "REVENDA", custo_medio: Number(i.custo_medio || 0) };
      });
      return map;
    },
  });

  // ==================== DESPESAS ====================
  const { data: despesaData = [] } = useQuery({
    queryKey: ["dre_despesas", startDate, endDate, tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .select("valor, status")
        .neq("status", "CANCELADO")
        .is("deleted_at", null)
        .gte("data_vencimento", startDate)
        .lte("data_vencimento", endDate);
      if (error) throw error;
      return data || [];
    },
  });

  // Compute totals
  const totalReceitas = useMemo(() => {
    return receitaData.reduce((sum, item: any) => {
      return sum + Number(item.quantidade) * Number(item.valor_unitario);
    }, 0);
  }, [receitaData]);

  // Helper: get cost for an item/movement based on current vs past month
  const getItemCost = (mov: any): number => {
    if (isCurrentMonth) {
      // Current month (open): use live custo_medio from items table
      const info = itemsMap[mov.item_id];
      return info?.custo_medio ?? 0;
    }
    // Past months (closed): use historical custo_unitario locked at sale time
    return Number(mov.custo_unitario || 0);
  };

  // CMV: non-SERVICO items
  const cmv = useMemo(() => {
    return saidaMovements.reduce((sum, mov: any) => {
      const info = itemsMap[mov.item_id];
      if (!info || info.tipo_item === "SERVICO") return sum;
      return sum + getItemCost(mov) * Number(mov.quantidade);
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saidaMovements, itemsMap, isCurrentMonth]);

  // CSP: SERVICO items
  const csp = useMemo(() => {
    return saidaMovements.reduce((sum, mov: any) => {
      const info = itemsMap[mov.item_id];
      if (info?.tipo_item !== "SERVICO") return sum;
      return sum + getItemCost(mov) * Number(mov.quantidade);
    }, 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saidaMovements, itemsMap, isCurrentMonth]);

  const totalDespesas = useMemo(() => {
    return despesaData.reduce((sum, item: any) => {
      return sum + Number(item.valor);
    }, 0);
  }, [despesaData]);

  const lucroBruto = totalReceitas - cmv - csp;
  const resultado = lucroBruto - totalDespesas;

  const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const fmtSigned = (v: number) => v >= 0 ? fmt(v) : `(${fmt(v)})`;

  const costLabel = isCurrentMonth ? "(custo médio atual)" : "(custo histórico travado)";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">DRE – Demonstrativo de Resultados</h1>
        <p className="text-xs text-muted-foreground">
          Receita de documentos processados • CMV e CSP {costLabel} • Despesas do contas a pagar
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5">
          <Label className="text-xs">Mês</Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{meses.map((m, i) => <SelectItem key={i} value={String(i + 1)} className="text-xs">{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Ano</Label>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-8 text-xs w-24"><SelectValue /></SelectTrigger>
            <SelectContent>{[currentYear - 1, currentYear, currentYear + 1].map(y => <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            DRE - {meses[selectedMonth - 1]} / {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <div className="flex justify-between py-1 text-xs font-semibold border-b border-border/50 mt-2">
            <span>RECEITA BRUTA</span>
            <span className="text-green-600">{totalReceitas > 0 ? fmt(totalReceitas) : "—"}</span>
          </div>

          <div className="flex justify-between py-0.5 text-xs text-muted-foreground" style={{ paddingLeft: "16px" }}>
            <span>(-) CMV – Custo de Mercadoria Vendida</span>
            <span className="text-destructive">{cmv > 0 ? `(${fmt(cmv)})` : "—"}</span>
          </div>

          <div className="flex justify-between py-0.5 text-xs text-muted-foreground" style={{ paddingLeft: "16px" }}>
            <span>(-) CSP – Custo dos Serviços Prestados</span>
            <span className="text-destructive">{csp > 0 ? `(${fmt(csp)})` : "—"}</span>
          </div>

          <Separator className="my-1" />

          <div className="flex justify-between py-1 text-xs font-semibold">
            <span>LUCRO BRUTO</span>
            <span className={lucroBruto >= 0 ? "text-green-600" : "text-destructive"}>{fmtSigned(lucroBruto)}</span>
          </div>

          <div className="flex justify-between py-1 text-xs font-semibold border-b border-border/50 mt-2">
            <span>DESPESAS OPERACIONAIS</span>
            <span className="text-destructive">{totalDespesas > 0 ? `(${fmt(totalDespesas)})` : "—"}</span>
          </div>
          <div className="flex justify-between py-0.5 text-xs text-muted-foreground" style={{ paddingLeft: "16px" }}>
            <span>Contas a pagar (exceto cancelados)</span>
            <span className="text-destructive">{totalDespesas > 0 ? `(${fmt(totalDespesas)})` : "—"}</span>
          </div>

          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-sm pt-1">
            <span>RESULTADO FINAL</span>
            <span className={resultado >= 0 ? "text-green-600" : "text-destructive"}>
              {fmtSigned(resultado)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
