import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserProfile } from "./useUserProfile";

interface PermissionEntry {
  module: string;
  action: string;
}

/**
 * Loads ALL permissions the current user has (for the current tenant).
 * admin_global bypasses — they have everything.
 */
export function usePermissions() {
  const { user } = useAuth();
  const { isAdminGlobal, loading: profileLoading } = useUserProfile();

  const { data: permissions = [], isLoading } = useQuery<PermissionEntry[]>({
    queryKey: ["my_permissions", user?.id],
    enabled: !!user && !profileLoading && !isAdminGlobal,
    queryFn: async () => {
      // Debug: log auth context
      console.log("[usePermissions] auth.uid:", user!.id);
      console.log("[usePermissions] isAdminGlobal:", isAdminGlobal);

      const { data, error } = await supabase
        .from("user_permissions")
        .select("permission_id, permissions!inner(module, action)")
        .eq("user_id", user!.id)
        .is("deleted_at", null);

      if (error) {
        console.error("[usePermissions] query error:", error);
        return [];
      }

      const mapped = (data || []).map((row: any) => ({
        module: row.permissions.module,
        action: row.permissions.action,
      }));

      console.log("[usePermissions] loaded permissions:", mapped.length, mapped);
      return mapped;
    },
    staleTime: 60_000,
  });

  const can = (module: string, action: string): boolean => {
    if (isAdminGlobal) return true;
    return permissions.some((p) => p.module === module && p.action === action);
  };

  const canView = (module: string): boolean => can(module, "Visualizar");
  const canCreate = (module: string): boolean => can(module, "Criar");
  const canEdit = (module: string): boolean => can(module, "Editar");
  const canDelete = (module: string): boolean => can(module, "Excluir");

  return {
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    permissions,
    isAdminGlobal,
    loading: isLoading || profileLoading,
  };
}
