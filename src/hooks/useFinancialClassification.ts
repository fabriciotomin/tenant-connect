import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";

export function useFinancialClassification() {
  const { tenant } = useTenant();

  const { data: natures = [] } = useQuery({
    queryKey: ["financial_natures_analytic", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_natures")
        .select("id, codigo, descricao")
        .eq("tipo", "ANALITICO")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const { data: costCenters = [] } = useQuery({
    queryKey: ["cost_centers_analytic", tenant?.id],
    enabled: !!tenant?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cost_centers")
        .select("id, codigo, descricao")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  return { natures, costCenters };
}
