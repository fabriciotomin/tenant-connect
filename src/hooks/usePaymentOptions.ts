import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePaymentOptions() {
  const { data: paymentConditions = [] } = useQuery({
    queryKey: ["payment_conditions_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_conditions")
        .select("id, descricao, numero_parcelas, dias_entre_parcelas")
        .is("deleted_at", null)
        .order("descricao");
      if (error) throw error;
      return data;
    },
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["formas_pagamento_active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formas_pagamento")
        .select("id, nome")
        .eq("ativo", true)
        .is("deleted_at", null)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  return { paymentConditions, paymentMethods };
}
