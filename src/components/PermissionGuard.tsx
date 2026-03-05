import { usePermissions } from "@/hooks/usePermissions";
import { ShieldX } from "lucide-react";

interface PermissionGuardProps {
  module: string;
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

function AccessDenied() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center space-y-3 max-w-md">
        <ShieldX className="h-12 w-12 text-destructive mx-auto" />
        <h1 className="text-lg font-semibold">Acesso Negado</h1>
        <p className="text-sm text-muted-foreground">
          Você não possui permissão para acessar este módulo. 
          Entre em contato com o administrador para solicitar acesso.
        </p>
      </div>
    </div>
  );
}

/**
 * Wraps a page/component. If user lacks the permission, shows Access Denied.
 */
export function PermissionGuard({ module, action = "Visualizar", children, fallback }: PermissionGuardProps) {
  const { can, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!can(module, action)) {
    return fallback ? <>{fallback}</> : <AccessDenied />;
  }

  return <>{children}</>;
}
