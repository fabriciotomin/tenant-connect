import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Empresa {
  id: string;
  slug: string;
  razao_social: string;
  nome_fantasia: string | null;
  status: string;
  plano: string;
}

interface TenantContextType {
  tenant: Empresa | null;
  tenantLoading: boolean;
  tenantError: string | null;
  slug: string | undefined;
}

const TenantContext = createContext<TenantContextType>({
  tenant: null,
  tenantLoading: false,
  tenantError: null,
  slug: undefined,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const [tenant, setTenant] = useState<Empresa | null>(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setTenant(null);
      setTenantLoading(false);
      setTenantError(null);
      return;
    }

    const fetchTenant = async () => {
      setTenantLoading(true);
      setTenantError(null);

      const { data, error } = await supabase
        .from("empresas")
        .select("id, slug, razao_social, nome_fantasia, status, plano")
        .eq("slug", slug)
        .eq("status", "ativo")
        .single();

      if (error || !data) {
        setTenantError("Empresa não encontrada ou inativa.");
        setTenant(null);
      } else {
        setTenant(data as Empresa);

        // Sync profile.tenant_id for RLS alignment
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await supabase
              .from("profiles")
              .update({ tenant_id: data.id })
              .eq("auth_id", session.user.id);
          }
        } catch (e) {
          console.warn("profile tenant sync:", e);
        }
      }
      setTenantLoading(false);
    };

    fetchTenant();
  }, [slug]);

  return (
    <TenantContext.Provider value={{ tenant, tenantLoading, tenantError, slug }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
