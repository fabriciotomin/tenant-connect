import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface FN {
  id: string;
  codigo: string;
  descricao: string;
  tipo: string;
  tipo_natureza: string;
  ordem: number;
}

export default function DREPage() {
  const { tenant } = useTenant();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));

  const startDate = `${year}-${month.padStart(2, "0")}-01`;
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];

  // Naturezas financeiras (flat list - no tree since codigo_pai doesn't exist)
  const { data: natures = [] } = useQuery({
    queryKey: ["dre_natures", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_natures")
        .select("id, codigo, descricao, tipo, tipo_natureza, ordem")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as FN[];
    },
  });

  // ==================== RECEITA ====================
  // From outbound_documents PROCESSADO -> outbound_document_items
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

  // ==================== DESPESAS ====================
  const { data: despesaData = [] } = useQuery({
    queryKey: ["dre_despesas", startDate, endDate, tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("accounts_payable")
        .select("valor, status")
        .neq("status", "CANCELADO")
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

  const totalDespesas = useMemo(() => {
    return despesaData.reduce((sum, item: any) => {
      return sum + Number(item.valor);
    }, 0);
  }, [despesaData]);

  const resultado = totalReceitas - totalDespesas;

  const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  // Group natures by tipo_natureza for display
  const receitaNatures = natures.filter(n => n.tipo_natureza === "RECEITA");
  const despesaNatures = natures.filter(n => n.tipo_natureza === "DESPESA");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">DRE – Demonstrativo de Resultados</h1>
        <p className="text-xs text-muted-foreground">Receita de documentos processados • Despesas do contas a pagar</p>
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
            DRE - {meses[parseInt(month) - 1]} / {year}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {/* RECEITAS */}
          <div className="flex justify-between py-1 text-xs font-semibold border-b border-border/50 mt-2">
            <span>RECEITAS</span>
            <span className="text-green-600">{totalReceitas > 0 ? fmt(totalReceitas) : "—"}</span>
          </div>
          {receitaNatures.map(n => (
            <div key={n.id} className="flex justify-between py-0.5 text-xs text-muted-foreground" style={{ paddingLeft: "16px" }}>
              <span>{n.codigo} - {n.descricao}</span>
              <span>—</span>
            </div>
          ))}
          {receitaNatures.length === 0 && (
            <div className="flex justify-between py-0.5 text-xs text-muted-foreground" style={{ paddingLeft: "16px" }}>
              <span>Receita total (documentos processados)</span>
              <span className="text-green-600">{totalReceitas > 0 ? fmt(totalReceitas) : "—"}</span>
            </div>
          )}

          {/* DESPESAS */}
          <div className="flex justify-between py-1 text-xs font-semibold border-b border-border/50 mt-2">
            <span>DESPESAS</span>
            <span className="text-destructive">{totalDespesas > 0 ? `(${fmt(totalDespesas)})` : "—"}</span>
          </div>
          {despesaNatures.map(n => (
            <div key={n.id} className="flex justify-between py-0.5 text-xs text-muted-foreground" style={{ paddingLeft: "16px" }}>
              <span>{n.codigo} - {n.descricao}</span>
              <span>—</span>
            </div>
          ))}
          {despesaNatures.length === 0 && (
            <div className="flex justify-between py-0.5 text-xs text-muted-foreground" style={{ paddingLeft: "16px" }}>
              <span>Despesa total (contas a pagar)</span>
              <span className="text-destructive">{totalDespesas > 0 ? `(${fmt(totalDespesas)})` : "—"}</span>
            </div>
          )}

          <Separator className="my-2" />
          <div className="flex justify-between font-bold text-sm pt-1">
            <span>RESULTADO FINAL</span>
            <span className={resultado >= 0 ? "text-green-600" : "text-destructive"}>
              {resultado >= 0 ? fmt(resultado) : `(${fmt(resultado)})`}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
