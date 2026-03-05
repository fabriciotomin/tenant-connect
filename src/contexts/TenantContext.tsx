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
    // slug comes from useParams — must be a real value, not ":slug"
    if (!slug || slug === ":slug") {
      setTenant(null);
      setTenantLoading(false);
      setTenantError("Slug da empresa não informado na URL.");
      return;
    }

    let cancelled = false;

    const fetchTenant = async () => {
      setTenantLoading(true);
      setTenantError(null);

      // Use SECURITY DEFINER RPC to resolve tenant by slug
      // Works for both anon and authenticated users without opening RLS
      const { data: rpcData, error: rpcError } = await supabase
        .rpc("resolve_tenant_by_slug", { _slug: slug });

      if (cancelled) return;

      const data = rpcData && rpcData.length > 0 ? rpcData[0] : null;

      if (rpcError || !data) {
        setTenantError("Empresa não encontrada ou inativa.");
        setTenant(null);
        setTenantLoading(false);
        return;
      }

      // Sync profile.tenant_id BEFORE setting tenant state
      // Ensures RLS get_tenant_id() returns the correct tenant before any queries
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

      if (cancelled) return;

      // Clear ALL cached queries when switching tenants
      if (prevTenantId.current && prevTenantId.current !== data.id) {
        queryClient.clear();
      }
      prevTenantId.current = data.id;

      setTenant(data as Empresa);
      setTenantLoading(false);
    };

    fetchTenant();

    return () => { cancelled = true; };
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
