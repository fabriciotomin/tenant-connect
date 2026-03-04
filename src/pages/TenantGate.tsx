import { Navigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Building2, AlertTriangle } from "lucide-react";

/**
 * TenantGate wraps authenticated routes inside /t/:slug.
 * - Validates tenant exists and is active.
 * - Validates user has an active link in user_tenants (or is admin_global).
 */
export default function TenantGate({ children }: { children: React.ReactNode }) {
  const { tenant, tenantLoading, tenantError, slug } = useTenant();
  const { user, loading: authLoading } = useAuth();
  const { isAdminGlobal, loading: profileLoading } = useUserProfile();

  const { data: hasLink, isLoading: linkLoading } = useQuery({
    queryKey: ["user_tenant_link", user?.id, tenant?.id],
    queryFn: async () => {
      if (!user || !tenant) return false;
      const { data } = await supabase.rpc("has_user_tenant_link", {
        _user_id: user.id,
        _tenant_id: tenant.id,
      });
      return !!data;
    },
    enabled: !!user && !!tenant && !isAdminGlobal,
  });

  if (authLoading || tenantLoading || profileLoading || linkLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/t/${slug || ""}/auth`} replace />;
  }

  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold">Empresa não encontrada</h1>
          <p className="text-sm text-muted-foreground">
            {tenantError || "O endereço acessado não corresponde a nenhuma empresa ativa."}
          </p>
        </div>
      </div>
    );
  }

  // Validate user belongs to this tenant (or is admin_global)
  if (!isAdminGlobal && !hasLink) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Building2 className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold">Acesso negado</h1>
          <p className="text-sm text-muted-foreground">
            Seu usuário não pertence a esta empresa.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
