import { Navigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Building2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function TenantGate({ children }: { children: React.ReactNode }) {
  const { tenant, tenantLoading, tenantError, slug } = useTenant();
  const { user, loading: authLoading } = useAuth();
  const { isAdminGlobal, isActive, isPending, profile, loading: profileLoading } = useUserProfile();

  if (authLoading || tenantLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/t/${slug || ""}/auth`} replace />;
  }

  // Block pending users (admin_global bypasses)
  if (!isAdminGlobal && isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3 max-w-md">
          <Clock className="h-10 w-10 text-amber-500 mx-auto" />
          <h1 className="text-lg font-semibold">Aguardando aprovação</h1>
          <p className="text-sm text-muted-foreground">
            Seu cadastro foi recebido e está aguardando aprovação do administrador.
            Você receberá acesso assim que sua conta for ativada.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = `/t/${slug}/auth`;
            }}
          >
            Sair
          </Button>
        </div>
      </div>
    );
  }

  // Block inactive users
  if (!isAdminGlobal && !isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h1 className="text-lg font-semibold">Conta inativa</h1>
          <p className="text-sm text-muted-foreground">
            Sua conta está inativa. Entre em contato com o administrador.
          </p>
        </div>
      </div>
    );
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

  // Validate user belongs to this tenant (via profile.tenant_id) or is admin_global
  if (!isAdminGlobal && profile?.tenant_id !== tenant.id) {
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
