import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const prevTenantId = useRef<string | null>(null);

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

      // Use SECURITY DEFINER RPC to resolve tenant by slug
      // This works for both anon and authenticated users without opening RLS
      const { data: rpcData, error: rpcError } = await supabase
        .rpc("resolve_tenant_by_slug", { _slug: slug });

      const data = rpcData && rpcData.length > 0 ? rpcData[0] : null;
      const error = rpcError;

      if (error || !data) {
        setTenantError("Empresa não encontrada ou inativa.");
        setTenant(null);
        setTenantLoading(false);
        return;
      }

      // CRITICAL: Sync profile.tenant_id BEFORE setting tenant state
      // This ensures RLS get_tenant_id() returns the correct tenant
      // before any queries fire
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

      // CRITICAL: Clear ALL cached queries when switching tenants
      // This prevents stale data from a previous tenant from showing
      if (prevTenantId.current && prevTenantId.current !== data.id) {
        queryClient.clear();
      }
      prevTenantId.current = data.id;

      setTenant(data as Empresa);
      setTenantLoading(false);
    };

    fetchTenant();
  }, [slug, queryClient]);

  return (
    <TenantContext.Provider value={{ tenant, tenantLoading, tenantError, slug }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}
