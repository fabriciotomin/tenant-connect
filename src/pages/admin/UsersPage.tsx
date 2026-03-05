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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Trash2, CheckCircle2, XCircle, Shield, ChevronRight, Eye, Plus, Pencil, Trash, Package, DollarSign, ShoppingCart, TrendingUp, Wrench, BarChart3, Settings } from "lucide-react";

interface ProfileRow {
  id: string;
  auth_id: string;
  nome: string;
  email: string;
  tenant_id: string | null;
  status: string;
  created_at: string;
  empresas?: { razao_social: string } | null;
}

interface Permission {
  id: string;
  module: string;
  action: string;
  description: string | null;
}

interface Empresa {
  id: string;
  razao_social: string;
  slug: string;
}

const roleLabel: Record<string, string> = {
  admin_global: "Admin Global",
  admin_empresa: "Admin Empresa",
  usuario: "Usuário",
};

const statusLabel: Record<string, string> = {
  ATIVO: "Ativo",
  PENDENTE_APROVACAO: "Pendente",
  INATIVO: "Inativo",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ATIVO: "default",
  PENDENTE_APROVACAO: "outline",
  INATIVO: "destructive",
};

export default function UsersPage() {
  const { isAdminGlobal, isAdminEmpresa, profile } = useUserProfile();
  const { user } = useAuth();
  const { tenant } = useTenant();
  const queryClient = useQueryClient();
  const [editUser, setEditUser] = useState<ProfileRow | null>(null);
  const [deleteUser, setDeleteUser] = useState<ProfileRow | null>(null);
  const [approveUser, setApproveUser] = useState<ProfileRow | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("usuario");
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [approveTenantId, setApproveTenantId] = useState<string>("");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const activeTenantId = tenant?.id || profile?.tenant_id;
  const canManageUsers = isAdminGlobal || isAdminEmpresa();

  // Fetch active users (for current tenant or all for admin_global)
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["profiles_list", isAdminGlobal, activeTenantId],
    queryFn: async () => {
      if (!activeTenantId && !isAdminGlobal) return [];
      let query = supabase
        .from("profiles")
        .select("id, auth_id, nome, email, tenant_id, created_at, status, empresas:tenant_id(razao_social)")
        .is("deleted_at", null)
        .eq("status", "ATIVO" as any)
        .order("nome");
      
      if (!isAdminGlobal && activeTenantId) {
        query = query.eq("tenant_id", activeTenantId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ProfileRow[];
    },
    enabled: !!profile,
  });

  // Fetch pending users
  const { data: pendingUsers = [], isLoading: pendingLoading } = useQuery({
    queryKey: ["profiles_pending", isAdminGlobal, activeTenantId],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("id, auth_id, nome, email, tenant_id, created_at, status, empresas:tenant_id(razao_social)")
        .is("deleted_at", null)
        .eq("status", "PENDENTE_APROVACAO" as any)
        .order("created_at", { ascending: false });
      
      // admin_global sees all pending, admin_empresa sees only their tenant's
      if (!isAdminGlobal && activeTenantId) {
        query = query.eq("tenant_id", activeTenantId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as ProfileRow[];
    },
    enabled: !!profile && canManageUsers,
  });

  // Fetch all empresas for approval dropdown (admin_global only)
  const { data: empresas = [] } = useQuery({
    queryKey: ["empresas_list_approval"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("empresas")
        .select("id, razao_social, slug")
        .is("deleted_at", null)
        .eq("status", "ativo")
        .order("razao_social");
      if (error) throw error;
      return data as Empresa[];
    },
    enabled: isAdminGlobal,
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
      const { data, error } = await supabase.from("user_permissions").select("user_id, permission_id").is("deleted_at", null);
      if (error) throw error;
      const map: Record<string, string[]> = {};
      for (const r of data || []) {
        if (!map[r.user_id!]) map[r.user_id!] = [];
        map[r.user_id!].push(r.permission_id!);
      }
      return map;
    },
  });

  // --- Approval ---
  const openApprove = (u: ProfileRow) => {
    setApproveUser(u);
    setApproveTenantId(u.tenant_id || "");
    setDuplicateWarning(null);
  };

  const checkDuplicate = async (tenantId: string, email: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("email", email)
      .eq("status", "ATIVO" as any)
      .is("deleted_at", null);
    
    if (data && data.length > 0) {
      setDuplicateWarning(`Já existe um usuário ativo com este e-mail nesta empresa.`);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handleTenantSelect = (tenantId: string) => {
    setApproveTenantId(tenantId);
    if (approveUser) {
      checkDuplicate(tenantId, approveUser.email);
    }
  };

  const approveMutation = useMutation({
    mutationFn: async () => {
      if (!approveUser) return;
      const tenantId = isAdminGlobal ? approveTenantId : activeTenantId;
      if (!tenantId) throw new Error("Selecione uma empresa para vincular o usuário.");
      if (duplicateWarning) throw new Error(duplicateWarning);

      const { error } = await supabase
        .from("profiles")
        .update({ status: "ATIVO", tenant_id: tenantId } as any)
        .eq("id", approveUser.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_list"] });
      queryClient.invalidateQueries({ queryKey: ["profiles_pending"] });
      setApproveUser(null);
      toast.success("Usuário aprovado com sucesso!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async (u: ProfileRow) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "INATIVO", deleted_at: new Date().toISOString() } as any)
        .eq("id", u.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_pending"] });
      toast.success("Cadastro rejeitado.");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // --- Edit Permissions ---
  const openEdit = (u: ProfileRow) => {
    const userRoles = rolesMap[u.auth_id] || [];
    const currentRole = userRoles.includes("admin_empresa") ? "admin_empresa" : "usuario";
    setSelectedRole(currentRole);
    setSelectedPerms(new Set(userPermsMap[u.auth_id] || []));
    setExpandedModules(new Set(Object.keys(permsByModule)));
    setEditUser(u);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editUser) return;
      const authId = editUser.auth_id;
      const tenantId = editUser.tenant_id || activeTenantId;
      if (!tenantId) throw new Error("Tenant não identificado.");

      const targetRoles = rolesMap[authId] || [];
      if (targetRoles.includes("admin_global")) {
        throw new Error("Não é permitido editar permissões de Admin Global");
      }

      // Update roles
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
        });
        if (insRoleErr) throw new Error("Erro ao definir papel: " + insRoleErr.message);
      }

      // Update permissions
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
      const { error } = await supabase
        .from("profiles")
        .update({ deleted_at: new Date().toISOString(), status: "INATIVO" } as any)
        .eq("id", u.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profiles_list"] });
      setDeleteUser(null);
      toast.success("Usuário excluído com sucesso");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // --- Permission helpers ---
  const togglePerm = (permId: string) => {
    setSelectedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const permsByModule = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  const allPermIds = allPermissions.map((p) => p.id);
  const allSelected = allPermIds.length > 0 && allPermIds.every((id) => selectedPerms.has(id));
  const someSelected = allPermIds.some((id) => selectedPerms.has(id));

  const toggleAll = () => {
    setSelectedPerms(allSelected ? new Set() : new Set(allPermIds));
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

  // --- Columns ---
  const activeColumns = [
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
                  <Shield className="h-3 w-3 mr-1" /> Permissões
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

  const pendingColumns = [
    { key: "nome", label: "Nome" },
    { key: "email", label: "E-mail" },
    {
      key: "empresa_solicitada",
      label: "Empresa solicitada",
      render: (r: ProfileRow) => r.empresas?.razao_social || "Não definida",
    },
    {
      key: "data",
      label: "Data",
      render: (r: ProfileRow) => new Date(r.created_at).toLocaleDateString("pt-BR"),
    },
    {
      key: "acoes",
      label: "Ações",
      render: (r: ProfileRow) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-2xs px-2 text-green-600 hover:text-green-700" onClick={(e) => { e.stopPropagation(); openApprove(r); }}>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovar
          </Button>
          <Button variant="ghost" size="sm" className="h-6 text-2xs px-2 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(r); }}>
            <XCircle className="h-3 w-3 mr-1" /> Rejeitar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Usuários</h1>
        <p className="text-xs text-muted-foreground">
          {isAdminGlobal ? "Gestão global de usuários" : "Usuários da sua empresa"}
        </p>
      </div>

      {canManageUsers ? (
        <Tabs defaultValue="ativos">
          <TabsList>
            <TabsTrigger value="ativos" className="text-xs">
              Ativos ({users.length})
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="text-xs">
              Pendentes ({pendingUsers.length})
              {pendingUsers.length > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-2xs h-4 px-1">{pendingUsers.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ativos">
            <DataTable
              columns={activeColumns}
              data={users}
              loading={isLoading}
              searchPlaceholder="Buscar usuário..."
              filterFn={(r, s) => r.nome.toLowerCase().includes(s) || r.email.toLowerCase().includes(s)}
            />
          </TabsContent>
          <TabsContent value="pendentes">
            <DataTable
              columns={pendingColumns}
              data={pendingUsers}
              loading={pendingLoading}
              searchPlaceholder="Buscar pendente..."
              filterFn={(r, s) => r.nome.toLowerCase().includes(s) || r.email.toLowerCase().includes(s)}
            />
          </TabsContent>
        </Tabs>
      ) : (
        <DataTable
          columns={activeColumns}
          data={users}
          loading={isLoading}
          searchPlaceholder="Buscar usuário..."
          filterFn={(r, s) => r.nome.toLowerCase().includes(s) || r.email.toLowerCase().includes(s)}
        />
      )}

      {/* Approve Dialog */}
      <Dialog open={!!approveUser} onOpenChange={(open) => !open && setApproveUser(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Aprovar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-xs space-y-1">
              <p><strong>Nome:</strong> {approveUser?.nome}</p>
              <p><strong>E-mail:</strong> {approveUser?.email}</p>
            </div>

            {isAdminGlobal ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Vincular à empresa *</Label>
                <Select value={approveTenantId} onValueChange={handleTenantSelect}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id} className="text-xs">{e.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {duplicateWarning && (
                  <p className="text-xs text-destructive">{duplicateWarning}</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                O usuário será vinculado à empresa: <strong>{tenant?.razao_social}</strong>
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setApproveUser(null)}>Cancelar</Button>
              <Button
                size="sm"
                disabled={approveMutation.isPending || (isAdminGlobal && !approveTenantId) || !!duplicateWarning}
                onClick={() => approveMutation.mutate()}
              >
                {approveMutation.isPending ? "Aprovando..." : "Aprovar e ativar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Sheet open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              Permissões — {editUser?.nome}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">{editUser?.email}</p>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 py-4">
            <div className="space-y-5">
              {/* Role selector */}
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

              <Separator />

              {/* Global select all */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Permissões de Acesso</Label>
                <label className="flex items-center gap-2 text-xs cursor-pointer select-none rounded-md border border-input px-3 py-1.5 hover:bg-accent transition-colors">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                  />
                  <span className="font-medium">Marcar tudo</span>
                </label>
              </div>

              {/* Modules tree */}
              {Object.keys(permsByModule).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhuma permissão cadastrada no sistema.
                </p>
              ) : (
                <div className="border rounded-md divide-y">
                  {Object.entries(permsByModule).map(([mod, perms]) => {
                    const modState = getModuleCheckState(perms);
                    const isExpanded = expandedModules.has(mod);
                    const selectedCount = perms.filter(p => selectedPerms.has(p.id)).length;
                    
                    return (
                      <Collapsible
                        key={mod}
                        open={isExpanded}
                        onOpenChange={(open) => {
                          setExpandedModules(prev => {
                            const next = new Set(prev);
                            open ? next.add(mod) : next.delete(mod);
                            return next;
                          });
                        }}
                      >
                        <div className="flex items-center gap-2 px-3 py-2.5 hover:bg-accent/40 transition-colors">
                          <Checkbox
                            checked={modState === "checked" ? true : modState === "indeterminate" ? "indeterminate" : false}
                            onCheckedChange={() => toggleModule(perms)}
                            className="mr-1"
                          />
                          <CollapsibleTrigger className="flex items-center gap-2 flex-1 min-w-0" asChild>
                            <button type="button" className="flex items-center gap-2 flex-1 min-w-0 text-left">
                              <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                              {isExpanded
                                ? <FolderOpen className="h-4 w-4 shrink-0 text-primary" />
                                : <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                              }
                              <span className="text-xs font-semibold uppercase tracking-wide truncate">{mod}</span>
                              <span className="ml-auto text-2xs text-muted-foreground tabular-nums shrink-0">
                                {selectedCount}/{perms.length}
                              </span>
                            </button>
                          </CollapsibleTrigger>
                        </div>
                        <CollapsibleContent>
                          <div className="pl-12 pr-3 pb-2 space-y-0.5">
                            {perms.map((p) => (
                              <label key={p.id} className="flex items-center gap-2.5 text-xs cursor-pointer py-1.5 px-2 rounded hover:bg-accent/30 transition-colors">
                                <Checkbox
                                  checked={selectedPerms.has(p.id)}
                                  onCheckedChange={() => togglePerm(p.id)}
                                />
                                <span className="font-medium">{p.action}</span>
                                {p.description && <span className="text-muted-foreground">— {p.description}</span>}
                              </label>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t px-6 py-4 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button size="sm" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              {saveMutation.isPending ? "Salvando..." : "Salvar permissões"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUser?.nome}</strong> ({deleteUser?.email})?
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
