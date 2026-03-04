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
  codigo_pai: string | null;
  ordem: number;
}

function buildTree(items: FN[], parentId: string | null = null): (FN & { children: any[] })[] {
  return items
    .filter(i => i.codigo_pai === parentId)
    .sort((a, b) => a.ordem - b.ordem || a.codigo.localeCompare(b.codigo))
    .map(i => ({ ...i, children: buildTree(items, i.id) }));
}

function getAnalyticIds(node: FN & { children: any[] }): string[] {
  if (node.tipo === "ANALITICO") return [node.id];
  return node.children.flatMap((c: any) => getAnalyticIds(c));
}

export default function DREPage() {
  const { tenant } = useTenant();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));
  const [centroCusto, setCentroCusto] = useState("todos");
  const [visao, setVisao] = useState<"competencia" | "caixa">("competencia");

  const startDate = `${year}-${month.padStart(2, "0")}-01`;
  const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];

  // Naturezas financeiras (tree)
  const { data: natures = [] } = useQuery({
    queryKey: ["dre_natures", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_natures")
        .select("id, codigo, descricao, tipo, tipo_natureza, codigo_pai, ordem")
        .eq("ativo", true)
        .order("ordem");
      if (error) throw error;
      return data as FN[];
    },
  });

  // Cost centers for filter
  const { data: costCenters = [] } = useQuery({
    queryKey: ["dre_cost_centers", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data } = await supabase.from("cost_centers").select("id, codigo, descricao").eq("tipo", "ANALITICO").order("codigo");
      return data || [];
    },
  });

  // ==================== RECEITA ====================
  // From outbound_documents PROCESSADO -> outbound_document_items
  // Grouped by natureza_financeira_id (sale nature from items on the doc)
  const { data: receitaData = [] } = useQuery({
    queryKey: ["dre_receita", startDate, endDate, tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("outbound_document_items")
        .select(`
          quantidade, valor_unitario, impostos,
          natureza_financeira_id, centro_custo_id,
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

  // ==================== CMV PRODUTOS ====================
  // From stock_movements SAIDA joined with items for nature/CC
  const { data: cmvProdutoData = [] } = useQuery({
    queryKey: ["dre_cmv_produto", startDate, endDate, tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          quantidade, custo_unitario,
          items!inner(natureza_financeira_id, centro_custo_id, tipo_item)
        `)
        .eq("tipo", "SAIDA")
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`);
      if (error) throw error;
      return data || [];
    },
  });

  // CMV Serviço is now calculated directly from receitaData + itemsMap (no separate query needed)

  // Items lookup for service cost
  const { data: itemsMap = {} } = useQuery({
    queryKey: ["dre_items_map", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("id, tipo_item, custo_servico, natureza_venda_id, centro_custo_venda_id");
      if (error) throw error;
      const map: Record<string, { tipo_item: string; custo_servico: number; natureza_venda_id: string | null; centro_custo_venda_id: string | null }> = {};
      (data || []).forEach(i => { map[i.id] = i; });
      return map;
    },
  });

  // ==================== DESPESAS ====================
  const { data: despesaData = [] } = useQuery({
    queryKey: ["dre_despesas", startDate, endDate, tenant?.id, visao],
    enabled: !!tenant?.id,
    queryFn: async () => {
      let q = supabase
        .from("accounts_payable")
        .select("valor, juros, multa, desconto, status, natureza_financeira_id, centro_custo_id, competencia, data_baixa")
        .neq("status", "CANCELADO");

      if (visao === "caixa") {
        q = q.eq("status", "PAGO")
          .gte("data_baixa", startDate)
          .lte("data_baixa", endDate);
      } else {
        q = q.gte("competencia", startDate)
          .lte("competencia", endDate);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Build value map: nature_id -> total value
  const valueMap = useMemo(() => {
    const map: Record<string, number> = {};

    // --- RECEITA (products + services from outbound_document_items) ---
    receitaData.forEach((docItem: any) => {
      const itemInfo = itemsMap[docItem.item_id];
      const isServico = itemInfo?.tipo_item === "SERVICO";

      // For services: use item master's sale nature/cc; for products: use doc item's
      const natureId = isServico
        ? (itemInfo?.natureza_venda_id || docItem.natureza_financeira_id)
        : docItem.natureza_financeira_id;
      const ccId = isServico
        ? (itemInfo?.centro_custo_venda_id || docItem.centro_custo_id)
        : docItem.centro_custo_id;

      if (centroCusto !== "todos" && ccId !== centroCusto) return;
      if (!natureId) return;
      const valorItem = Number(docItem.quantidade) * Number(docItem.valor_unitario);
      map[natureId] = (map[natureId] || 0) + valorItem;
    });

    // --- CMV PRODUTOS (negative = cost from stock_movements SAIDA) ---
    cmvProdutoData.forEach((mov: any) => {
      const item = mov.items;
      if (!item) return;
      if (centroCusto !== "todos" && item.centro_custo_id !== centroCusto) return;
      const natureId = item.natureza_financeira_id;
      if (!natureId) return;
      const custo = Number(mov.quantidade) * Number(mov.custo_unitario);
      map[natureId] = (map[natureId] || 0) - custo;
    });

    // --- CMV SERVIÇO (negative = quantidade * custo_servico from item master) ---
    receitaData.forEach((docItem: any) => {
      const itemInfo = itemsMap[docItem.item_id];
      if (!itemInfo || itemInfo.tipo_item !== "SERVICO") return;
      const natureId = itemInfo.natureza_venda_id || docItem.natureza_financeira_id;
      const ccId = itemInfo.centro_custo_venda_id || docItem.centro_custo_id;
      if (centroCusto !== "todos" && ccId !== centroCusto) return;
      if (!natureId) return;
      const custo = Number(docItem.quantidade) * Number(itemInfo.custo_servico || 0);
      map[natureId] = (map[natureId] || 0) - custo;
    });

    // --- DESPESAS (negative) ---
    despesaData.forEach((t: any) => {
      if (centroCusto !== "todos" && t.centro_custo_id !== centroCusto) return;
      const natureId = t.natureza_financeira_id;
      if (!natureId) return;
      const valorFinal = Number(t.valor) + Number(t.juros || 0) + Number(t.multa || 0) - Number(t.desconto || 0);
      map[natureId] = (map[natureId] || 0) - valorFinal;
    });

    return map;
  }, [receitaData, cmvProdutoData, despesaData, itemsMap, centroCusto, visao]);

  const tree = useMemo(() => buildTree(natures), [natures]);

  function getNodeTotal(node: FN & { children: any[] }): number {
    const ids = getAnalyticIds(node);
    return ids.reduce((sum, id) => sum + (valueMap[id] || 0), 0);
  }

  const fmt = (v: number) => `R$ ${Math.abs(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  const totalReceitas = useMemo(() => {
    const recNodes = tree.filter(n => n.tipo_natureza === "RECEITA");
    return recNodes.reduce((s, n) => s + getNodeTotal(n), 0);
  }, [tree, valueMap]);

  const totalDespesas = useMemo(() => {
    const despNodes = tree.filter(n => n.tipo_natureza === "DESPESA");
    return despNodes.reduce((s, n) => s + Math.abs(getNodeTotal(n)), 0);
  }, [tree, valueMap]);

  const resultado = totalReceitas - totalDespesas;

  function renderNode(node: FN & { children: any[] }, level: number) {
    const total = getNodeTotal(node);
    const isSintetico = node.tipo === "SINTETICO";
    const isPositive = total >= 0;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "flex justify-between py-1 text-xs",
            isSintetico && "font-semibold",
            level === 0 && "border-b border-border/50 mt-2"
          )}
          style={{ paddingLeft: `${level * 16}px` }}
        >
          <span>{node.codigo} - {node.descricao}</span>
          <span className={cn(
            isSintetico ? (isPositive ? "text-green-600" : "text-destructive") : "text-muted-foreground"
          )}>
            {total !== 0 ? (isPositive ? fmt(total) : `(${fmt(total)})`) : "—"}
          </span>
        </div>
        {node.children.map((c: any) => renderNode(c, level + 1))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">DRE – Demonstrativo de Resultados</h1>
        <p className="text-xs text-muted-foreground">Receita de documentos processados • CMV de estoque e serviços • Despesas do contas a pagar</p>
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
        <div className="space-y-1.5">
          <Label className="text-xs">Centro de Custo</Label>
          <Select value={centroCusto} onValueChange={setCentroCusto}>
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">Todos</SelectItem>
              {costCenters.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.codigo} - {c.descricao}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Visão</Label>
          <Select value={visao} onValueChange={v => setVisao(v as any)}>
            <SelectTrigger className="h-8 text-xs w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="competencia" className="text-xs">Competência</SelectItem>
              <SelectItem value="caixa" className="text-xs">Caixa (Realizado)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            DRE - {meses[parseInt(month) - 1]} / {year}
            {centroCusto !== "todos" && ` — CC: ${costCenters.find(c => c.id === centroCusto)?.descricao || ""}`}
            {visao === "caixa" && " (Caixa)"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {tree.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma natureza financeira cadastrada. Acesse Cadastros → Naturezas Financeiras para configurar.</p>
          ) : (
            <>
              {tree.map(node => renderNode(node, 0))}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-sm pt-1">
                <span>RESULTADO FINAL</span>
                <span className={resultado >= 0 ? "text-green-600" : "text-destructive"}>
                  {resultado >= 0 ? fmt(resultado) : `(${fmt(resultado)})`}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
