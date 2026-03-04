import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { DataTable } from "@/components/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface ProfileRow {
  id: string;
  auth_id: string;
  nome: string;
  email: string;
  tenant_id: string | null;
  created_at: string;
  empresas?: { razao_social: string } | null;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
}

const roleLabel: Record<string, string> = {
  admin_global: "Admin Global",
  admin_empresa: "Admin Empresa",
  usuario: "Usuário",
};

export default function UsersPage() {
  const { isAdminGlobal, isAdminEmpresa, profile } = useUserProfile();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [editUser, setEditUser] = useState<ProfileRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<ProfileRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("usuario");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());

  // Use tenant from context (slug-based) — ensures admin_global operates within selected tenant
  const activeTenantId = tenant?.id || profile?.tenant_id;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["profiles_list", isAdminGlobal, activeTenantId],
    queryFn: async () => {
      if (!activeTenantId) return [];
      // List users linked to the active tenant via user_tenants
      const { data: links, error: linkErr } = await supabase
        .from("user_tenants")
        .select("user_id")
        .eq("tenant_id", activeTenantId)
        .eq("ativo", true);
      if (linkErr) throw linkErr;
      if (!links || links.length === 0) return [];

      const userIds = links.map((l) => l.user_id);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, auth_id, nome, email, tenant_id, created_at, empresas:tenant_id(razao_social)")
        .in("auth_id", userIds)
        .order("nome");
      if (error) throw error;
      return data as unknown as ProfileRow[];
    },
    enabled: !!profile && !!activeTenantId,
  });

  const { data: rolesMap = {} } = useQuery({
    queryKey: ["user_roles_map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const r of data || []) {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.role);
      }
      return map;
    },
  });

  const { data: allPermissions = [] } = useQuery({
    queryKey: ["all_permissions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("permissions").select("*").order("module").order("action");
      if (error) throw error;
      return data as Permission[];
    },
  });

  const { data: userPermsMap = {} } = useQuery({
    queryKey: ["user_permissions_map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_permissions").select("user_id, permission_id");
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const r of data || []) {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.permission_id);
      }
      return map;
    },
  });

  const canManageUsers = isAdminGlobal || isAdminEmpresa();

  const openEdit = (u: ProfileRow) => {
    const userRoles = rolesMap[u.auth_id] || [];
    const currentRole = userRoles.includes("admin_empresa") ? "admin_empresa" : "usuario";
    setSelectedRole(currentRole);
    setSelectedPerms(new Set(userPermsMap[u.auth_id] || []));
    setEditUser(u);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      const authId = editUser.auth_id;
      // Use the tenant from the URL context (slug), falling back to user's tenant
      const tenantId = editUser.tenant_id || activeTenantId;

      if (!tenantId) {
        throw new Error("Tenant não identificado. Selecione uma empresa.");
      }

      const targetRoles = rolesMap[authId] || [];
      if (targetRoles.includes("admin_global")) {
        throw new Error("Não é permitido editar permissões de Admin Global");
      }

      // 1) Update roles: delete non-admin_global roles, then insert selected
      const { error: delRoleErr } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", authId)
        .neq("role", "admin_global");
      if (delRoleErr) throw new Error("Erro ao remover papel anterior: " + delRoleErr.message);

      if (selectedRole) {
        const { error: insRoleErr } = await supabase.from("user_roles").insert({
          user_id: authId,
          role: selectedRole as any,
          tenant_id: tenantId,
        });
        if (insRoleErr) throw new Error("Erro ao definir papel: " + insRoleErr.message);
      }

      // 2) Update permissions: delete all for user+tenant, then insert selected
      const { error: delPermErr } = await supabase
        .from("user_permissions")
        .delete()
        .eq("user_id", authId)
        .eq("tenant_id", tenantId);
      if (delPermErr) throw new Error("Erro ao limpar permissões: " + delPermErr.message);

      if (selectedPerms.size > 0) {
        const rows = Array.from(selectedPerms).map((pid) => ({
          user_id: authId,
          permission_id: pid,
          tenant_id: tenantId,
        }));
        const { error: insPermErr } = await supabase.from("user_permissions").insert(rows);
        if (insPermErr) throw new Error("Erro ao salvar permissões: " + insPermErr.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_roles_map"] });
      queryClient.invalidateQueries({ queryKey: ["user_permissions_map"] });
      setEditUser(null);
      toast.success("Permissões atualizadas com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (u: ProfileRow) => {
      if (!user) throw new Error("Não autenticado");
      if (!u.auth_id) throw new Error("auth_id do usuário inválido");
      const tenantId = u.tenant_id || activeTenantId;
      if (!tenantId) throw new Error("tenant_id não encontrado");
      const { error } = await supabase.rpc("delete_user_safe", {
        p_auth_id: u.auth_id,
        p_tenant_id: tenantId,
        p_admin_user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_list"] });
      queryClient.invalidateQueries({ queryKey: ["user_roles_map"] });
      queryClient.invalidateQueries({ queryKey: ["user_permissions_map"] });
      setDeleteUser(null);
      toast.success("Usuário excluído com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePerm = (permId: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  // ===== Select/Deselect all helpers =====
  const permsByModule = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const allPermIds = allPermissions.map((p) => p.id);
  const allSelected = allPermIds.length > 0 && allPermIds.every((id) => selectedPerms.has(id));
  const someSelected = allPermIds.some((id) => selectedPerms.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedPerms(new Set());
    } else {
      setSelectedPerms(new Set(allPermIds));
    }
  };

  const toggleModule = (modulePerms: Permission[]) => {
    const moduleIds = modulePerms.map((p) => p.id);
    const allModuleSelected = moduleIds.every((id) => selectedPerms.has(id));
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (allModuleSelected) {
        moduleIds.forEach((id) => next.delete(id));
      } else {
        moduleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const getModuleCheckState = (modulePerms: Permission[]): "checked" | "unchecked" | "indeterminate" => {
    const moduleIds = modulePerms.map((p) => p.id);
    const count = moduleIds.filter((id) => selectedPerms.has(id)).length;
    if (count === 0) return "unchecked";
    if (count === moduleIds.length) return "checked";
    return "indeterminate";
  };

  const columns = [
    { key: "nome", label: "Nome" },
    { key: "email", label: "E-mail" },
    {
      key: "empresa",
      label: "Empresa",
      render: (r: ProfileRow) => r.empresas?.razao_social || "—",
    },
    {
      key: "roles",
      label: "Papéis",
      render: (r: ProfileRow) => {
        const roles = rolesMap[r.auth_id] || [];
        return (
          <div className="flex gap-1 flex-wrap">
            {roles.length > 0 ? roles.map((role: string) => (
              <Badge key={role} variant="secondary" className="text-2xs">
                {roleLabel[role] || role}
              </Badge>
            )) : (
              <span className="text-muted-foreground text-2xs">—</span>
            )}
          </div>
        );
      },
    },
    ...(canManageUsers
      ? [{
          key: "acoes",
          label: "Ações",
          render: (r: ProfileRow) => {
            const isTargetAdminGlobal = (rolesMap[r.auth_id] || []).includes("admin_global");
            if (isTargetAdminGlobal) return <span className="text-muted-foreground text-2xs">—</span>;
            return (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 text-2xs px-2" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                  Editar
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-2xs px-2 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteUser(r); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          },
        }]
      : []),
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Usuários</h1>
        <p className="text-xs text-muted-foreground">
          {isAdminGlobal ? "Todos os usuários do sistema" : "Usuários da sua empresa"}
        </p>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        searchPlaceholder="Buscar usuário..."
        filterFn={(r, s) =>
          r.nome.toLowerCase().includes(s) || r.email.toLowerCase().includes(s)
        }
      />

      {/* Edit permissions dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Editar Usuário — {editUser?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Papel</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="usuario" className="text-xs">Usuário</SelectItem>
                  <SelectItem value="admin_empresa" className="text-xs">Admin Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Permissões</Label>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-muted-foreground">Selecionar todas</span>
                </label>
              </div>

              {Object.entries(permsByModule).map(([mod, perms]) => {
                const modState = getModuleCheckState(perms);
                return (
                  <div key={mod} className="space-y-1">
                    <label className="flex items-center gap-2 cursor-pointer py-0.5">
                      <Checkbox
                        checked={modState === "checked" ? true : modState === "indeterminate" ? "indeterminate" : false}
                        onCheckedChange={() => toggleModule(perms)}
                      />
                      <span className="text-2xs font-semibold text-muted-foreground uppercase tracking-wide">{mod}</span>
                    </label>
                    <div className="pl-6">
                      {perms.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                          <Checkbox
                            checked={selectedPerms.has(p.id)}
                            onCheckedChange={() => togglePerm(p.id)}
                          />
                          <span>{p.action}</span>
                          {p.description && <span className="text-muted-foreground">— {p.description}</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
                {saveMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUser?.nome}</strong> ({deleteUser?.email})?
              Esta ação só será permitida se o usuário não possuir registros vinculados no sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              onClick={() => deleteUser && deleteMutation.mutate(deleteUser)}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
